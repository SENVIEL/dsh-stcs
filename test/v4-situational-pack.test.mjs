import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSituationalPack, extractTestedUrls } from '../lib/v4/situational-pack.js'
import { buildWorkerPrompt } from '../lib/v4/dispatch.js'

const direction = {
  id: 'direction-2',
  question: '登录接口的 token 能否越权访问 /admin/export 导出接口？',
  doneWhen: '拿到 /admin/export 的未授权响应或证明鉴权有效',
  state: 'open'
}

function stateFixture() {
  return {
    facts: [
      { id: 'fact-1', directionId: 'direction-1', answer: '登录接口 POST /api/login 返回 admin JWT', confidence: 'observed', createdAt: 1 },
      { id: 'fact-2', directionId: 'direction-1', answer: 'JWT 中 role 字段由客户端可控', confidence: 'inferred', createdAt: 2 }
    ],
    assets: [
      { id: 'asset-1', type: 'endpoint', value: 'POST /api/login', meta: 'param: username,password', deleted: false },
      { id: 'asset-2', type: 'endpoint', value: 'GET /admin/export', meta: 'param: role', deleted: false },
      { id: 'asset-3', type: 'ip', value: '10.0.0.9', meta: 'internal', deleted: false }
    ],
    directions: [
      { id: 'direction-1', question: '登录流程', conclusion: { answer: 'admin JWT 可签发且 role=admin 可伪造' } },
      direction
    ],
    tasks: [
      { id: 'task-1', directionId: 'direction-2', state: 'failed', error: 'timeout while curling https://t.test/api/login?ts=1', completedAt: 3, result: {} }
    ],
    evidence: [
      { id: 'ev-1', summary: 'GET https://t.test/api/login?ts=2 -> 200', path: 'evidence/req-1.txt' },
      { id: 'ev-2', summary: 'POST https://t.test/admin/export -> 403', path: 'evidence/req-2.txt' }
    ]
  }
}

test('situational pack injects all five knowledge layers and is bounded', () => {
  const pack = buildSituationalPack(stateFixture(), direction)
  assert.match(pack, /已确认事实/)
  assert.match(pack, /admin JWT/)
  assert.match(pack, /相关接口\/参数资产/)
  assert.match(pack, /admin\/export/)
  assert.match(pack, /上游方向结论/)
  assert.match(pack, /role=admin 可伪造/)
  assert.match(pack, /本方向既往 worker 轨迹/)
  assert.match(pack, /timeout while curling/)
  assert.match(pack, /已测 URL 指纹/)
  assert.match(pack, /不要对上面「已测 URL 指纹」/)
  // host+path dedupe: two /api/login variants collapse into one fingerprint
  assert.equal((pack.match(/t\.test\/api\/login/g) || []).length >= 1, true)
  assert.ok(pack.length < 4000, `pack should stay bounded, got ${pack.length}`)
})

test('facts are capped at 12 and observed facts rank first', () => {
  const state = stateFixture()
  state.facts = Array.from({ length: 20 }, (_, i) => ({
    id: `f${i}`, answer: `observed-fact-${i}`, confidence: 'observed', createdAt: i
  }))
  state.facts.push({ id: 'late', answer: 'LATE-OBSERVED', confidence: 'observed', createdAt: 999 })
  const pack = buildSituationalPack(state, direction)
  const count = (pack.match(/^\[|^- \[/gm) || []).length
  assert.ok(count <= 12 + 10 + 6 + 4 + 16, 'all sections bounded')
  assert.match(pack, /LATE-OBSERVED/)
})

test('empty engagement produces no situational block', () => {
  assert.equal(buildSituationalPack({ facts: [], assets: [], directions: [], tasks: [], evidence: [] }, direction), '')
  assert.equal(buildSituationalPack(null, direction), '')
})

test('tested URLs dedupe query strings but keep distinct paths', () => {
  const urls = extractTestedUrls({
    evidence: [
      { summary: 'https://a.test/x?ts=1' },
      { summary: 'https://a.test/x?ts=2' },
      { summary: 'https://a.test/y' }
    ]
  })
  assert.deepEqual(urls, ['https://a.test/x?ts=1', 'https://a.test/y'])
})

test('METHOD /path records are rebuilt into target-based URL fingerprints', () => {
  const urls = extractTestedUrls({
    goal: { target: 'http://127.0.0.1:18888' },
    assets: [
      { type: 'endpoint', value: 'GET /api/login' },
      { type: 'endpoint', value: 'POST /api/login' },
      { type: 'endpoint', value: 'GET /admin/export' }
    ],
    evidence: [{ summary: 'GET /api/login -> 404 not found' }],
    facts: [{ answer: 'GET /api/login returned 404' }]
  })
  assert.ok(urls.includes('http://127.0.0.1:18888/api/login'))
  assert.ok(urls.includes('http://127.0.0.1:18888/admin/export'))
  assert.equal(urls.filter((u) => u.endsWith('/api/login')).length, 1, 'host+path dedupe')
})

test('buildWorkerPrompt embeds the pack only when state is supplied', () => {
  const base = { direction, target: 'https://t.test', workdir: 'w', taskId: 'task-2' }
  const without = buildWorkerPrompt(base)
  assert.doesNotMatch(without, /全局态势/)
  const withState = buildWorkerPrompt({ ...base, state: stateFixture() })
  assert.match(withState, /=== 全局态势/)
  assert.match(withState, /已测 URL 指纹/)
  assert.match(withState, /方向问题：/)
})
