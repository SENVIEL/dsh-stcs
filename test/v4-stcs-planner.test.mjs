import test from 'node:test'
import assert from 'node:assert/strict'
import { CoordinatorRunner } from '../lib/artex/coordinator-runner.js'
import { StcsRuntime, memoryRuntimeTable } from '../lib/artex/runtime.js'
import { normalizeBoard } from '../lib/artex/coordinator.js'

function makeRunner(plannerRunner = null, config = {}) {
  return new CoordinatorRunner({
    store: {},
    getSession: async () => ({}),
    agents: { list: () => [] },
    subagents: { startActivation: async () => ({}) },
    agentTeams: { spawnTeammate: async () => ({}), listMembers: () => [] },
    plannerRunner,
    config,
    now: () => 1_000_000
  })
}

function makeState() {
  return {
    goal: { id: 'goal-1', target: 'http://h:4444', phase: 'active', workdir: 'C:/tmp/work' },
    directions: [],
    facts: [],
    findings: [],
    assets: [],
    coverage: [],
    tasks: []
  }
}

test('planner is available through subagents when agentTeams.spawnTeammate is gone', () => {
  const runner = new CoordinatorRunner({
    store: {},
    getSession: async () => ({}),
    agents: { list: () => [] },
    subagents: { startActivation: async () => ({}) },
    agentTeams: {},
    config: {},
    now: () => 1_000_000
  })
  assert.equal(runner.plannerDue(makeState(), normalizeBoard({}), 1_000_000), true)
})

test('planner wakes on the first round, an empty board, graph change and heartbeat', () => {
  const runner = makeRunner()
  const state = makeState()
  const now = 1_000_000
  assert.equal(runner.plannerDue(state, normalizeBoard({}), now), true, 'first round')

  const seen = normalizeBoard({ lastPlannerAt: now - 1000, lastPlannerSignature: '0/0/0/0' })
  state.tasks = [{ id: 'task-1', state: 'running' }]
  state.directions = [{ id: 'direction-1', state: 'open' }]
  assert.equal(runner.plannerDue(state, seen, now), false, 'min interval')

  assert.equal(runner.plannerDue(state, normalizeBoard({ ...seen, lastPlannerAt: now - 600000 }), now), true, 'heartbeat')

  const changed = normalizeBoard({ lastPlannerAt: now - 120000, lastPlannerSignature: '0/0/0/0' })
  state.facts = [{ id: 'fact-1', answer: 'new token' }]
  assert.equal(runner.plannerDue(state, changed, now), true, 'new fact wakes the planner')
})

test('planner starts on a background task and the result is applied by the next tick', async () => {
  const state = makeState()
  const session = {
    read: async () => state,
    async addDirection(command) {
      const direction = {
        id: `direction-${state.directions.length + 1}`,
        question: command.question,
        doneWhen: command.doneWhen,
        stage: command.stage,
        priority: command.priority,
        origin: command.origin,
        state: 'open'
      }
      state.directions.push(direction)
      return state
    }
  }
  const runner = makeRunner(() => ({
    async run(role) {
      assert.equal(role, 'planner')
      return {
        structured: {
          directions: [
            { question: 'GET /api/system 是否可未授权读取版本？', doneWhen: '未认证请求返回 200 且含版本号', axis: ['identity'], priority: 9, reason: 'version leak' },
            { question: 'GET /api/system 是否可未授权读取版本？', doneWhen: '重复方向应被去重', axis: ['identity'], priority: 8, reason: 'duplicate' }
          ],
          notes: ''
        }
      }
    }
  }))

  const started = runner.startPlannerTask({ id: 'root', session }, session, state, normalizeBoard({}), 1_000_000)
  assert.equal(started, true)
  await runner.plannerTasks.get('root')
  const pending = runner.consumePlannerResult('root')
  assert.ok(pending)
  const applied = await runner.applyPlannerDirections(session, state, normalizeBoard({}), pending.result, 1_000_000)
  assert.equal(applied.state.directions.length, 1, 'duplicate planner direction is collapsed')
  assert.equal(applied.hypotheses.length, 1)
  assert.equal(applied.hypotheses[0].directionId, 'direction-1')
  assert.equal(applied.hypotheses[0].source, 'planner')
  assert.ok(applied.hypotheses[0].priorityBase >= 80, 'planner hypothesis priority is carried into the board')
  assert.equal(applied.state.directions[0].origin, 'planner')
  assert.ok(applied.state.directions[0].priority >= 80, 'planner directions outrank auto-derived auth flows')
})

test('a failing planner is recorded with backoff and never blocks the tick', async () => {
  const runner = makeRunner(() => ({
    async run() { throw new Error('planner teammate timed out') }
  }))
  const state = makeState()
  const session = { read: async () => state, addDirection: async () => state }
  const started = runner.startPlannerTask({ id: 'root', session }, session, state, normalizeBoard({}), 1_000_000)
  assert.equal(started, true, 'start is synchronous and non-blocking')
  await runner.plannerTasks.get('root')
  const runtime = runner.plannerRuntimeOf('root')
  assert.match(runtime.lastError, /timed out/)
  assert.ok(runtime.nextAt > 1_000_000)
  assert.equal(runner.consumePlannerResult('root'), null)
})

test('audit drain is single-flight per session', async () => {
  const runner = makeRunner()
  let calls = 0
  let finish
  runner.auditPendingFor = () => {
    calls += 1
    return { queued: 1, run: new Promise((resolve) => { finish = resolve }) }
  }
  const state = makeState()
  const session = { sessionId: 's1', read: async () => state }
  await Promise.all([
    runner.drainAudit(session, state, { id: 's1' }),
    runner.drainAudit(session, state, { id: 's1' })
  ])
  assert.equal(calls, 1, 'only one audit run starts while the first is inflight')
  finish({ audited: [] })
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(runner.auditInflight.has('s1'), false)
})

test('planner notes that claim a proof become a priority-120 verification direction', async () => {
  const state = makeState()
  state.goal.createdAt = 1000
  const session = {
    read: async () => state,
    async addDirection(command) {
      const direction = {
        id: `direction-${state.directions.length + 1}`,
        question: command.question,
        doneWhen: command.doneWhen,
        stage: command.stage,
        priority: command.priority,
        origin: command.origin,
        state: 'open'
      }
      state.directions.push(direction)
      return state
    }
  }
  const runner = makeRunner(() => ({
    async run() {
      return { structured: { directions: [], notes: 'RCE proven: uid=0(root) via POST /API/crons; please record finding.' } }
    }
  }))
  runner.startPlannerTask({ id: 'root', session }, session, state, normalizeBoard({}), 1_000_000)
  await runner.plannerTasks.get('root')
  const pending = runner.consumePlannerResult('root')
  const applied = await runner.applyPlannerDirections(session, state, normalizeBoard({}), pending.result, 1_000_000)
  assert.equal(applied.state.directions.length, 1)
  assert.equal(applied.state.directions[0].priority, 120)
  assert.equal(applied.state.directions[0].origin, 'planner')
  assert.equal(applied.hypotheses[0].source, 'planner-note')
})

test('planner does not run after a proof; empty rounds do not stop planning', () => {
  const runner = makeRunner()
  const state = makeState()
  state.goal.proofs = [{ evidenceId: 'evidence-1' }]
  assert.equal(runner.plannerDue(state, normalizeBoard({}), 1_000_000), false, 'proof stops planner')
  state.goal.proofs = []
  state.tasks = [{ id: 'task-1', state: 'running' }]
  state.directions = [{ id: 'direction-1', state: 'open' }]
  assert.equal(runner.plannerDue(state, normalizeBoard({ plannerEmptyRounds: 2 }), 1_000_000), true, 'empty rounds do not stop planner')
})

test('planner can accept deterministic candidates without inventing a new direction', async () => {
  const state = makeState()
  const session = {
    read: async () => state,
    async addDirection(command) {
      const direction = {
        id: `direction-${state.directions.length + 1}`,
        question: command.question,
        doneWhen: command.doneWhen,
        stage: command.stage,
        priority: command.priority,
        origin: command.origin,
        state: 'open'
      }
      state.directions.push(direction)
      return state
    }
  }
  const board = normalizeBoard({
    hypothesisTree: [{
      id: 'candidate-1', claim: '未授权访问 /api/system 是否泄露版本？', axis: ['surface'],
      status: 'candidate', priority: 20, priorityBase: 8, source: 'app:test'
    }]
  })
  const runner = makeRunner()
  const applied = await runner.applyPlannerDirections(session, state, board, {
    structured: { directions: [], acceptedCandidates: ['candidate-1'], notes: '' }
  }, 1_000_000)
  assert.equal(applied.state.directions.length, 1)
  assert.equal(applied.state.directions[0].origin, 'planner')
  assert.equal(applied.hypotheses[0].source, 'planner-accepted')
  assert.equal(applied.hypotheses[0].status, 'runnable')
})

test('planner goalMet lets the planner, not the Coordinator, prove the goal', async () => {
  const state = makeState()
  state.goal.phase = 'active'
  const calls = []
  const session = {
    read: async () => state,
    async proveGoal(command) {
      calls.push(command)
      state.goal.phase = 'done'
      state.goal.proofs = [{ evidenceId: command.evidenceId }]
      return state
    }
  }
  const runner = makeRunner(null, { strictPlanner: true })
  const applied = await runner.applyPlannerDirections(session, state, normalizeBoard({}), {
    structured: {
      directions: [], notes: '',
      goalMet: { goalId: 'goal-1', evidenceId: 'finding-13', reason: 'validated RCE' }
    }
  }, 1_000_000)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].evidenceId, 'finding-13')
  assert.equal(applied.state.goal.phase, 'done')
})

test('planner persists its todo plan in the result', async () => {
  const state = makeState()
  const session = { read: async () => state, addDirection: async () => state }
  const runner = makeRunner(null, { strictPlanner: true })
  const applied = await runner.applyPlannerDirections(session, state, normalizeBoard({}), {
    structured: { directions: [], notes: '', todos: [{ content: 'test the auth chain', status: 'pending' }] }
  }, 1_000_000)
  assert.deepEqual(applied.todos, [{ content: 'test the auth chain', status: 'pending' }])
})

test('planner notes that explicitly deny a proof do not create a proof direction', async () => {
  const state = makeState()
  state.goal.createdAt = 1000
  const session = {
    read: async () => state,
    async addDirection(command) {
      state.directions.push({ id: `direction-${state.directions.length + 1}`, question: command.question, state: 'open' })
      return state
    }
  }
  const runner = makeRunner(() => ({
    async run() {
      return { structured: { directions: [], notes: '当前无新的 RCE proof claim；direction-162 尚未取得 token。' } }
    }
  }))
  runner.startPlannerTask({ id: 'root', session }, session, state, normalizeBoard({}), 1_000_000)
  await runner.plannerTasks.get('root')
  const pending = runner.consumePlannerResult('root')
  const applied = await runner.applyPlannerDirections(session, state, normalizeBoard({}), pending.result, 1_000_000)
  assert.equal(applied.state.directions.length, 0)
})

test('a confirmed high finding does not silence the planner before a goal proof', () => {
  const runner = makeRunner()
  const state = makeState()
  state.findings = [{ id: 'finding-1', severity: 'high', approvalStatus: 'confirmed', deleted: false }]
  state.tasks = [{ id: 'task-1', state: 'running' }]
  state.directions = [{ id: 'direction-1', state: 'open' }]
  assert.equal(runner.plannerDue(state, normalizeBoard({ lastPlannerAt: 400000 }), 1_000_000), true)
})

test('plannerProbe is origin-restricted and has a two-probe budget', async () => {
  const runtime = new StcsRuntime({ table: memoryRuntimeTable(), now: () => 1_000_000 })
  const state = { goal: { target: 'http://example.com:80/app' } }
  const session = { read: async () => state }
  const runner = new CoordinatorRunner({
    store: {},
    runtime,
    getSession: async () => session,
    agents: { list: () => [] },
    subagents: { startActivation: async () => ({}) },
    agentTeams: { spawnTeammate: async () => ({}), listMembers: () => [] },
    now: () => 1_000_000
  })
  const oldFetch = global.fetch
  global.fetch = async () => ({
    status: 200,
    headers: { entries: () => [['content-type', 'text/plain']] },
    text: async () => 'ok'
  })
  try {
    const first = await runner.plannerProbe('s1', 'http://example.com:80/health', 'GET')
    assert.equal(first.status, 200)
    await runner.plannerProbe('s1', 'http://example.com:80/health2', 'HEAD')
    await assert.rejects(() => runner.plannerProbe('s1', 'http://example.com:80/third'), /budget exhausted/)
    await assert.rejects(() => runner.plannerProbe('s1', 'http://evil.example/health'), /restricted/)
  } finally {
    global.fetch = oldFetch
  }
})
