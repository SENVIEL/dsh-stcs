import assert from 'node:assert/strict'
import test from 'node:test'

import { StcsRuntime, memoryRuntimeTable } from '../lib/artex/runtime.js'
import { CoordinatorRunner } from '../lib/artex/coordinator-runner.js'
import { CoordinatorStore, memoryCoordinatorTable } from '../lib/artex/store.js'
import { createV4State } from '../lib/v4/state.js'
import { reduceV4 } from '../lib/v4/reduce.js'

class FakeSession {
  constructor(state) {
    this.state = state
    this.seq = 0
  }
  async read() { return structuredClone(this.state) }
  async addDirection(args) {
    const id = `direction-${++this.seq}`
    this.state.directions.push({ ...args, id, state: 'open', conclusion: null })
    this.state.revision += 1
    return structuredClone(this.state)
  }
  async run(cmd) {
    if (cmd.type === 'settings' && cmd.op === 'set') {
      this.state.settings = { ...(this.state.settings || {}) };
      if (cmd.autoDispatch !== undefined) this.state.settings.autoDispatch = cmd.autoDispatch;
      if (cmd.autoAudit !== undefined) this.state.settings.autoAudit = cmd.autoAudit;
      return structuredClone(this.state);
    }
    if (cmd.type === 'task' && cmd.op === 'assign') {
      this.state.tasks.push({ id: `task-${++this.seq}`, directionId: cmd.directionId, state: 'queued' })
      return structuredClone(this.state)
    }
    if (cmd.type === 'task' && cmd.op === 'start') {
      const task = this.state.tasks.find((item) => item.id === cmd.id)
      if (task) task.state = 'running'
      return structuredClone(this.state)
    }
    if (cmd.type === 'task' && cmd.op === 'cancel') {
      const task = this.state.tasks.find((item) => item.id === cmd.id)
      if (task) task.state = 'cancelled'
      return structuredClone(this.state)
    }
    return structuredClone(this.state)
  }
}

class FakeDispatcher {
  constructor(options, session) {
    this.options = options
    this.session = session
    this.assigned = []
  }
  async assign(directionId, options = {}) {
    this.assigned.push({ directionId, options })
    const taskId = `task-fake-${this.assigned.length}`
    this.session.state.tasks.push({ id: taskId, directionId, state: 'running' })
    const direction = this.session.state.directions.find((item) => item.id === directionId)
    if (direction) direction.state = 'running'
    return { taskId, childId: `child-${this.assigned.length}`, directionId }
  }
}

function makeState({ authorization = 'authorized', endpoints = 10 } = {}) {
  const assets = []
  for (let i = 0; i < endpoints; i += 1) {
    assets.push({ id: `asset-${i}`, type: 'endpoint', value: `GET /api/item/${i}` })
  }
  return {
    version: 4,
    revision: 1,
    sessionId: 's1',
    goal: {
      target: 'https://example.com',
      targets: ['https://example.com'],
      objective: 'authorized test',
      authorization,
      workdir: 'C:/work/stcs',
      phase: 'active'
    },
    settings: { workerLimit: 6, autoDispatch: false, autoAudit: true },
    directions: [],
    facts: [],
    findings: [],
    assets,
    evidence: [],
    validations: [],
    coverage: [],
    tasks: [],
    planner: { candidates: [] },
    goals: [{ id: 'goal-1', state: 'open' }]
  }
}

function makeHarness({ state = makeState(), board = null, nativeGoal = { phase: 'active' }, config = {}, runtime = null } = {}) {
  const session = new FakeSession(state)
  const table = memoryCoordinatorTable()
  const store = new CoordinatorStore({ table, now: () => 1000 })
  const goalsCalls = []
  const goals = {
    get: (agent) => { goalsCalls.push(['get', agent?.id]); return nativeGoal; },
    create: () => { goalsCalls.push(['create']); throw new Error('must not create'); },
    resume: () => { goalsCalls.push(['resume']); throw new Error('must not resume'); },
    edit: () => { goalsCalls.push(['edit']); throw new Error('must not edit'); },
    complete: () => { goalsCalls.push(['complete']); throw new Error('must not complete'); }
  }
  const agent = { id: 's1', session: { header: { agentPreset: 'artex' } } }
  const agents = { list: () => [agent] }
  const factoryCalls = []
  let auditOptions = null
  const runner = new CoordinatorRunner({
    store,
    runtime,
    getSession: async () => session,
    agents,
    goals,
    subagents: { startActivation: async () => ({ childId: 'x', result: Promise.resolve({}), dispose: async () => {} }) },
    agentTeams: { spawnTeammate: async () => ({}), listMembers: () => [] },
    auditPendingFor: (options) => { auditOptions = options; return { queued: 0 } },
    indexEvidence: () => async () => ({ recorded: 0 }),
    dispatcherFactory: (options) => {
      factoryCalls.push(options)
      return new FakeDispatcher(options, session)
    },
    config,
    now: () => 1000
  })
  return { runner, session, store, table, agent, goalsCalls, factoryCalls, getAudit: () => auditOptions, board: () => store.read('s1'), boardSeed: board }
}

test('STCS settings field can disable legacy autoAudit without touching old commands', () => {
  const state = createV4State({ sessionId: 's1', target: 'https://example.com' })
  const next = reduceV4(state, { type: 'settings', op: 'set', autoAudit: false, autoDispatch: false })
  assert.equal(next.settings.autoAudit, false)
  assert.equal(next.settings.autoDispatch, false)
  assert.equal(next.goal.phase, 'active')
  assert.throws(() => reduceV4(state, { type: 'settings', op: 'set', autoAudit: 'no' }), /autoAudit must be a boolean/)
})

test('STCS runner fills all 6 worker slots from board-generated hypotheses and releases on commit', async () => {
  const h = makeHarness()
  const first = await h.runner.runForAgent(h.agent)
  assert.equal(first.dispatched, 6)
  assert.equal(h.session.state.tasks.length, 6)
  assert.equal(h.session.state.directions.length, 6)
  assert.equal(h.session.state.settings.autoAudit, false)
  assert.equal(h.session.state.settings.autoDispatch, false)
  assert.equal(h.getAudit().force, true)
  assert.equal(h.factoryCalls[0].retireOnSettle, true)
  assert.equal(h.factoryCalls[0].maxWorkers, 6)
  assert.ok(h.goalsCalls.every(([op]) => op === 'get'))

  const board = await h.board()
  assert.ok(board.decisions.some((item) => item.action === 'dispatch'))
  assert.ok(board.decisions.some((item) => item.action === 'complete_hypothesis') === false)
  assert.ok(board.targetMap.endpoints.length >= 10)

  const second = await h.runner.runForAgent(h.agent)
  assert.equal(second.dispatched, 0)
  assert.equal(h.session.state.tasks.length, 6)
})

test('STCS runner never recreates a native goal the user deleted', async () => {
  const h = makeHarness({ nativeGoal: null })
  await h.store.update('s1', (board) => ({ ...board, nativeGoalSeen: true }))
  const out = await h.runner.runForAgent(h.agent)
  assert.equal(out.skipped, 'native-goal-deleted')
  assert.equal(h.session.state.tasks.length, 0)
  assert.equal(h.goalsCalls.filter(([op]) => op !== 'get').length, 0)
})

test('STCS runner blocks dispatch until authorization is recorded', async () => {
  const h = makeHarness({ state: makeState({ authorization: '' }) })
  const out = await h.runner.runForAgent(h.agent)
  assert.equal(out.skipped, 'no-authorization')
  assert.equal(h.session.state.tasks.length, 0)
  const board = await h.board()
  assert.ok(board.decisions.some((item) => item.action === 'waiting_authorization'))
})

test('STCS runner describe exposes graded verdicts, worker slots and a decision digest', async () => {
  const h = makeHarness()
  await h.runner.runForAgent(h.agent)
  const status = await h.runner.describe('s1')
  assert.equal(status.exists, true)
  assert.equal(status.workers.limit, 6)
  assert.equal(status.workers.active, 6)
  assert.equal(status.workers.free, 0)
  assert.ok(status.decisionDigest.length === 64)
  assert.equal(status.policy.mainSessionReadOnly, true)
  assert.equal(status.policy.targetOwner, 'user')
  assert.ok(status.board.tree.total >= 6)
})

test('a paused session stops rewriting the board after the first debrief', async () => {
  const state = makeState()
  state.goal.phase = 'paused'
  const h = makeHarness({ state })
  const first = await h.runner.runForAgent(h.agent)
  assert.equal(first.skipped, 'v4-goal-paused')
  const firstRevision = (await h.board()).revision
  const second = await h.runner.runForAgent(h.agent)
  assert.equal(second.skipped, 'v4-goal-paused-unchanged')
  assert.equal((await h.board()).revision, firstRevision)
})

test('strict ARTEX never creates deterministic fallback directions', async () => {
  const h = makeHarness({ config: { strictPlanner: true, plannerEnabled: false } })
  const out = await h.runner.runForAgent(h.agent)
  assert.equal(out.dispatched, 0)
  const board = await h.board()
  assert.equal(board.decisions.some((item) => item.action === 'fallback_created'), false)
  assert.equal(h.session.state.directions.length, 0)
})

test('strict planner mode does not dispatch deterministic directions before the planner answers', async () => {
  const h = makeHarness({ config: { strictPlanner: true } })
  assert.equal(h.runner.config.strictPlanner, true)
  const out = await h.runner.runForAgent(h.agent)
  assert.equal(out.dispatched, 0)
  assert.equal(h.session.state.tasks.length, 0)
})



test('goal completion cancels active worker tasks', async () => {
  const h = makeHarness()
  h.session.state.tasks = [{ id: 'task-1', state: 'running', childId: 'child-1', directionId: 'direction-1' }]
  const next = await h.runner.stopActiveTasks(h.session, h.session.state, h.agent)
  assert.equal(next.tasks[0].state, 'cancelled')
})

test('runtime claims each dispatched worker slot', async () => {
  const runtime = new StcsRuntime({ table: memoryRuntimeTable(), now: () => 1000 })
  const h = makeHarness({ runtime })
  const out = await h.runner.runForAgent(h.agent)
  assert.equal(out.dispatched, 6)
  const view = await runtime.read('s1')
  assert.equal(Object.values(view.workers).filter((worker) => worker.state === 'running').length, 6)
  assert.equal(Object.values(view.intents).filter((intent) => intent.state === 'running').length, 6)
})
