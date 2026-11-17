import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}

test('v4 tools create a goal and a direction and report status', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-v4-tools-'))
  try {
    fs.cpSync(path.resolve(import.meta.dirname, '..', 'lib'), path.join(root, 'lib'), { recursive: true })
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-tools', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-tools', 'index.js'), 'export function defineTool(value){ return value }')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-storage-domain', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-storage-domain', 'index.js'), 'export function defineDomain(value){ return value }\nexport function domainTable(value){ return value }')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-session', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-session', 'index.js'), 'export function appendPluginRecord(){}')
    write(path.join(root, 'node_modules', 'zod', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', 'zod', 'index.js'), 'export const z = { any(){ return {} } }')

    const tables = new Map()
    const tableFor = (key) => {
      if (!tables.has(key)) {
        const rows = new Map()
        tables.set(key, { async get(id) { return rows.get(id) }, async put(id, v) { rows.set(id, structuredClone(v)) } })
      }
      return tables.get(key)
    }
    const tools = []
    const cleanups = []
    let activationCount = 0
    const fakeSubagents = {
      list: () => ['spawn'],
      getProvider: () => ({ capabilities: { outputSchema: true } }),
      listChildren: async () => [],
      interrupt: () => {},
      startActivation: async () => {
        activationCount += 1
        return { childId: 'child-1', result: new Promise(() => {}), dispose: async () => {} }
      }
    }
    const ctx = {
      tools: { register(tool) { tools.push(tool) }, guard() { return () => {} } },
      storageDomain: { get() { return undefined }, async open(spec) { return { table(name) { return tableFor(`${spec.name}:${name}`) } } } },
      sessions: { get() { return undefined } },
      inject() {}, effect(fn) { const c = fn(); if (typeof c === 'function') cleanups.push(c); return c }, on() { return () => {} }, logger: { warn() {} },
      systemPrompt: { section() { return () => {} }, context() { return () => {} }, variable() { return () => {} } },
      get(name) { return name === 'subagents' ? fakeSubagents : undefined }
    }
    const module = await import(pathToFileURL(path.join(root, 'lib', 'plugin.js')).href)
    module.apply(ctx)
    const byName = new Map(tools.map((tool) => [tool.name, tool]))
    const exec = { agent: { id: 's1', session: { id: 's1', header: { cwd: root } } } }
    const call = async (name, args = {}) => {
      const tool = byName.get(name)
      assert.ok(tool, `${name} must be registered`)
      return tool.execute(args, exec)
    }

    const started = await call('pentest_flow_start', { target: 'https://v4.test', objective: 'acceptance', authorization: 'test authorization' })
    assert.equal(started.started, true)
    assert.equal(started.version, 4)
    assert.deepEqual(started.goal.targets, ['https://v4.test'])

    const paused = await call('pentest_pause_all', { reason: 'test pause' })
    assert.equal(paused.goal.phase, 'paused')
    const resumed = await call('pentest_resume_all')
    assert.equal(resumed.goal.phase, 'active')
    // Test harness has no subagent service, so flow_status stays a pure read.
    const afterResume = await call('pentest_flow_status')
    assert.equal(afterResume.counts.directions, 0)
    assert.equal(afterResume.tasks.length, 0)

    const again = await call('pentest_flow_start', { target: 'https://v4.test', objective: 'acceptance' })
    assert.equal(again.already, true)
    const rescoped = await call('pentest_flow_start', {
      target: 'https://v4.test',
      targets: ['https://v4.test', 'https://api.v4.test'],
      objective: 'acceptance'
    })
    assert.deepEqual(rescoped.goal.targets, ['https://v4.test', 'https://api.v4.test'])

    const authorized = await call('pentest_flow_authorize', {
      authorization: '仅允许只读探测；禁止修改真实数据',
      targets: ['https://v4.test', 'https://api.v4.test']
    })
    assert.equal(authorized.updated, true)
    assert.match(authorized.authorization, /禁止修改真实数据/)
    assert.match(fs.readFileSync(path.join(started.workdir, 'SCOPE.md'), 'utf8'), /禁止修改真实数据/)

    const direction = await call('pentest_flow_direction', {
      axis: ['input'], question: '上传点能否写到可执行目录？', doneWhen: '写文件后能从 Web 根回读'
    })
    assert.equal(direction.id, 'direction-1')
    assert.deepEqual(direction.axis, ['input'])

    const asset = await call('pentest_flow_asset', {
      assets: [{ type: 'endpoint', value: 'GET /health', meta: 'probe' }]
    })
    assert.equal(asset.added.length, 1)
    assert.ok(asset.assets.some((item) => item.type === 'endpoint' && item.value === 'GET /health'))

    await assert.rejects(
      () => call('pentest_flow_direction', {
        axis: ['input'], question: '上传点能否写到可执行目录？', doneWhen: '重复问题'
      }),
      /duplicate direction/
    )

    await assert.rejects(
      () => call('pentest_flow_close', { directionId: 'direction-1', answer: 'closed without evidence' }),
      /requires at least one evidence id/
    )

    const status = await call('pentest_flow_status')
    assert.equal(status.exists, true)
    assert.equal(status.counts.directions, 1)
    assert.equal(status.counts.goals, 1)
    assert.equal(status.counts.assets, 3)
    const subgoal = await call('pentest_flow_goal', { title: 'subgoal', parentId: 'goal-1' })
    assert.equal(subgoal.id, 'goal-2')
    assert.equal(subgoal.state, 'open')
    const coverage = await call('pentest_flow_coverage', {
      axis: ['surface'], result: 'not_tested', note: 'slice did not enumerate every route'
    })
    assert.equal(coverage.coverage.some((item) => item.axis === 'surface'), true)
    assert.equal(status.directions[0].question, '上传点能否写到可执行目录？')
    const plan = await call('pentest_flow_plan')
    assert.equal(plan.exists, true)
    assert.equal(plan.frontier.length, 1)

    const workerLimit = await call('pentest_flow_worker_limit', { limit: 4 })
    assert.equal(workerLimit.settings.workerLimit, 4)
    assert.equal(workerLimit.concurrency.limit, 4)

    const dispatched = await call('pentest_flow_dispatch', { directionId: 'direction-1' })
    assert.equal(dispatched.taskId, 'task-1')
    assert.equal(dispatched.childId, 'child-1')
    const afterDispatch = await call('pentest_flow_status')
    assert.equal(afterDispatch.tasks[0].state, 'running')
    const waited = await call('pentest_flow_wait', { taskId: 'task-1', timeoutMs: 300 })
    assert.equal(waited.done, false)
    assert.equal(waited.timedOut, true)
    const report = await call('pentest_flow_report')
    assert.ok(fs.existsSync(report.path), 'report file must exist')
    assert.match(fs.readFileSync(report.path, 'utf8'), /渗透测试报告（v4）/)
    assert.equal(report.wordPath, undefined, 'DOCX must be opt-in, not automatic')
    const evidence = await call('pentest_flow_evidence', { op: 'verify' })
    assert.equal(evidence.total, 0)
    const delivery = await call('pentest_flow_delivery')
    assert.equal(delivery.ok, false)
    assert.ok(delivery.problems.some((item) => item.includes('目标未证明')))
    assert.ok(delivery.problems.length > 0)
    for (const cleanup of cleanups) cleanup()
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
