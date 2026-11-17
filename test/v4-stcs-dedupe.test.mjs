import test from 'node:test'
import assert from 'node:assert/strict'
import { syncTargetMap } from '../lib/artex/target-map.js'
import { normalizeBoard, deriveFromBoard } from '../lib/artex/coordinator.js'
import { inferFindingDedupeKey, dedupeFindingPayload } from '../lib/v4/dispatch.js'
import { hypothesisKey } from '../lib/artex/hypothesis-tree.js'
import { createStcsToolGuard } from '../lib/artex/guard.js'
import { buildStcsWorkerPrompt } from '../lib/artex/prompt.js'

test('root and /login share one authentication hypothesis per origin', () => {
  const state = {
    goal: { id: 'goal-1', target: 'https://23.185.200.202/login', phase: 'active' },
    assets: [
      { id: 'asset-1', type: 'app', value: 'https://23.185.200.202' },
      { id: 'asset-2', type: 'app', value: 'https://23.185.200.202/login' }
    ],
    directions: [],
    facts: [],
    findings: [],
    coverage: [],
    tasks: []
  }
  const targetMap = syncTargetMap(undefined, state)
  const derived = deriveFromBoard({ state, board: normalizeBoard({ targetMap }), now: 1_000_000 })
  const auth = derived.created.filter((item) => Array.isArray(item.axis) && item.axis.includes('identity'))
  assert.equal(auth.length, 1, 'one auth hypothesis for the origin')
  assert.match(auth[0].claim, /23\.185\.200\.202/)
  const surfaces = derived.created.filter((item) => Array.isArray(item.axis) && item.axis.includes('surface'))
  assert.equal(surfaces.length, 2, 'root and /login keep distinct surface hypotheses')
})

test('semantic vulnType wins over the transport wording', () => {
  const host = '23.185.200.202'
  assert.equal(inferFindingDedupeKey({ vulnType: 'auth_bypass', claim: 'version-bound auth bypass' }, host), 'auth-bypass:23.185.200.202')
  assert.equal(inferFindingDedupeKey({ vulnType: 'rce', claim: 'version-bound RCE' }, host), 'rce:23.185.200.202')
  assert.equal(inferFindingDedupeKey({ vulnType: 'information_disclosure', claim: 'leak' }, host), 'information-disclosure:23.185.200.202')
  assert.equal(inferFindingDedupeKey({ impactProven: 'write', claim: '未认证攻击者可通过大写 /API 路径调用 DELETE /API/crons' }, host), 'auth-bypass:23.185.200.202')
  assert.equal(inferFindingDedupeKey({ impactProven: 'rce', claim: 'DELETE /API/crons then run' }, host), 'rce:23.185.200.202')
})

test('low information-disclosure findings collapse to one dedupe key', () => {
  const host = '23.185.200.202'
  const one = { severity: 'low', title: 'system version leak', claim: 'GET /api/system returns 2.20.1' }
  const two = { severity: 'low', title: 'health metrics leak', claim: 'GET /api/health returns uptime' }
  const three = { severity: 'low', title: 'nginx and directory leak', claim: 'response header leaks nginx/1.18.0 and QL_DIR' }
  assert.equal(inferFindingDedupeKey(one, host), 'information-disclosure:23.185.200.202')
  assert.equal(inferFindingDedupeKey(two, host), inferFindingDedupeKey(one, host))
  assert.equal(inferFindingDedupeKey(three, host), inferFindingDedupeKey(one, host))
  const out = dedupeFindingPayload([one, two, three], [], host)
  assert.equal(out.length, 1)
  assert.equal(out[0].dedupeKey, 'information-disclosure:23.185.200.202')
})

test('candidate-only derivation never creates runnable directions', () => {
  const state = {
    goal: { id: 'goal-1', target: 'https://23.185.200.202/login', phase: 'active' },
    assets: [{ id: 'asset-1', type: 'app', value: 'https://23.185.200.202' }],
    directions: [], facts: [], findings: [], coverage: [], tasks: []
  }
  const board = normalizeBoard({ targetMap: syncTargetMap(undefined, state) })
  const derived = deriveFromBoard({ state, board, now: 1_000_000, candidateOnly: true })
  assert.ok(derived.candidates.length > 0)
  assert.equal(derived.runnable.length, 0)
})

test('only an explicit verify stage forbids worker findings', () => {
  const probe = buildStcsWorkerPrompt({
    direction: { question: '验证 /api/user/init 是否存在认证绕过？', doneWhen: '取到可复现证据或明确排除', stage: 'probe' },
    target: 'http://h:4444',
    workdir: 'C:/tmp/work'
  })
  assert.doesNotMatch(probe, /禁止新增 finding/)
  assert.match(probe, /发现可复现漏洞.*必须提交完整 finding/)

  const verify = buildStcsWorkerPrompt({
    direction: { question: '复现已报告的管理员认证绕过', doneWhen: '两次一致复现', stage: 'verify' },
    target: 'http://h:4444',
    workdir: 'C:/tmp/work'
  })
  assert.match(verify, /禁止新增 finding/)
})

test('one origin is one app: a trailing slash or a product name never doubles it', () => {
  const map = syncTargetMap(undefined, {
    goal: { target: 'http://163.192.5.200:4444/' },
    assets: [
      { id: 'asset-1', type: 'app', value: 'http://163.192.5.200:4444' },
      { id: 'asset-2', type: 'app', value: 'http://163.192.5.200:4444/' },
      { id: 'asset-3', type: 'app', value: 'Qinglong 2.20.2' },
      { id: 'asset-4', type: 'root-domain', value: 'example.com' }
    ]
  })
  assert.deepEqual(map.apps.map((app) => app.value), ['http://163.192.5.200:4444', 'example.com'])
})

test('claims that differ only by a trailing slash collapse to one hypothesis key', () => {
  const bare = hypothesisKey({ axis: ['identity', 'credential'], claim: 'http://h:4444 的登录/会话入口是否存在弱凭据？' })
  const slash = hypothesisKey({ axis: ['credential', 'identity'], claim: 'http://h:4444/ 的登录/会话入口是否存在弱凭据？' })
  assert.equal(bare, slash)
})

test('the STCS root cannot probe the target itself; workers still can', () => {
  const rootAgent = { id: 'root', session: { id: 'root', header: { agentPreset: 'artex' } } }
  const childAgent = { id: 'child', session: { id: 'child', header: { parentSession: 'root' } } }
  const guard = createStcsToolGuard({ getPreset: () => 'artex' })
  assert.match(guard({ name: 'pwsh', agent: rootAgent, arguments: {} }), /主会话只读/)
  assert.match(guard({ name: 'web_fetch', agent: rootAgent, arguments: {} }), /主会话只读/)
  assert.match(guard({ name: 'spawn_teammate', agent: rootAgent, arguments: {} }), /主会话只读/)
  assert.equal(guard({ name: 'pwsh', agent: childAgent, arguments: {} }), undefined)
  assert.equal(guard({ name: 'web_fetch', agent: childAgent, arguments: {} }), undefined)
  assert.equal(guard({ name: 'artex_status', agent: rootAgent, arguments: {} }), undefined)
  assert.equal(guard({ name: 'read', agent: rootAgent, arguments: {} }), undefined)
})
