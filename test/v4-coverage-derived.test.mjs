import assert from 'node:assert/strict'
import test from 'node:test'

import { deriveCoverage, untestedDirections } from '../lib/v4/coverage-derived.js'

const asset = (id, type, value, extra = {}) => ({ id, type, value, ...extra })

function baseState() {
  return {
    assets: [
      asset('asset-1', 'endpoint', 'POST /api/login', { meta: 'param: username,password' }),
      asset('asset-2', 'endpoint', 'GET /admin/export'),
      asset('asset-3', 'service', 'app.example.test:8443'),
      asset('asset-4', 'app', 'https://app.example.test'),
      asset('asset-5', 'subdomain', 'api.example.test'),
      asset('asset-6', 'ip', '10.0.0.9'),
      asset('asset-7', 'root-domain', 'example.test'),
      asset('asset-8', 'endpoint', 'GET /api/health', { deleted: true }),
      asset('asset-9', 'param', 'ignored-type')
    ],
    facts: [],
    findings: [],
    evidence: [],
    coverage: []
  }
}

test('ratio is 0 with no facts and explicitly denies 12-axis checkbox coverage', () => {
  const state = baseState()
  const out = deriveCoverage(state)
  assert.equal(out.scopeAssets, 7)
  assert.equal(out.coveredAssets, 0)
  assert.equal(out.ratio, 0)
  assert.equal(out.untestedAssets.length, 7)
  assert.equal(out.byType.endpoint.scopeAssets, 2)
  assert.equal(out.byType.endpoint.coveredAssets, 0)
  assert.ok(out.limitations.some((item) => /12-axis checkbox/i.test(item)), 'must not claim axis coverage')
  assert.ok(out.limitations.some((item) => /not proof of security/i.test(item)))
  // Deleted asset and unknown type are out of the metric.
  assert.ok(!out.untestedAssets.some((item) => item.assetId === 'asset-8'))
  assert.ok(!out.untestedAssets.some((item) => item.assetId === 'asset-9'))
  // Pure: state was never mutated.
  assert.equal(state.facts.length, 0)
  assert.equal(state.assets.length, 9)
})

test('ratio increases when a fact/evidence anchors an asset', () => {
  const state = baseState()
  const before = deriveCoverage(state)
  state.evidence.push({
    id: 'evidence-1',
    kind: 'response',
    role: 'supporting',
    summary: 'POST /api/login -> 200 with Set-Cookie session=...',
    path: 'evidence/login.txt'
  })
  state.facts.push({
    id: 'fact-1',
    directionId: 'direction-1',
    answer: 'POST /api/login returns a session cookie',
    confidence: 'observed',
    evidenceIds: ['evidence-1']
  })
  const after = deriveCoverage(state)
  assert.equal(before.ratio, 0)
  assert.ok(after.ratio > before.ratio, `expected ratio to increase: ${before.ratio} -> ${after.ratio}`)
  assert.equal(after.coveredAssets, 1)
  assert.equal(after.byType.endpoint.coveredAssets, 1)

  // Findings' evidenceIds + linked evidence summaries, and coverage.assetId,
  // are both independent anchor signals.
  const state2 = baseState()
  state2.evidence.push({ id: 'evidence-2', summary: 'GET /admin/export returned 403 for anonymous user' })
  state2.findings.push({ id: 'finding-1', claim: 'export endpoint denies anonymous access', evidenceIds: ['evidence-2'], deleted: false })
  state2.coverage.push({ id: 'coverage-1', axis: 'surface', assetId: 'asset-3', result: 'no_issue_found', evidenceIds: [] })
  const out2 = deriveCoverage(state2)
  assert.equal(out2.coveredAssets, 2)
  assert.ok(out2.ratio > before.ratio, 'two independent anchor signals counted')
  assert.equal(out2.byType.service.coveredAssets, 1)
  assert.ok(!out2.untestedAssets.some((item) => ['asset-2', 'asset-3'].includes(item.assetId)))
})

test('untestedAssets excludes covered ones and is bounded/deduplicated', () => {
  const state = baseState()
  state.assets.push(asset('asset-1', 'endpoint', 'POST /api/login', { meta: 'duplicate row' }))
  state.coverage.push({ id: 'coverage-1', axis: 'surface', assetId: 'asset-1', result: 'no_issue_found' })
  state.coverage.push({ id: 'coverage-2', axis: 'surface', assetId: 'asset-5', result: 'not_tested' })
  const out = deriveCoverage(state)
  const ids = out.untestedAssets.map((item) => item.assetId)
  assert.ok(!ids.includes('asset-1') && !ids.includes('asset-5'), 'covered assets excluded')
  assert.equal(new Set(ids).size, ids.length, 'no duplicate assetIds')
  assert.equal(ids.length, out.scopeAssets - out.coveredAssets)
  assert.equal(out.scopeAssets, 7, 'duplicate asset row collapsed')

  const many = { assets: Array.from({ length: 250 }, (_, i) => asset(`asset-${i}`, 'endpoint', `GET /p/${i}`)) }
  const bounded = deriveCoverage(many)
  assert.ok(bounded.scopeAssets <= 200)
  assert.ok(bounded.untestedAssets.length <= 50)
  assert.ok(bounded.limitations.some((item) => /truncated/i.test(item)))
})

test('untestedDirections returns bounded concrete directions with assetId', () => {
  const state = baseState()
  const out = untestedDirections(state, { limit: 3 })
  assert.equal(out.length, 3)
  assert.ok(out.length <= 20, 'absolute bound respected')
  for (const item of out) {
    assert.equal(typeof item.assetId, 'string')
    assert.ok(item.assetId.length > 0)
    assert.deepEqual(item.axis, ['surface'])
    assert.match(item.question, /授权|指纹|路由|解析|端口|响应/)
    assert.match(item.doneWhen, /fact\/evidence|coverage\.assetId/)
    assert.match(item.reason, /derived coverage/)
    assert.ok(!/^测试/.test(item.question), 'question must be concrete, not "test X"')
    assert.ok(item.question.includes(state.assets.find((a) => a.id === item.assetId).value))
  }
  // Endpoint/service assets are preferred over host inventory.
  assert.ok(out.every((item) => ['endpoint', 'service', 'app'].includes(
    state.assets.find((a) => a.id === item.assetId).type
  )))
  assert.equal(new Set(out.map((item) => item.assetId)).size, out.length, 'deduplicated by assetId')
  assert.equal(new Set(out.map((item) => item.question)).size, out.length, 'deduplicated by question')

  const capped = untestedDirections(state, { limit: 999 })
  assert.ok(capped.length <= 20 && capped.length <= state.assets.length)
  assert.equal(untestedDirections(state, { limit: 0 }).length, 0)
  assert.equal(untestedDirections(state, { limit: 2 }).length, 2)
  assert.equal(untestedDirections(state).length, 5, 'default N is bounded')
  assert.equal(untestedDirections(state, { limit: '7' }).length, 7)
  assert.ok(untestedDirections(state, { limit: 999, maxDirections: 1 }).length <= 20)
  // Options object itself is malformed: still a bounded, asset-bound result.
  assert.deepEqual(untestedDirections(state, 'nope'), untestedDirections(state))
})

test('malformed / empty state never throws and stays finite', () => {
  const bad = [undefined, null, 42, 'x', [], {}, { assets: 'nope' },
    { assets: [null, 7, {}, { id: 'a', type: 'endpoint' }, { id: 'a', type: 'ip', value: '10.0.0.9' }],
      facts: null, findings: 3, evidence: [null, { summary: null }], coverage: { assetId: 'a' } },
    { assets: [{ id: 'a', type: 'endpoint', value: 'GET /', meta: { nested: { deep: 1 } }, priority: {} }],
      facts: [{ evidenceIds: ['a', 'a'] }] }]
  for (const state of bad) {
    const out = deriveCoverage(state)
    assert.ok(Number.isInteger(out.scopeAssets) && out.scopeAssets >= 0)
    assert.ok(Number.isInteger(out.coveredAssets) && out.coveredAssets >= 0)
    assert.ok(Number.isFinite(out.ratio) && out.ratio >= 0 && out.ratio <= 1)
    assert.ok(Array.isArray(out.untestedAssets))
    assert.ok(out.limitations.length > 0)
    const directions = untestedDirections(state, { limit: 5 })
    assert.ok(Array.isArray(directions))
    assert.ok(directions.every((item) => item.assetId && Array.isArray(item.axis)))
  }
  const empty = deriveCoverage({})
  assert.deepEqual(
    { scopeAssets: empty.scopeAssets, coveredAssets: empty.coveredAssets, ratio: empty.ratio },
    { scopeAssets: 0, coveredAssets: 0, ratio: 0 }
  )
  assert.deepEqual(untestedDirections(undefined), [])
  assert.equal(deriveCoverage(null).untestedAssets.length, 0)
})

test('hostnames embedded in URLs count as literal evidence anchors', () => {
  const state = baseState()
  state.assets.push(asset('asset-10', 'endpoint', 'GET /unique'))
  state.evidence.push({ id: 'evidence-3', summary: 'GET https://api.example.test/v1 -> 200' })
  state.evidence.push({ id: 'evidence-4', summary: 'app.example.test:8443 banner: nginx' })
  state.evidence.push({ id: 'evidence-5', summary: 'ip 10.0.0.9 reachable' })
  const out = deriveCoverage(state)
  // The service, subdomain, ip and root-domain literals are anchored; the
  // unrelated full app URL and endpoint are not (no fuzzy host guessing).
  assert.equal(out.coveredAssets, 4)
  assert.ok(!out.untestedAssets.some((item) => ['asset-3', 'asset-5', 'asset-6', 'asset-7'].includes(item.assetId)))
  assert.ok(out.untestedAssets.some((item) => item.assetId === 'asset-4'))
  assert.ok(out.untestedAssets.some((item) => item.assetId === 'asset-10'))
})

test('id-literal and structured anchors work without a matching value string', () => {
  const state = baseState()
  state.coverage.push({ id: 'c1', axis: 'surface', assetId: 'asset-6', result: 'blocked', note: 'no value mentioned' })
  state.evidence.push({ id: 'e1', summary: 'ip scope check', assetIds: ['asset-7'] })
  const out = deriveCoverage(state)
  assert.equal(out.coveredAssets, 2)
  assert.ok(!out.untestedAssets.some((item) => ['asset-6', 'asset-7'].includes(item.assetId)))
  // asset-1 must not be falsely covered by asset-10-style prefix matching.
  const prefix = { assets: [asset('asset-1', 'endpoint', 'GET /a')], facts: [{ answer: 'asset-100 was checked' }] }
  assert.equal(deriveCoverage(prefix).ratio, 0)
})
