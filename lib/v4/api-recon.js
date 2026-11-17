/**
 * P0-5 surface-phase api-recon normalisation.
 *
 * The api-recon skill's hand-run api_merged.txt / params_merged.txt(|.json) /
 * site_map.json never became canonical v4 assets nor decidable directions.
 * Callers read those files and pass the texts (or parsed objects) in; this
 * pure module returns bounded endpoint assets plus surface directions derived
 * only from concrete METHOD /path + params.
 *
 * No I/O, network, module state or input mutation. Parsers tolerate comments,
 * blank lines, provenance tags, bare paths, JSON and broken JSON; unresolved
 * facts are explicit unknowns in `limitations`/`counts`, never thrown errors.
 */

export const MAX_RECON_ASSETS = 200;
export const MAX_RECON_DIRECTIONS = 40;

const MAX_ENTRIES = 4000;
const MAX_INPUT_CHARS = 512 * 1024;
const MAX_PARAMS = 12;
const MAX_LIMITATIONS = 20;
const MAX_PATH = 200;
const METHODS = /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT|PROPFIND|REPORT|MKCOL|COPY|MOVE|LOCK|UNLOCK|SEARCH)$/i;
const STOP = new Set(['ok', 'get', 'post', 'put', 'patch', 'delete', 'head', 'options',
  'static', 'runtime', 'both', 'json', 'form', 'body', 'query', 'params', 'param',
  'fields', 'field', 'data', 'source', 'transport', 'confidence', 'origin', 'note',
  'none', 'null', 'unknown', 'true', 'false']);
const LIST_KEYS = new Set(['apis', 'endpoints', 'items', 'uniq', 'rows', 'list', 'data',
  'params', 'records', 'results', 'values', 'apisFromStatic', 'apisFromRuntime',
  'routes', 'endpointsFromRuntime']);
const RECORD_KEYS = new Set(['method', 'm', 'path', 'u', 'url', 'uri', 'value', 'endpoint']);
const PROVENANCE = /^(?:static|runtime|both|source\s*[:=].*|confidence\s*[:=].*)$/i;
const SKIP_SEGMENT = /^(?:transport|source|confidence|origin|note|static|runtime|both)\b/i;

function text(value, max = 4096) {
  if (value == null) return '';
  try { const s = typeof value === 'string' ? value : String(value); return s.length > max ? s.slice(0, max) : s; }
  catch { return ''; }
}
function line(value, max = 240) { return text(value, max).replace(/\s+/g, ' ').trim(); }
function pushLimit(list, message) {
  const item = line(message, 180);
  if (item && !list.includes(item) && list.length < MAX_LIMITATIONS) list.push(item);
}
function dedupe(values) {
  const seen = new Set(), out = [];
  for (const v of values) { const k = String(v).toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(v); } }
  return out;
}
function isMethod(token) { return METHODS.test(token) || /^[A-Z][A-Z0-9_-]{1,15}$/.test(token); }
function looksPath(token) { return /^(?:\/|https?:\/\/)/i.test(token); }

/** Field names from strings, arrays, objects, query strings or "[a,b]". */
function paramsFrom(value) {
  const out = [];
  const add = (part) => {
    const name = line(part, 64).replace(/^["'`]|["'`]$/g, '').replace(/^\[|\]$/g, '')
      .split(/[=:]/)[0].trim().replace(/[),.;]+$/, '');
    if (!/^[A-Za-z_$][A-Za-z0-9_$.\[\]-]{0,63}$/.test(name) || STOP.has(name.toLowerCase())) return;
    out.push(name);
  };
  const walk = (item, depth = 0) => {
    if (item == null || depth > 3) return;
    if (Array.isArray(item)) { for (const v of item.slice(0, 32)) walk(v, depth + 1); return; }
    if (typeof item === 'object') {
      if (['name', 'field', 'key', 'param', 'value'].some((k) => k in item)) {
        add(text(item.name ?? item.field ?? item.key ?? item.param ?? item.value, 64)); return;
      }
      if (Array.isArray(item.fields)) { walk(item.fields, depth + 1); return; }
      for (const k of Object.keys(item).slice(0, 32)) add(k);
      return;
    }
    if (typeof item === 'string' || typeof item === 'number') {
      const flat = text(item, 512).replace(/^(?:params?|fields|query|data)\s*[:=]\s*/i, '');
      for (const part of flat.split(/[,;\s|&]+/)) if (part) add(part);
    }
  };
  walk(value);
  return dedupe(out).slice(0, MAX_PARAMS);
}

function normalizePath(rawPath, params) {
  // "GET /api/login: user,password" in params_merged.txt: the trailing colon
  // is a field separator, not part of the path. Without this, a duplicate
  // "GET /api/login:" asset is created instead of merging the params.
  let value = line(rawPath, MAX_PATH).replace(/^[:=]\s*/, '').replace(/[:=,;).]+$/, '');
  if (/^https?:\/\//i.test(value)) {
    try { const url = new URL(value); value = `${url.pathname}${url.search}`; }
    catch { value = value.replace(/^https?:\/\/[^/?#]+/i, ''); }
  }
  const q = value.indexOf('?');
  if (q >= 0) { params.push(...paramsFrom(value.slice(q + 1).replace(/&/g, ','))); value = value.slice(0, q); }
  const h = value.indexOf('#');
  if (h >= 0) value = value.slice(0, h);
  if (!value.startsWith('/') || /\s/.test(value) || /[\x00-\x1f]/.test(value)) return '';
  return value.length > MAX_PATH ? value.slice(0, MAX_PATH) : value;
}

/** One line / one JSON record -> one endpoint row; null = explicit unknown. */
function parseRow(entry, source, depth = 0) {
  if (entry == null || depth > 3) return null;
  let raw = '', params = [];
  if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') raw = line(entry);
  else if (typeof entry === 'object' && !Array.isArray(entry)) {
    const key = line(entry.__key);
    if (key) { raw = key; params = paramsFrom(entry.__value); }
    else {
      const method = line(entry.method ?? entry.m), path = line(entry.path ?? entry.u ?? entry.url ?? entry.uri ?? entry.value ?? entry.endpoint);
      raw = `${method} ${path}`.trim();
      for (const f of ['params', 'fields', 'parameters', 'query', 'meta', 'data']) {
        if (entry[f] !== undefined) params = params.concat(paramsFrom(entry[f]));
      }
    }
  } else return null;
  raw = raw.replace(/\s+#.*$/, '').replace(/\s+\/\/.*$/, '')
    .replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
  if (!raw) return null;
  if (/^\{/.test(raw)) { try { return parseRow(JSON.parse(raw), source, depth + 1); } catch { return null; } }
  // "[a,b]" after whitespace is a param list; provenance brackets are dropped;
  // brackets glued to a path (/api/users/[id]) stay part of the path.
  raw = raw.replace(/(^|\s)\[([^\]]*)\]/g, (_all, before, inner) => {
    if (!PROVENANCE.test(String(inner).trim())) params = params.concat(paramsFrom(inner));
    return before;
  });
  const segments = [];
  for (const part of raw.split(/\s*\|\s*/)) {
    const labelled = part.match(/^(?:params?|fields|query|data)\s*[:=]\s*(.+)$/i);
    if (labelled) { params = params.concat(paramsFrom(labelled[1])); continue; }
    if (SKIP_SEGMENT.test(part.trim())) continue;
    segments.push(part.trim());
  }
  const tokens = segments.join(' ').split(/\s+/).filter(Boolean);
  let methodIdx = -1, pathIdx = -1;
  if (tokens[0] && isMethod(tokens[0])) { methodIdx = 0; pathIdx = 1; }
  else if (tokens[0] && looksPath(tokens[0])) {
    pathIdx = 0;
    if (tokens[1] && isMethod(tokens[1]) && !looksPath(tokens[1])) methodIdx = 1;
  }
  if (pathIdx < 0 || !tokens[pathIdx]) return null;
  const method = methodIdx >= 0 ? tokens[methodIdx].toUpperCase() : '';
  const rest = tokens.slice(pathIdx + 1).filter((_t, i) => pathIdx + 1 + i !== methodIdx).join(' ');
  const path = normalizePath(tokens[pathIdx], params);
  if (!path) return null;
  return { method, path, params: dedupe(params.concat(paramsFrom(rest))).slice(0, MAX_PARAMS), sources: [source] };
}

/** Anything -> bounded flat list of lines/records. Never throws. */
function toEntries(input, limits, depth = 0, budget = { left: MAX_ENTRIES }) {
  if (input == null || depth > 8 || budget.left <= 0) return [];
  if (Array.isArray(input)) {
    const slice = input.slice(0, Math.max(0, budget.left));
    if (input.length > slice.length) pushLimit(limits, `input truncated at ${MAX_ENTRIES} entries`);
    budget.left -= slice.length;
    return slice.flatMap((item) => toEntries(item, limits, depth + 1, budget));
  }
  if (typeof input === 'string') {
    const raw = text(input, MAX_INPUT_CHARS);
    if (raw.length >= MAX_INPUT_CHARS) pushLimit(limits, `artifact text truncated at ${MAX_INPUT_CHARS} chars`);
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (/^[\[{]/.test(trimmed)) {
      try { return toEntries(JSON.parse(trimmed), limits, depth + 1, budget); }
      catch { pushLimit(limits, 'malformed JSON artifact; parsed as plain lines'); }
    }
    const lines = trimmed.split(/\r?\n/).map((s) => line(s)).filter((s) => s && !/^(?:#|\/\/|;)/.test(s));
    const kept = lines.slice(0, Math.max(0, budget.left));
    budget.left -= kept.length;
    if (lines.length > kept.length) pushLimit(limits, `artifact lines truncated at ${MAX_ENTRIES} entries`);
    return kept;
  }
  if (typeof input === 'object') {
    let keys = [];
    try { keys = Object.keys(input).slice(0, 256); } catch { return []; }
    const found = [];
    for (const key of keys) {
      if (!LIST_KEYS.has(key)) continue;
      let value; try { value = input[key]; } catch { continue; }
      found.push(...toEntries(value, limits, depth + 1, budget));
    }
    if (found.length) return found;
    if (keys.some((key) => RECORD_KEYS.has(key))) return [input];
    const mapped = [];  // { "POST /api/x": ["a","b"] }
    for (const key of keys) {
      if (!/^(?:[A-Z][A-Z0-9_-]*\s+)?\//.test(key)) continue;
      let value; try { value = input[key]; } catch { continue; }
      mapped.push({ __key: key, __value: value });
    }
    const kept = mapped.slice(0, Math.max(0, budget.left));
    budget.left -= kept.length;
    return kept;
  }
  return [];
}

function parseArtifact(input, source, limits) {
  const counts = { entries: 0, malformed: 0, withoutMethod: 0 }, rows = [];
  let entries = [];
  try { entries = toEntries(input, limits); }
  catch (error) {
    pushLimit(limits, `${source}: could not enumerate entries (${line(error?.message, 80)})`);
    return { rows, limitations: limits, counts };
  }
  for (const entry of entries) {
    counts.entries += 1;
    let row = null; try { row = parseRow(entry, source); } catch { /* unparseable */ }
    if (!row || !row.path) { counts.malformed += 1; continue; }
    if (!row.method) counts.withoutMethod += 1;
    rows.push(row);
  }
  if (counts.malformed) pushLimit(limits, `${source}: ${counts.malformed} unparseable entries ignored (unknown)`);
  if (counts.withoutMethod) {
    pushLimit(limits, `${source}: ${counts.withoutMethod} entries have no HTTP method (explicit unknown; no verify direction derived)`);
  }
  return { rows, limitations: limits, counts };
}

/** api_merged.txt: "METHOD /path [params] [static|runtime|both]" or bare /path. */
export function parseApiMerged(input) { return parseArtifact(input, 'api_merged.txt', []); }
/** params_merged.txt / .json: lines, JSON arrays or an endpoint->fields map. */
export function parseParamsMerged(input) { return parseArtifact(input, 'params_merged.txt', []); }
/** site_map.json: apis/params arrays, plus the artifact's own limitations. */
export function parseSiteMap(input) {
  const limits = [];
  let parsed = null;
  if (input && typeof input === 'object' && !Array.isArray(input)) parsed = input;
  else if (typeof input === 'string') {
    try { const v = JSON.parse(input); parsed = v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { /* plain lines */ }
  }
  if (parsed) {
    for (const key of ['limitations', 'unknowns', 'gaps', 'coverageGaps']) {
      let value; try { value = parsed[key]; } catch { continue; }
      if (typeof value === 'string' && value.trim()) pushLimit(limits, `site_map.json ${key}: ${line(value, 160)}`);
      else if (Array.isArray(value)) {
        for (const item of value.slice(0, 3)) { const note = line(item, 160); if (note) pushLimit(limits, `site_map.json ${key}: ${note}`); }
      }
    }
  }
  return parseArtifact(input, 'site_map.json', limits);
}

/** Merge rows by METHOD+path; path-only params enrich the method row. */
export function mergeReconRows(input = []) {
  const flat = [];
  const collect = (value, depth = 0) => {
    if (!value || depth > 2) return;
    if (Array.isArray(value)) { for (const item of value.slice(0, MAX_ENTRIES)) collect(item, depth + 1); return; }
    if (typeof value === 'object' && line(value.path)) flat.push(value);
  };
  collect(input);
  const byKey = new Map();
  for (const row of flat.slice(0, MAX_ENTRIES)) {
    const method = line(row.method, 16).toUpperCase(), path = line(row.path, MAX_PATH);
    const key = `${method}\u0000${path}`;
    const params = dedupe(Array.isArray(row.params) ? row.params.map((v) => line(v, 64)) : []).slice(0, MAX_PARAMS);
    const sources = dedupe(Array.isArray(row.sources) ? row.sources.map((v) => line(v, 40)) : []);
    const cur = byKey.get(key);
    if (!cur) { byKey.set(key, { method, path, params, sources }); continue; }
    cur.params = dedupe(cur.params.concat(params)).slice(0, MAX_PARAMS);
    cur.sources = dedupe(cur.sources.concat(sources));
  }
  const byPath = new Map();
  for (const row of byKey.values()) {
    if (!row.method) continue;
    if (!byPath.has(row.path)) byPath.set(row.path, []);
    byPath.get(row.path).push(row);
  }
  for (const [key, row] of [...byKey.entries()]) {
    if (row.method) continue;
    const matches = byPath.get(row.path) || [];
    if (!matches.length) continue;
    for (const match of matches) {
      match.params = dedupe(match.params.concat(row.params)).slice(0, MAX_PARAMS);
      match.sources = dedupe(match.sources.concat(row.sources));
    }
    byKey.delete(key);
  }
  return [...byKey.values()];
}

function cap(value, max) {
  let n; try { n = Math.round(Number(value)); } catch { return max; }
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), max) : max;
}
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Normalized, deduplicated endpoint assets ({type,value,meta}), max 200. */
export function normalizeReconAssets(rows = [], limit = MAX_RECON_ASSETS) {
  const limits = [], merged = mergeReconRows(rows);
  const methodPaths = new Set(merged.filter((r) => r.method).map((r) => r.path));
  const seen = new Set(), assets = [];
  for (const row of merged) {
    if (!row.path || (!row.method && methodPaths.has(row.path))) continue;
    const value = row.method ? `${row.method} ${row.path}` : row.path;
    if (seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    assets.push({ type: 'endpoint', value, meta: row.params.length ? `param: ${row.params.join(',')}` : '' });
  }
  assets.sort((a, b) => cmp(a.value, b.value));
  const max = cap(limit, MAX_RECON_ASSETS), selected = assets.slice(0, max);
  if (assets.length > selected.length) pushLimit(limits, `assets bounded to ${max}: ${assets.length - selected.length} endpoints omitted (unknown)`);
  return { assets: selected, limitations: limits, counts: { assets: selected.length, assetsDropped: assets.length - selected.length } };
}

/** Decidable surface directions, only from concrete METHOD /path + params. */
export function deriveReconDirections(rows = [], limit = MAX_RECON_DIRECTIONS) {
  const limits = [], concrete = mergeReconRows(rows).filter((r) => r.method && r.path)
    .sort((a, b) => Number(b.params.length > 0) - Number(a.params.length > 0)
      || cmp(`${a.method} ${a.path}`, `${b.method} ${b.path}`));
  const max = cap(limit, MAX_RECON_DIRECTIONS), selected = concrete.slice(0, max);
  if (concrete.length > selected.length) pushLimit(limits, `directions bounded to ${max}: ${concrete.length - selected.length} endpoints omitted (unknown)`);
  const directions = selected.map((row) => {
    const value = `${row.method} ${row.path}`, fields = row.params.slice(0, 6).join(', ');
    const paramText = fields ? `参数 ${fields}` : '最少必要参数';
    return {
      question: `${value} 带上${paramText}后，未授权与正常请求的响应差异是什么？`,
      doneWhen: `保存 ${value} 的真实请求/响应证据（状态码 + 响应体，覆盖${paramText}），或给出不可达的阴性证据并说明原因`,
      axis: ['surface'],
      reason: `api-recon 合并产物中的具体 METHOD /path${fields ? ' + params' : ''}（${row.sources.join('+') || 'unknown source'}），surface 阶段派生`
    };
  });
  return { directions, limitations: limits, counts: {
    directions: directions.length, directionsDropped: concrete.length - selected.length,
    withoutParams: concrete.filter((r) => r.params.length === 0).length
  } };
}

function artifactSet(raw, paramsMerged, siteMap) {
  const keys = {
    api: ['apiMerged', 'api_merged', 'api_merged.txt', 'api'],
    params: ['paramsMerged', 'params_merged', 'params_merged.txt', 'params_merged.json', 'params'],
    site: ['siteMap', 'site_map', 'site_map.json', 'site']
  };
  let bundle = false;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    try { bundle = Object.values(keys).some((list) => list.some((k) => Object.prototype.hasOwnProperty.call(raw, k))); }
    catch { bundle = false; }
  }
  const pick = (list) => { for (const k of list) { try { if (raw[k] !== undefined) return raw[k]; } catch { /* getter */ } } return undefined; };
  const set = bundle ? { api: pick(keys.api), params: pick(keys.params), site: pick(keys.site) } : { api: raw, params: undefined, site: undefined };
  if (paramsMerged !== undefined) set.params = paramsMerged;
  if (siteMap !== undefined) set.site = siteMap;
  return set;
}
function emptyCounts() {
  return { apiLines: 0, paramEntries: 0, siteMapEntries: 0, endpointsFound: 0,
    assets: 0, assetsDropped: 0, directions: 0, directionsDropped: 0,
    withoutMethod: 0, withoutParams: 0, malformed: 0 };
}

/**
 * Main entry: `raw` is an artifact bundle object, an artifact text or a parsed
 * object; optional positional params/siteMap texts are also accepted.
 * Returns { assets, directions, limitations, counts }. Never throws.
 */
export function buildApiRecon(raw = {}, paramsMerged, siteMap) {
  try {
    const { api, params, site } = artifactSet(raw, paramsMerged, siteMap);
    const a = parseApiMerged(api), p = parseParamsMerged(params), s = parseSiteMap(site);
    const limitations = [];
    for (const part of [a, p, s]) for (const note of part.limitations) pushLimit(limitations, note);
    const rows = mergeReconRows([a.rows, p.rows, s.rows]);
    const assets = normalizeReconAssets(rows), dirs = deriveReconDirections(rows);
    for (const note of [...assets.limitations, ...dirs.limitations]) pushLimit(limitations, note);
    const withoutMethod = rows.filter((r) => !r.method).length;
    if (withoutMethod) pushLimit(limitations, `${withoutMethod} endpoint(s) have no HTTP method: kept as path-only assets (method unknown), no verify direction derived`);
    if (!rows.length) pushLimit(limitations, 'no usable endpoints found in api_merged/params_merged/site_map (recon coverage unknown)');
    if (!dirs.directions.length) pushLimit(limitations, 'no concrete METHOD /path available: verify directions unknown');
    return { assets: assets.assets, directions: dirs.directions, limitations, counts: {
      apiLines: a.counts.entries, paramEntries: p.counts.entries, siteMapEntries: s.counts.entries,
      endpointsFound: rows.length, assets: assets.counts.assets, assetsDropped: assets.counts.assetsDropped,
      directions: dirs.counts.directions, directionsDropped: dirs.counts.directionsDropped,
      withoutMethod, withoutParams: dirs.counts.withoutParams,
      malformed: a.counts.malformed + p.counts.malformed + s.counts.malformed
    } };
  } catch (error) {
    return { assets: [], directions: [],
      limitations: [`api-recon normalisation failed safely: ${line(error?.message || error, 160) || 'unknown error'}`],
      counts: emptyCounts() };
  }
}
