import assert from 'node:assert/strict'
import test from 'node:test'
import { toViewModel } from '../lib/view-model-v3.js'

function baseState(overrides = {}) {
  return {
    version: 3,
    goal: { id: 'goal-1', target: 'https://t.test', phase: 'active' },
    nodes: [], edges: [], intents: [], facts: [], assets: [], evidence: [],
    findings: [{
      id: 'finding-1', claim: 'c', severity: 'low', status: 'confirmed',
      steps: ['GET /a HTTP/1.1\r\nHost: t.test\r\n\r\n', 'GET /b HTTP/1.1\r\nHost: t.test\r\n\r\n'],
      stepNotes: ['向 /a 发未认证请求，确认根路径是否公开。', '向 /b 发请求，确认接口文档是否受保护。']
    }],
    ...overrides
  }
}

test('view model preserves v4 string-step stepNotes instead of blanking them', () => {
  const vm = toViewModel(baseState())
  const f = (vm.findings || []).find((x) => x.id === 'finding-1') || vm.nodes?.find((n) => n.kind === 'finding' && n.id === 'finding-1')
  const target = f || vm
  assert.ok(Array.isArray(target.stepNotes), 'stepNotes must be an array')
  assert.match(String(target.stepNotes[0] || ''), /向 \/a 发未认证请求/)
  assert.match(String(target.stepNotes[1] || ''), /确认接口文档是否受保护/)
  assert.equal((target.stepNotes || []).filter((x) => !x).length, 0)
})

test('view model still supports legacy {request,note} steps', () => {
  const vm = toViewModel(baseState({
    findings: [{
      id: 'finding-2', claim: 'c', severity: 'low', status: 'confirmed',
      steps: [{ request: 'GET /x', note: 'legacy note' }]
    }]
  }))
  const f = (vm.findings || []).find((x) => x.id === 'finding-2') || vm.nodes?.find((n) => n.id === 'finding-2')
  assert.match(String((f?.stepNotes || [])[0] || ''), /legacy note/)
})
