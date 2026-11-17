import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addAssets,
  assetGraphStats,
  createAssetGraphStore,
  linkAsset,
  listAssetLinks,
  normalizeAsset,
  scopeKeyForTarget,
  searchAssets
} from '../lib/asset-graph.js'

test('asset normalization accepts typed rows and infers common values', () => {
  assert.deepEqual(normalizeAsset('ip|10.0.0.5|edge'), { type: 'ip', value: '10.0.0.5', meta: 'edge', parentId: '', inScope: undefined })
  assert.equal(normalizeAsset('https://example.test/a').type, 'endpoint')
  assert.equal(normalizeAsset('api.example.test').type, 'root-domain')
  assert.equal(normalizeAsset({ type: 'subdomain', value: 'api.example.test', meta: 'x' }).type, 'subdomain')
  assert.throws(() => normalizeAsset({ type: 'weird', value: 'x' }), /unknown asset type/)
  assert.throws(() => normalizeAsset(''), /value required/)
  assert.equal(scopeKeyForTarget('https://www.Example.test:8443/a'), 'example.test')
  assert.equal(scopeKeyForTarget('', 's1'), 'session:s1')
})

test('asset batch deduplicates case-insensitively and resolves parents inside the batch', () => {
  const first = addAssets(undefined, [
    { type: 'root-domain', value: 'example.test' },
    { type: 'subdomain', value: 'api.example.test', parentId: 'asset-1' }
  ], 's1', 1000, 'example.test')
  assert.equal(first.results.length, 2)
  assert.equal(first.graph.assets.length, 2)
  assert.equal(first.graph.assets[1].parentId, 'asset-1')

  const second = addAssets(first.graph, [
    { type: 'subdomain', value: 'API.EXAMPLE.TEST', meta: 'login' },
    { type: 'root-domain', value: 'example.test', meta: 'root' }
  ], 's2', 2000, 'example.test')
  assert.equal(second.results[0].reused, true)
  assert.equal(second.results[1].reused, true)
  assert.equal(second.graph.assets.length, 2)
  assert.equal(second.graph.assets[0].meta, 'root')
  assert.equal(second.graph.assets[1].meta, 'login')
  assert.equal(second.changed, true)
})

test('asset graph does not leak assets across engagement scopes', () => {
  const first = addAssets(undefined, [{ type: 'endpoint', value: 'https://a.example/x' }], 's1', 1, 'a.example')
  const second = addAssets(first.graph, [{ type: 'endpoint', value: 'https://a.example/x' }], 's2', 2, 'b.example')
  assert.equal(second.results[0].reused, false)
  const a = searchAssets(second.graph, { scopeKey: 'a.example' })
  const b = searchAssets(second.graph, { scopeKey: 'b.example' })
  assert.equal(a.total, 1)
  assert.equal(b.total, 1)
  assert.notEqual(a.items[0].id, b.items[0].id)
  assert.equal(searchAssets(second.graph, { scopeKey: 'c.example' }).total, 0)
  assert.throws(() => addAssets(second.graph, [
    { type: 'subdomain', value: 'child.example', parentId: a.items[0].id }
  ], 's2', 3, 'b.example'), /another engagement scope/)
})

test('asset search filters by type and query with bounded paging', () => {
  const added = addAssets(undefined, [
    { type: 'endpoint', value: 'https://example.test/login', meta: 'auth' },
    { type: 'endpoint', value: 'https://example.test/upload', meta: 'file' },
    { type: 'ip', value: '10.0.0.1' }
  ], 's1', 1)
  const all = searchAssets(added.graph, { limit: 10 })
  assert.equal(all.total, 3)
  assert.equal(all.returned, 3)
  const endpoint = searchAssets(added.graph, { type: 'endpoint', limit: 1 })
  assert.equal(endpoint.total, 2)
  assert.equal(endpoint.returned, 1)
  assert.equal(endpoint.hasMore, true)
  const hits = searchAssets(added.graph, { query: 'upload' })
  assert.equal(hits.total, 1)
  assert.equal(hits.items[0].type, 'endpoint')
})

test('asset links are idempotent and filterable', () => {
  const added = addAssets(undefined, [{ type: 'endpoint', value: 'https://example.test/a' }], 's1', 1)
  const assetId = added.graph.assets[0].id
  const linked = linkAsset(added.graph, { sessionId: 's1', nodeType: 'direction', nodeId: 'direction-1', assetId }, 2)
  assert.equal(linked.reused, false)
  const again = linkAsset(linked.graph, { sessionId: 's1', nodeType: 'direction', nodeId: 'direction-1', assetId }, 3)
  assert.equal(again.reused, true)
  assert.equal(again.graph.links.length, 1)
  const list = listAssetLinks(linked.graph, { sessionId: 's1', nodeType: 'direction' })
  assert.equal(list.total, 1)
  assert.equal(list.items[0].assetId, assetId)
})

test('asset links reject unknown assets and node types', () => {
  const added = addAssets(undefined, [{ type: 'ip', value: '10.0.0.1' }], 's1', 1)
  assert.throws(() => linkAsset(added.graph, { sessionId: 's1', nodeType: 'direction', nodeId: 'd1', assetId: 'asset-99' }), /unknown asset/)
  assert.throws(() => linkAsset(added.graph, { sessionId: 's1', nodeType: 'bad', nodeId: 'd1', assetId: 'asset-1' }), /unknown anchor/)
})

test('asset graph stats group by asset and anchor type', () => {
  const added = addAssets(undefined, [{ type: 'ip', value: '10.0.0.1' }, { type: 'endpoint', value: 'https://x/a' }], 's1', 1)
  const linked = linkAsset(added.graph, { sessionId: 's1', nodeType: 'fact', nodeId: 'fact-1', assetId: 'asset-1' }, 2)
  const stats = assetGraphStats(linked.graph)
  assert.equal(stats.assets, 2)
  assert.equal(stats.links, 1)
  assert.deepEqual(stats.byType, { ip: 1, endpoint: 1 })
  assert.deepEqual(stats.byNodeType, { fact: 1 })
})

test('asset store serializes concurrent imports and links', async () => {
  const rows = new Map()
  const table = {
    async get(key) { return rows.get(key) },
    async put(key, value) { rows.set(key, structuredClone(value)) }
  }
  const store = createAssetGraphStore({ table, now: () => 1000 })
  await Promise.all(Array.from({ length: 10 }, (_, i) => store.add('s1', [{ type: 'ip', value: `10.0.0.${i}` }])))
  await store.drain()
  const stats = await store.stats()
  assert.equal(stats.assets, 10)
  assert.equal(stats.revision, 10)
  const first = await store.search({ query: '10.0.0.1' })
  const assetId = first.items[0].id
  await Promise.all(Array.from({ length: 5 }, (_, i) => store.link({
    sessionId: 's1', nodeType: 'fact', nodeId: `fact-${i}`, assetId
  })))
  await store.drain()
  const links = await store.links({ sessionId: 's1' })
  assert.equal(links.total, 5)
})
