import assert from 'node:assert/strict'
import test from 'node:test'

import { deriveFromBoard } from '../lib/artex/coordinator.js'
import { syncTargetMap, summarizeTargetMap } from '../lib/artex/target-map.js'

const state = {
  version: 4,
  revision: 3,
  sessionId: 's1',
  goal: { target: 'https://example.com', targets: ['https://example.com'], objective: 'authorized test', authorization: 'authorized', workdir: 'C:/tmp/stcs' },
  assets: [
    { id: 'a1', type: 'root-domain', value: 'example.com' },
    { id: 'a2', type: 'endpoint', value: 'GET /api/user/{id}' },
    { id: 'a3', type: 'endpoint', value: 'POST /api/login' }
  ],
  directions: [
    { id: 'd1', state: 'open', question: 'GET /api/order?orderId=1 是否存在越权？', doneWhen: '取响应', axis: ['logic'] }
  ],
  facts: [
    { id: 'f1', answer: '登录后获得 token，可访问 /api/user/list', evidenceIds: ['e1'] },
    { id: 'f2', answer: 'DELETE /api/user/123 删除原有数据', evidenceIds: ['e2'] }
  ],
  evidence: [
    { id: 'e1', kind: 'response', role: 'proof', summary: 'POST /api/login 200 Set-Cookie sessionid=abc', path: 'evidence/login.txt' },
    { id: 'e2', kind: 'request', role: 'proof', summary: 'DELETE /api/user/123', path: 'evidence/delete.txt' }
  ],
  findings: [],
  coverage: [],
  tasks: []
}

test('STCS target map folds assets, directions, facts and auth flows deterministically', () => {
  const map = syncTargetMap(null, state, 1000)
  const summary = summarizeTargetMap(map)
  assert.ok(summary.endpoints >= 3)
  assert.ok(summary.authFlows >= 1)
  assert.ok(map.endpoints.some((item) => item.path === '/api/user/{id}'))
  assert.ok(map.endpoints.some((item) => item.path.startsWith('/api/order')))
  assert.ok(map.params.some((item) => item.name === 'id' && item.location === 'path'))
  assert.ok(map.params.some((item) => item.name === 'orderId' && item.location === 'query'))
  assert.ok(map.authFlows.some((item) => item.kind === 'token' || item.kind === 'cookie'))

  const again = syncTargetMap(map, state, 2000)
  assert.deepEqual(again.endpoints.map((item) => item.id), map.endpoints.map((item) => item.id))
})

test('STCS deriveFromBoard emits concrete endpoint hypotheses, never the six fixed fallbacks', () => {
  const derived = deriveFromBoard({ state, board: emptyBoard('s1'), now: 1000 })
  assert.ok(derived.hypothesisTree.length >= 3)
  assert.ok(derived.runnable.length >= 1)
  assert.ok(derived.runnable.every((item) => /\/api\/|认证流|example\.com/.test(item.claim)))
  assert.ok(derived.runnable.some((item) => item.claim.includes('GET /api/user/{id}')))
  assert.ok(!derived.runnable.some((item) => /还有哪些未枚举的入口/.test(item.claim)), 'no broad filler direction')

  const twice = deriveFromBoard({ state, board: emptyBoard('s1'), now: 1000 })
  assert.deepEqual(twice.priorityQueue.map((item) => item.hypothesisId), derived.priorityQueue.map((item) => item.hypothesisId))
})

test('STCS red-line candidates stay blocked instead of being dispatched', () => {
  const derived = deriveFromBoard({ state, board: emptyBoard('s1'), now: 1000 })
  const blocked = derived.hypothesisTree.find((item) => item.status === 'blocked')
  assert.ok(blocked, 'a DELETE test must be retained as blocked evidence')
  assert.match(blocked.reason, /red-line/)
  assert.ok(!derived.runnable.some((item) => item.id === blocked.id))
})

test('STCS empty engagement still derives enough concrete work to fill the pool', () => {
  const bare = {
    ...state,
    assets: [{ id: 'root', type: 'root-domain', value: 'example.com' }],
    directions: [],
    facts: [],
    evidence: []
  }
  const derived = deriveFromBoard({ state: bare, board: emptyBoard('s1'), now: 1000 })
  assert.ok(derived.runnable.length >= 4, `expected several initial hypotheses, got ${derived.runnable.length}`)
  assert.ok(derived.runnable.every((item) => item.claim.includes('example.com')))
})

function emptyBoard(sessionId) {
  return {
    version: 1,
    revision: 1,
    sessionId,
    round: 0,
    targetMap: { apps: [], endpoints: [], params: [], authFlows: [], updatedAt: 0 },
    hypothesisTree: [],
    priorityQueue: [],
    decisions: [],
    debrief: null
  }
}
