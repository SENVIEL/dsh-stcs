import test from 'node:test'
import assert from 'node:assert/strict'
import { createStcsToolGuard, PLANNER_DENIED_TOOLS } from '../lib/artex/guard.js'

test('planner is read-only even though it runs the artex preset', () => {
  const guard = createStcsToolGuard({
    getPreset: () => 'artex',
    getMembership: () => ({ role: 'teammate', name: 'pentest-planner' })
  })
  const agent = { id: 'planner-1' }
  for (const name of ['pwsh', 'browser', 'web_fetch', 'send_message', 'spawn_teammate']) {
    assert.match(guard({ name, agent, arguments: {} }), /规划员只读/)
  }
  assert.equal(guard({ name: 'write', agent, arguments: { file_path: 'reports/roles/planner.json' } }), undefined)
  assert.equal(guard({ name: 'read', agent, arguments: { file_path: 'reports/roles/planner.json' } }), undefined)
  assert.match(guard({ name: 'pentest_flow_direction', agent, arguments: {} }), /规划员只读/)
})

test('planner deny list is explicit about probing tools', () => {
  for (const name of ['pwsh', 'browser', 'send_message', 'web_search', 'spawn_teammate']) {
    assert.ok(PLANNER_DENIED_TOOLS.has(name), name)
  }
})

test('root cannot present another session workdir as its deliverable', () => {
  const guard = createStcsToolGuard({ getPreset: () => 'artex' })
  const root = { id: 'session-f084f4d5-e4cf-4f8d-97f2-f45ea7260da8', session: { id: 'session-f084f4d5-e4cf-4f8d-97f2-f45ea7260da8', header: { agentPreset: 'artex' } } }
  assert.match(guard({
    name: 'present',
    agent: root,
    arguments: { files: [{ path: 'C:/Users/MR/Desktop/测试/23.185.200.202_c6019f42/reports/v4-report.md' }] }
  }), /workdir/)
  assert.equal(guard({
    name: 'present',
    agent: root,
    arguments: { files: [{ path: 'C:/Users/MR/Desktop/测试/23.185.200.202_f084f4d5/reports/v4-report.md' }] }
  }), undefined)
})
