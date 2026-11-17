import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_RECON_ASSETS,
  MAX_RECON_DIRECTIONS,
  parseApiMerged,
  parseParamsMerged,
  parseSiteMap,
  mergeReconRows,
  normalizeReconAssets,
  deriveReconDirections,
  buildApiRecon
} from '../lib/v4/api-recon.js'

test('params_merged "METHOD /path: fields" merges params without a duplicate colon asset', () => {
  const result = buildApiRecon({
    apiMerged: 'GET /api/login?user=1\nPOST /api/order?id=2\nGET /admin/export',
    paramsMerged: 'GET /api/login: user,password\nPOST /api/order: id,amount'
  })
  const values = result.assets.map((a) => a.value)
  assert.ok(!values.some((v) => v.includes(':')), `no colon-suffixed asset: ${values.join(', ')}`)
  assert.equal(values.filter((v) => v === 'GET /api/login').length, 1)
  assert.equal(values.filter((v) => v === 'POST /api/order').length, 1)
  const login = result.assets.find((a) => a.value === 'GET /api/login')
  assert.match(login.meta, /password/)
})

test('parseApiMerged tolerates comments, blanks, METHOD /path lines and bare paths', () => {
  const raw = [
    '# phase-5 merged',
    '',
    'POST /api/user/list [page,size] [static|runtime]',
    'GET /api/user/detail?id=123 | transport: query',
    'DELETE /api/user/42 [runtime]',
    '   // static-only, no method',
    '/api/health',
    'garbage line that is not an endpoint'
  ].join('\n')
  const out = parseApiMerged(raw)
  const rows = mergeReconRows(out.rows)
  assert.equal(rows.length, 4)
  const byPath = Object.fromEntries(rows.map((r) => [r.path, r]))
  assert.equal(byPath['/api/user/list'].method, 'POST')
  assert.deepEqual(byPath['/api/user/list'].params, ['page', 'size'])
  assert.ok(byPath['/api/user/detail'].params.includes('id'))
  assert.equal(byPath['/api/health'].method, '', 'bare path keeps an explicit unknown method')
  assert.equal(out.counts.malformed, 1, 'garbage line is counted as unknown, not thrown')
  assert.equal(out.counts.withoutMethod, 1)
})

test('params_merged merges fields into the same METHOD /path asset', () => {
  const api = 'POST /api/login\nGET /api/orders'
  const params = [
    'POST /api/login [username]',
    '',
    '# diff sample',
    'POST /api/login [password,captcha]',
    '{"method":"GET","path":"/api/orders","fields":["page","size"]}'
  ].join('\n')
  const parsed = parseParamsMerged(params)
  const out = buildApiRecon({ apiMerged: api, paramsMerged: params })
  const login = out.assets.find((a) => a.value === 'POST /api/login')
  assert.equal(login.type, 'endpoint')
  assert.equal(login.meta, 'param: username,password,captcha')
  const orders = out.assets.find((a) => a.value === 'GET /api/orders')
  assert.equal(orders.meta, 'param: page,size')
  assert.equal(parsed.rows.length, 3, 'comment/blank lines are ignored')
  assert.equal(out.counts.paramEntries, 3)
})

test('site_map.json arrays, map form and declared limitations are parsed', () => {
  const siteMap = JSON.stringify({
    site: 'https://t.test',
    apis: [
      'POST /api/upload',
      { method: 'PUT', path: '/api/profile', fields: ['nickname'] }
    ],
    params: { 'POST /api/upload': ['file', 'token'] },
    limitations: '未覆盖 admin 模块（需权限树还原）'
  })
  const out = buildApiRecon({ apiMerged: '', siteMap })
  assert.ok(out.assets.some((a) => a.value === 'POST /api/upload'))
  assert.equal(out.assets.find((a) => a.value === 'POST /api/upload').meta, 'param: file,token')
  assert.equal(out.assets.find((a) => a.value === 'PUT /api/profile').meta, 'param: nickname')
  assert.ok(out.limitations.some((note) => /admin/.test(note)), 'artifact limitations survive')
  assert.equal(out.counts.siteMapEntries >= 3, true)
  assert.equal(parseSiteMap(siteMap).rows.length >= 3, true)
})

test('dedupe across artifacts keeps one asset per METHOD /path; path-only rows are absorbed', () => {
  const out = buildApiRecon({
    apiMerged: 'POST /api/login\nPOST /api/login [runtime]\n/api/login',
    paramsMerged: 'post /api/login [username,username]',
    siteMap: { apis: ['POST /api/login'] }
  })
  const login = out.assets.filter((a) => a.value.toUpperCase() === 'POST /API/LOGIN')
  assert.equal(out.assets.length, 1)
  assert.equal(login.length, 1)
  assert.equal(login[0].meta, 'param: username')
  assert.equal(out.counts.endpointsFound, 1)
  assert.equal(out.counts.assets, 1)
})

test('outputs are bounded to 200 assets and 40 directions', () => {
  const api = Array.from({ length: 260 }, (_, i) => `GET /api/items/${i} [page]`).join('\n')
  const out = buildApiRecon(api)
  assert.equal(out.assets.length, MAX_RECON_ASSETS)
  assert.equal(out.directions.length, MAX_RECON_DIRECTIONS)
  assert.equal(out.counts.assetsDropped, 60)
  assert.equal(out.counts.directionsDropped, 220)
  assert.ok(out.limitations.some((note) => /bounded to 200/.test(note)))
  assert.ok(out.limitations.some((note) => /bounded to 40/.test(note)))
  assert.equal(normalizeReconAssets(mergeReconRows(parseApiMerged(api).rows), 3).assets.length, 3)
  assert.equal(deriveReconDirections(mergeReconRows(parseApiMerged(api).rows), 2).directions.length, 2)
})

test('malformed input never throws and returns explicit unknowns', () => {
  const bad = [
    '{broken json',
    '[1, {"a":',
    '\u0000',
    '///',
    'POST /ok/path',
    'not an endpoint at all',
    'POST http://t.test/api/full?x=1&y=2',
    'GET /api/users/[id] [id]'
  ].join('\n')
  let out
  assert.doesNotThrow(() => { out = buildApiRecon(bad) })
  assert.ok(out.assets.some((a) => a.value === 'POST /ok/path'))
  const full = out.assets.find((a) => a.value === 'POST /api/full')
  assert.equal(full.meta, 'param: x,y', 'absolute URL is reduced to path plus query params')
  assert.ok(out.assets.some((a) => a.value === 'GET /api/users/[id]'), 'dynamic path segment is not mangled')
  assert.ok(out.limitations.length > 0)
  assert.equal(out.counts.malformed > 0, true)
  for (const value of [undefined, null, 42, Symbol('x'), { toString() { throw new Error('boom') } }, [], '']) {
    let res
    assert.doesNotThrow(() => { res = buildApiRecon(value) }, 'must not throw for malformed input')
    assert.ok(Array.isArray(res.assets) && Array.isArray(res.directions))
    assert.deepEqual(Object.keys(res).sort(), ['assets', 'counts', 'directions', 'limitations'])
  }
  assert.deepEqual(buildApiRecon(), { assets: [], directions: [], limitations: [
    'no usable endpoints found in api_merged/params_merged/site_map (recon coverage unknown)',
    'no concrete METHOD /path available: verify directions unknown'
  ], counts: {
    apiLines: 0, paramEntries: 0, siteMapEntries: 0, endpointsFound: 0,
    assets: 0, assetsDropped: 0, directions: 0, directionsDropped: 0,
    withoutMethod: 0, withoutParams: 0, malformed: 0
  } })
})

test('derived directions carry doneWhen, axis surface and a concrete endpoint', () => {
  const out = buildApiRecon({
    apiMerged: 'POST /api/user/list',
    paramsMerged: 'POST /api/user/list [page,size,keyword]'
  })
  assert.equal(out.directions.length, 1)
  const direction = out.directions[0]
  assert.match(direction.question, /POST \/api\/user\/list/)
  assert.match(direction.question, /page/)
  assert.match(direction.doneWhen, /POST \/api\/user\/list/)
  assert.match(direction.doneWhen, /状态码 \+ 响应体|阴性证据/)
  assert.deepEqual(direction.axis, ['surface'])
  assert.match(direction.reason, /api-recon|METHOD \/path/)
  assert.deepEqual(Object.keys(direction).sort(), ['axis', 'doneWhen', 'question', 'reason'])
})

test('bare paths never produce a verify direction', () => {
  const out = buildApiRecon('/api/health\n/static/from-bundle')
  assert.equal(out.assets.length, 2)
  assert.equal(out.directions.length, 0)
  assert.ok(out.limitations.some((note) => /method unknown|no concrete METHOD/.test(note)))
  assert.equal(out.counts.withoutMethod, 2)
})

test('module is pure: inputs are not mutated', () => {
  const bundle = {
    apiMerged: 'POST /api/x [a]',
    paramsMerged: ['POST /api/x [b]'],
    siteMap: { apis: ['POST /api/x'] }
  }
  const snapshot = JSON.stringify(bundle)
  buildApiRecon(bundle)
  assert.equal(JSON.stringify(bundle), snapshot)
})
