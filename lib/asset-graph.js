/**
 * Global asset graph + per-session exploration anchors.
 *
 * ARTEX separates the global asset truth (domain/subdomain/service/endpoint)
 * from the per-task exploration graph. DSH keeps a useful per-session asset
 * list, but it cannot answer "have I seen this endpoint in another engagement
 * or another session?" and it has no explicit node→asset anchor.
 *
 * This module keeps that index in its own storage domain (`pentest_asset_graph`)
 * as one bounded row. It is deliberately independent of `pentest_v2` so:
 * - the canonical state schema is not migrated;
 * - asset updates never inflate the UI projection;
 * - a failed asset import cannot corrupt the engagement graph.
 */
export const ASSET_GRAPH_VERSION = 1
export const MAX_GRAPH_ASSETS = 5000
export const MAX_GRAPH_LINKS = 20000
export const ASSET_TYPES = new Set(['root-domain', 'subdomain', 'ip', 'service', 'app', 'endpoint'])
export const ANCHOR_NODE_TYPES = new Set(['direction', 'intent', 'fact', 'finding'])

const TYPE_ALIASES = new Map([
  ['root_domain', 'root-domain'],
  ['root-domain', 'root-domain'],
  ['rootdomain', 'root-domain'],
  ['subdomain', 'subdomain'],
  ['ip', 'ip'],
  ['service', 'service'],
  ['app', 'app'],
  ['endpoint', 'endpoint']
])

function text(value, max = Number.MAX_SAFE_INTEGER) {
  const out = value === undefined || value === null ? '' : String(value)
  return out.length > max ? out.slice(0, max) : out
}

function fail(code, message) {
  const error = new Error(message)
  error.code = code
  throw error
}

/**
 * Keep global reuse inside one engagement boundary. The asset graph is global
 * storage, but search results must never leak another client's targets into a
 * session. A target host is the scope; sessions without a target fall back to
 * their own id.
 */
export function scopeKeyForTarget(target, fallbackSessionId = '') {
  const raw = text(target).trim().toLowerCase()
  if (raw) {
    try {
      const url = new URL(raw.includes('://') ? raw : `http://${raw}`)
      const host = url.hostname.replace(/^www\./, '')
      if (host) return host
    } catch {
      /* not a URL; use a conservative literal scope */
    }
    return raw.replace(/^www\./, '').replace(/\/.*$/, '')
  }
  return fallbackSessionId ? `session:${fallbackSessionId}` : ''
}

function normalizeType(value) {
  const raw = text(value).trim().toLowerCase()
  return TYPE_ALIASES.get(raw) || null
}

function inferType(value) {
  const candidate = text(value).trim()
  if (/^https?:\/\//i.test(candidate)) return 'endpoint'
  if (/^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?$/.test(candidate)) return 'ip'
  if (/^\*\./.test(candidate)) return 'subdomain'
  if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(candidate)) return 'root-domain'
  if (/^[a-z0-9.-]+:\d+$/i.test(candidate)) return 'service'
  return 'app'
}

export function normalizeAsset(input) {
  let type = ''
  let value = ''
  let meta = ''
  let parentId = ''
  let inScope
  if (typeof input === 'string') {
    const parts = input.split('|')
    if (parts.length >= 2 && normalizeType(parts[0])) {
      type = normalizeType(parts[0])
      value = text(parts[1], 512).trim()
      meta = text(parts.slice(2).join('|'), 2048).trim()
    } else {
      value = text(input, 512).trim()
      type = inferType(value)
    }
  } else if (input && typeof input === 'object') {
    const explicitType = text(input.type || input.assetType).trim()
    type = normalizeType(explicitType)
    if (explicitType && !type) fail('asset/type', `unknown asset type ${explicitType}`)
    value = text(input.value, 512).trim()
    meta = text(input.meta, 2048).trim()
    parentId = text(input.parentId, 80).trim()
    if (typeof input.inScope === 'boolean') inScope = input.inScope
  }
  if (!value) fail('asset/value', 'asset value required')
  if (!type) type = inferType(value)
  if (!ASSET_TYPES.has(type)) fail('asset/type', `unknown asset type ${type}`)
  return { type, value, meta, parentId, inScope }
}

function assetKey(scopeKey, type, value) {
  return scopeKey + '\u0000' + type + '\u0000' + value.toLowerCase()
}

function emptyGraph() {
  return {
    version: ASSET_GRAPH_VERSION,
    revision: 0,
    counter: 0,
    assets: [],
    links: [],
    updatedAt: 0
  }
}

function normalizeGraph(row) {
  if (!row || typeof row !== 'object') return emptyGraph()
  const assets = Array.isArray(row.assets) ? row.assets.filter((asset) => asset && typeof asset === 'object') : []
  const links = Array.isArray(row.links) ? row.links.filter((link) => link && typeof link === 'object') : []
  return {
    version: ASSET_GRAPH_VERSION,
    revision: Math.max(0, Number(row.revision) || 0),
    counter: Math.max(assets.length, Number(row.counter) || 0),
    assets: assets.slice(0, MAX_GRAPH_ASSETS),
    links: links.slice(0, MAX_GRAPH_LINKS),
    updatedAt: Number(row.updatedAt) || 0
  }
}

/**
 * Add a batch atomically. Invalid input fails before any part of the batch is
 * persisted; parent ids are resolved against the final batch.
 */
export function addAssets(graph, inputs, sessionId, now = Date.now(), scopeKey = '') {
  const current = normalizeGraph(graph)
  const scope = text(scopeKey) || text(sessionId)
  const list = Array.isArray(inputs) ? inputs : [inputs]
  if (list.length === 0) fail('asset/empty', 'asset import requires at least one row')
  if (list.length > 1000) fail('asset/batch', 'asset import is limited to 1000 rows per call')
  const normalized = list.map(normalizeAsset)
  const byKey = new Map(current.assets.map((asset) => [assetKey(asset.scopeKey || '', asset.type, asset.value), asset]))
  const byId = new Map(current.assets.map((asset) => [asset.id, asset]))
  const nextAssets = current.assets.map((asset) => ({ ...asset }))
  let counter = current.counter
  const results = []

  // First pass: add all new values, preserving existing metadata.
  for (const item of normalized) {
    const key = assetKey(scope, item.type, item.value)
    const existing = byKey.get(key)
    if (existing) {
      const next = nextAssets.find((asset) => asset.id === existing.id)
      if (item.meta && item.meta !== next.meta) next.meta = item.meta
      if (item.inScope !== undefined) next.inScope = item.inScope
      results.push({ asset: { ...next }, reused: true })
      continue
    }
    counter += 1
    const asset = {
      id: `asset-${counter}`,
      scopeKey: scope,
      type: item.type,
      value: item.value,
      meta: item.meta,
      inScope: item.inScope !== false,
      parentId: '',
      firstSessionId: text(sessionId),
      createdAt: now,
      updatedAt: now
    }
    nextAssets.push(asset)
    byKey.set(key, asset)
    byId.set(asset.id, asset)
    results.push({ asset: { ...asset }, reused: false })
  }

  // Second pass: validate and apply parent references after the batch exists.
  for (let index = 0; index < normalized.length; index += 1) {
    const parentId = normalized[index].parentId
    if (!parentId) continue
    const parent = byId.get(parentId)
    if (!parent) fail('asset/parent', `unknown parent asset ${parentId}`)
    if ((parent.scopeKey || '') !== scope) fail('asset/scope', `parent asset ${parentId} belongs to another engagement scope`)
    const result = results[index].asset
    const target = byId.get(result.id)
    if (target) {
      target.parentId = parentId
      target.updatedAt = now
      results[index] = { ...results[index], asset: { ...target } }
    }
  }

  if (nextAssets.length > MAX_GRAPH_ASSETS) {
    fail('asset/cap', `asset graph exceeds ${MAX_GRAPH_ASSETS} rows; prune before importing`)
  }
  const changed = nextAssets.length !== current.assets.length ||
    nextAssets.some((asset, index) => asset.meta !== current.assets[index]?.meta || asset.inScope !== current.assets[index]?.inScope || asset.parentId !== current.assets[index]?.parentId)
  return {
    graph: changed ? { ...current, revision: current.revision + 1, counter, assets: nextAssets, updatedAt: now } : { ...current, counter },
    results,
    changed
  }
}

export function searchAssets(graph, options = {}) {
  const current = normalizeGraph(graph)
  const query = text(options.query, 256).trim().toLowerCase()
  const type = options.type ? normalizeType(options.type) : ''
  if (options.type && !type) fail('asset/type', `unknown asset type ${options.type}`)
  const scopeKey = text(options.scopeKey, 256)
  const limit = clampInt(options.limit, 50, 1, 200)
  const offset = clampInt(options.offset, 0, 0, 1e9)
  let items = current.assets.slice()
  if (scopeKey) items = items.filter((asset) => asset.scopeKey === scopeKey)
  if (type) items = items.filter((asset) => asset.type === type)
  if (query) {
    items = items.filter((asset) => [asset.id, asset.type, asset.value, asset.meta]
      .some((value) => text(value).toLowerCase().includes(query)))
  }
  items.sort((a, b) => a.type.localeCompare(b.type) || a.value.localeCompare(b.value))
  const total = items.length
  return {
    total,
    returned: Math.max(0, Math.min(items.length - offset, limit)),
    hasMore: offset + limit < items.length,
    items: items.slice(offset, offset + limit).map((asset) => ({ ...asset }))
  }
}

export function linkAsset(graph, input = {}, now = Date.now()) {
  const current = normalizeGraph(graph)
  const sessionId = text(input.sessionId, 200)
  if (!sessionId) fail('asset/session', 'asset link sessionId required')
  const nodeType = text(input.nodeType, 40).toLowerCase()
  if (!ANCHOR_NODE_TYPES.has(nodeType)) fail('asset/node-type', `unknown anchor node type ${nodeType}`)
  const nodeId = text(input.nodeId, 200)
  const assetId = text(input.assetId, 80)
  const scopeKey = text(input.scopeKey, 256)
  if (!nodeId) fail('asset/node', 'asset link nodeId required')
  const asset = current.assets.find((item) => item.id === assetId)
  if (!asset) fail('asset/not-found', `unknown asset ${assetId}`)
  if (scopeKey && asset.scopeKey !== scopeKey) fail('asset/scope', `asset ${assetId} belongs to another engagement scope`)
  const key = [sessionId, nodeType, nodeId, assetId].join('\u0000')
  const existing = current.links.find((link) => link.key === key)
  if (existing) return { graph: current, link: { ...existing }, reused: true }
  if (current.links.length >= MAX_GRAPH_LINKS) fail('asset/link-cap', `asset graph exceeds ${MAX_GRAPH_LINKS} links`)
  const link = {
    id: `link-${current.links.length + 1}`,
    key,
    sessionId,
    nodeType,
    nodeId,
    assetId,
    createdAt: now
  }
  return {
    graph: {
      ...current,
      revision: current.revision + 1,
      links: current.links.concat(link),
      updatedAt: now
    },
    link,
    reused: false
  }
}

export function listAssetLinks(graph, options = {}) {
  const current = normalizeGraph(graph)
  const sessionId = text(options.sessionId, 200)
  const nodeType = options.nodeType ? text(options.nodeType, 40).toLowerCase() : ''
  const nodeId = text(options.nodeId, 200)
  let items = current.links
  if (sessionId) items = items.filter((link) => link.sessionId === sessionId)
  if (nodeType) items = items.filter((link) => link.nodeType === nodeType)
  if (nodeId) items = items.filter((link) => link.nodeId === nodeId)
  const limit = clampInt(options.limit, 100, 1, 500)
  return {
    total: items.length,
    returned: Math.min(items.length, limit),
    hasMore: items.length > limit,
    items: items.slice(0, limit).map((link) => ({ ...link }))
  }
}

export function assetGraphStats(graph, options = {}) {
  const current = normalizeGraph(graph)
  const scopeKey = text(options.scopeKey, 256)
  const assets = scopeKey ? current.assets.filter((asset) => asset.scopeKey === scopeKey) : current.assets
  const assetIds = new Set(assets.map((asset) => asset.id))
  const links = scopeKey ? current.links.filter((link) => assetIds.has(link.assetId)) : current.links
  const byType = {}
  for (const asset of assets) byType[asset.type] = (byType[asset.type] || 0) + 1
  const byNodeType = {}
  for (const link of links) byNodeType[link.nodeType] = (byNodeType[link.nodeType] || 0) + 1
  return {
    revision: current.revision,
    scopeKey: scopeKey || null,
    assets: assets.length,
    links: links.length,
    byType,
    byNodeType,
    updatedAt: current.updatedAt
  }
}

export function createAssetGraphStore({ table, now = () => Date.now() }) {
  if (!table || typeof table.get !== 'function' || typeof table.put !== 'function') {
    throw new Error('asset graph store requires get/put table')
  }
  const KEY = '__graph__'
  let chain = Promise.resolve()
  const load = async () => normalizeGraph(await table.get(KEY))
  const save = async (graph) => table.put(KEY, graph)
  const enqueue = (operation) => {
    const current = chain.then(operation, operation)
    chain = current.then(() => {}, () => {})
    return current
  }
  return {
    async add(sessionId, rows, scopeKey = '') {
      return enqueue(async () => {
        const current = await load()
        const out = addAssets(current, rows, sessionId, now(), scopeKey)
        if (out.changed) await save(out.graph)
        return { results: out.results, revision: out.graph.revision, changed: out.changed }
      })
    },
    async search(options = {}) {
      return searchAssets(await load(), options)
    },
    async link(input = {}) {
      return enqueue(async () => {
        const current = await load()
        const out = linkAsset(current, input, now())
        if (!out.reused) await save(out.graph)
        return { link: out.link, reused: out.reused, revision: out.graph.revision }
      })
    },
    async links(options = {}) {
      return listAssetLinks(await load(), options)
    },
    async stats(options = {}) {
      return assetGraphStats(await load(), options)
    },
    async drain() {
      await chain
    }
  }
}

function clampInt(value, fallback, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}
