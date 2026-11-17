import assert from 'node:assert/strict'
import test from 'node:test'

import { createStcsToolGuard } from '../lib/artex/guard.js'

function rootAgent(userText = '') {
  return {
    id: 's1',
    session: {
      header: { agentPreset: 'artex' },
      snapshotEvents: () => userText
        ? [{ type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: userText }] } }]
        : []
    }
  }
}

function childAgent() {
  return { id: 'child-1', session: { header: { agentPreset: 'artex', parentSession: 's1' } } }
}

const guard = createStcsToolGuard({
  getMembership: (agent) => (agent?.id === 's1' ? { role: 'lead' } : { role: 'teammate' })
})

test('STCS root session cannot generate directions, dispatch, or use legacy status writers', () => {
  for (const name of [
    'pentest_flow_plan',
    'pentest_flow_dispatch',
    'pentest_flow_directions',
    'pentest_flow_autoplan',
    'pentest_flow_candidate',
    'pentest_flow_close',
    'pentest_flow_cancel',
    'pentest_add_finding'
  ]) {
    assert.match(guard({ name, agent: rootAgent() }), /主会话只读|不得写图/, name)
  }
  assert.equal(guard({ name: 'pentest_flow_status', agent: rootAgent() }), undefined)
  assert.match(guard({ name: 'pentest_resume_all', agent: rootAgent() }), /只有用户明确/)
  assert.equal(guard({ name: 'pentest_resume_all', agent: rootAgent('恢复目标继续测试') }), undefined)
  assert.equal(guard({ name: 'pentest_flow_start', agent: rootAgent() }), undefined)
  assert.equal(guard({ name: 'pentest_flow_authorize', agent: rootAgent() }), undefined)
  assert.match(guard({ name: 'pentest_pause_all', agent: rootAgent() }), /只有用户明确/)
  assert.equal(guard({ name: 'pentest_pause_all', agent: rootAgent('暂停目标') }), undefined)
  assert.match(guard({ name: 'pentest_stop_goal', agent: rootAgent() }), /只有用户明确/)
  assert.equal(guard({ name: 'pentest_stop_goal', agent: rootAgent('结束目标') }), undefined)
})

test('STCS report/prove actions require explicit user text', () => {
  assert.match(guard({ name: 'pentest_flow_report', arguments: {}, agent: rootAgent('看看现在的结果') }), /只有用户明确/)
  assert.equal(guard({ name: 'pentest_flow_report', arguments: {}, agent: rootAgent('请生成报告') }), undefined)
  assert.match(guard({ name: 'pentest_flow_prove', arguments: {}, agent: rootAgent('继续测试') }), /只有用户明确/)
  assert.equal(guard({ name: 'pentest_flow_prove', arguments: {}, agent: rootAgent('结束目标，收工') }), undefined)
  assert.match(guard({ name: 'pentest_flow_delivery', arguments: { review: true }, agent: rootAgent() }), /只读交付检查/)
  assert.equal(guard({ name: 'pentest_flow_delivery', arguments: { review: false }, agent: rootAgent() }), undefined)
})

test('STCS workers/role teammates may only use traffic/trace/asset-read tools', () => {
  for (const name of ['pentest_flow_status', 'pentest_flow_direction', 'pentest_flow_dispatch', 'pentest_add_finding', 'pentest_flow_audit']) {
    assert.match(guard({ name, agent: childAgent() }), /worker\/role 不得写图/, name)
  }
  for (const name of ['pentest_traffic_search', 'pentest_traffic_record', 'pentest_trace_add', 'pentest_asset_search']) {
    assert.equal(guard({ name, agent: childAgent() }), undefined, name)
  }
})

test('STCS guard does not touch other presets or non-pentest tools', () => {
  assert.equal(guard({ name: 'pentest_flow_status', agent: { id: 'x', session: { header: { agentPreset: 'pentest' } } } }), undefined)
  assert.match(guard({ name: 'edit', agent: rootAgent() }), /STCS/)
  assert.equal(guard({ name: 'artex_status', agent: rootAgent() }), undefined)
})
