/**
 * P1-9 derived coverage (覆盖度改为派生指标).
 *
 * Coverage is no longer a 12-axis checkbox score. It is a *derived* metric:
 * the proportion of canonical in-scope `state.assets` that are anchored by at
 * least one fact, finding, evidence or explicit test record. An "anchored"
 * asset is one that the engagement has actually touched, never an assertion
 * that it is secure. The remaining (untested) assets can be turned into
 * concrete, asset-bound direction candidates instead of vague "test X" prose.
 *
 * Anchor signals, in order of strength:
 *   1. `state.coverage[].assetId` (and assetIds) — an explicit test record;
 *   2. `state.facts[].evidenceIds` / `state.findings[].evidenceIds` — an asset
 *      id literal there, or the summaries of the evidence records they link to;
 *   3. structured assetId/assetIds/affectedAssets fields on facts, findings,
 *      evidence and coverage rows;
 *   4. literal fallback: the asset id or asset.value appearing in a fact /
 *      evidence / finding / coverage summary (whitespace-normalised, bounded).
 *
 * This module is self-contained and pure: no imports, no I/O, no Date/Math
 * randomness, no mutation of the supplied state. All inputs and outputs are
 * bounded, and every missing/malformed array is tolerated. Output shape:
 *   { scopeAssets: number, coveredAssets: number, ratio: number 0..1,
 *     untestedAssets: Array<{assetId,type,value,reason}>,
 *     byType: { [type]: {scopeAssets,coveredAssets,ratio,untestedAssets} },
 *     limitations: string[] }
 */

// Canonical v4 asset types (lib/v4/assets.js), ordered by testing value.
// The five types named in the P1-9 spec plus root-domain, which the goal
// seeder also emits; unknown/param types are deliberately out of this metric.
const SCOPE_TYPES = ['endpoint', 'service', 'app', 'subdomain', 'ip', 'root-domain'];
const TYPE_ALIASES = {
  endpoint: 'endpoint', api: 'endpoint', route: 'endpoint', path: 'endpoint',
  service: 'service', port: 'service',
  app: 'app', application: 'app', url: 'app',
  subdomain: 'subdomain', host: 'subdomain', hostname: 'subdomain',
  ip: 'ip', ipv4: 'ip',
  'root-domain': 'root-domain', domain: 'root-domain', root: 'root-domain'
};
const TYPE_PRIORITY = { endpoint: 100, service: 80, app: 60, subdomain: 40, ip: 30, 'root-domain': 10 };
// P1-9 asks for endpoint/service preference. Keep that as the primary class so
// a noisy high-priority host never outranks a concrete untested endpoint.
const TYPE_CLASS = { endpoint: 3, service: 3, app: 2, subdomain: 1, ip: 1, 'root-domain': 0 };

const MAX_ASSETS = 200;
const MAX_RECORDS = 200;         // per collection
const MAX_TEXT = 400;            // per field
const MAX_POOL_CHARS = 65536;    // per combined text pool
const MAX_VALUE = 160;
const MAX_UNTESTED = 50;
const MAX_LIMITATIONS = 12;
const MAX_DIRECTIONS = 20;
const DEFAULT_DIRECTIONS = 5;
const MAX_QUESTION = 240;
const MAX_DONE_WHEN = 220;
const MAX_REASON = 180;
const MIN_LITERAL = 3;
// Word chars that must not be split by a literal match. `.` `/` `:` are
// delimiters in URLs/hosts: `app.example.test` inside `https://app.example.test`
// is a real anchor, while `asset-1` inside `asset-10` is not.
const WORD = /[a-z0-9_-]/;

const BASE_LIMITATIONS = [
  'NOT a 12-axis checkbox coverage: no AXES checkbox is asserted tested by this metric; it measures fact/evidence-anchored in-scope assets only.',
  'An anchored asset means at least one fact/evidence/test record references it. It is not proof of security, nor of absence of vulnerabilities.',
  'Literal value matching in fact/evidence/finding summaries is a heuristic fallback: short, ambiguous or whitespace-variant values may be missed or over-matched.',
  'Scope membership is taken from canonical state.assets (non-deleted, recognised types); goal.excludedTargets is not re-validated here.',
  'Recognised types are the five P1-9 types (endpoint/subdomain/ip/service/app) plus canonical root-domain; unknown or param assets are excluded.',
  'Unlinked evidence summaries also count as anchors. Coverage rows with assetId count even when their result is not_tested/blocked.',
  'Inputs and outputs are bounded (assets, records, text, untested list, directions); truncation is reported in limitations, never treated as completeness.'
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

/** Stringify any value with a depth/size guard; circular structures are safe. */
function text(value, depth = 0) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  if (depth >= 2) return '';
  if (Array.isArray(value)) return value.slice(0, 32).map((item) => text(item, depth + 1)).filter(Boolean).join(' ');
  if (typeof value === 'object') return Object.values(value).slice(0, 16).map((item) => text(item, depth + 1)).filter(Boolean).join(' ');
  return '';
}

function flat(value) {
  return text(value).replace(/\s+/g, ' ').trim();
}

/** Bounded single-line projection, mirroring situational-pack.js. */
function line(value, max) {
  const out = flat(value);
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}

function normalizeType(value) {
  return TYPE_ALIASES[String(value == null ? '' : value).trim().toLowerCase()] || '';
}

/**
 * Case-insensitive literal match with token boundaries, so `asset-1` does not
 * match `asset-10` and `10.0.0.9` does not match `10.0.0.90`.
 */
function containsLiteral(haystack, needle) {
  const hay = flat(haystack).toLowerCase();
  const pin = flat(needle).toLowerCase().slice(0, MAX_VALUE);
  if (!pin || pin.length < MIN_LITERAL) return false;
  let from = 0;
  while (from <= hay.length - pin.length) {
    const at = hay.indexOf(pin, from);
    if (at < 0) return false;
    const before = at > 0 ? hay[at - 1] : '';
    const after = hay[at + pin.length] || '';
    if (!WORD.test(before) && !WORD.test(after)) return true;
    from = at + 1;
  }
  return false;
}

function push(pool, ...values) {
  // A fact/evidence record can carry an id array (e.g. evidenceIds), so check
  // every element separately for asset-id literals instead of flattening it.
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 64)) push(pool, item);
      continue;
    }
    const out = line(value, MAX_TEXT);
    if (out) pool.push(out);
  }
  if (pool.length > MAX_RECORDS * 16) pool.length = MAX_RECORDS * 16;
}

function joinPool(pool) {
  return pool.join('\n').slice(0, MAX_POOL_CHARS);
}

/** High-value assets first: concrete endpoints/services before host inventory. */
function assetScore(item, type, value) {
  let score = TYPE_PRIORITY[type] || 0;
  const meta = flat(item.meta ?? item.description ?? item.note);
  if (/param|auth|admin|upload|login|export|token|api|critical|high|rce|pay|order|config|debug/i.test(`${meta} ${value}`)) score += 20;
  const declared = Number(item.priority ?? item.valueScore ?? item.riskScore ?? item.weight);
  if (Number.isFinite(declared)) score += Math.min(Math.max(declared, 0), 50);
  return score;
}

function roundRatio(covered, scope) {
  return scope > 0 ? Math.round((covered / scope) * 10000) / 10000 : 0;
}

/** Stable, deterministic priority order for untested assets. */
function sortUntested(a, b) {
  return (TYPE_CLASS[b.type] || 0) - (TYPE_CLASS[a.type] || 0)
    || b.score - a.score
    || a.value.localeCompare(b.value)
    || a.assetId.localeCompare(b.assetId);
}

const QUESTIONS = {
  endpoint: (v) => `在授权范围内对 ${v} 发一次基线请求并记录响应，再试一组方法/参数变体：该端点是否存在未授权访问、参数处理或状态差异的可复现证据？`,
  service: (v) => `对 ${v} 做一次服务指纹与默认配置探测并记录响应：该服务暴露了哪些版本、端口和可达入口？`,
  app: (v) => `对 ${v} 枚举入口路由、参数与静态资源并记录响应：还有哪些未登记的可达接口与输入面？`,
  subdomain: (v) => `核对 ${v} 的解析与 HTTP 可达性并记录响应：该子域实际提供哪些服务、路由和参数？`,
  ip: (v) => `在授权范围内核对 ${v} 的开放端口/服务并记录响应：该主机暴露了哪些可验证的指纹与入口？`,
  'root-domain': (v) => `核对 ${v} 的解析、证书与关联子域并记录证据：还有哪些未登记的可达入口？`
};

function doneWhenFor(asset) {
  return `至少一条 fact/evidence 明确引用 ${asset.value}（或 assetId ${asset.assetId}）并写入 coverage.assetId=${asset.assetId}；否则给出带证据的明确否定结论。`;
}

function scoreOf(row) {
  return typeof row.score === 'number' && Number.isFinite(row.score) ? row.score : 0;
}

function resolveLimit(options) {
  const requested = [options.limit, options.maxDirections, options.max, options.count]
    .find((value) => value !== undefined);
  if (requested === undefined) return DEFAULT_DIRECTIONS;
  const raw = Number(requested);
  if (!Number.isFinite(raw)) return DEFAULT_DIRECTIONS;
  return Math.min(Math.max(Math.floor(raw), 0), MAX_DIRECTIONS);
}

/**
 * Derive the asset-anchoring coverage metric from canonical v4 state.
 * @param {object} state canonical v4 state (malformed/empty tolerated)
 * @returns {{scopeAssets:number, coveredAssets:number, ratio:number,
 *   untestedAssets:Array, byType:object, limitations:string[]}}
 */
export function deriveCoverage(state) {
  const root = isObject(state) ? state : {};
  const limitations = BASE_LIMITATIONS.slice();

  const rawAssets = array(root.assets);
  const scannedAssets = rawAssets.slice(0, MAX_ASSETS);
  if (rawAssets.length > MAX_ASSETS) {
    limitations.push(`assets truncated to ${MAX_ASSETS} of ${rawAssets.length}; scopeAssets is a lower bound.`);
  }

  const scopeRows = [];
  const seen = new Set();
  for (let index = 0; index < scannedAssets.length; index += 1) {
    const item = scannedAssets[index];
    if (!isObject(item) || item.deleted === true || item.outOfScope === true) continue;
    const type = normalizeType(item.type ?? item.assetType);
    if (!type) continue;
    const value = line(item.value ?? item.name ?? item.url, MAX_VALUE)
      .replace(/[\s，。；：,;:!?！？、"'“”‘’()（）[\]【】<>《》]+$/, '');
    if (!value) continue;
    const assetId = line(item.id ?? item.assetId, 80) || `derived:${type}:${index}`;
    const valueKey = `${type}\u0000${value.toLowerCase()}`;
    const idKey = `id:${assetId}`;
    if (seen.has(valueKey) || seen.has(idKey)) continue;
    seen.add(valueKey);
    seen.add(idKey);
    scopeRows.push({ assetId, type, value, score: assetScore(item, type, value) });
  }

  const collections = [
    ['facts', array(root.facts)],
    ['findings', array(root.findings)],
    ['evidence', array(root.evidence)],
    ['coverage', array(root.coverage)]
  ];
  const truncated = [];
  for (const [name, rows] of collections) {
    if (rows.length > MAX_RECORDS) truncated.push(`${name}:${MAX_RECORDS}/${rows.length}`);
  }
  if (truncated.length) limitations.push(`anchor records truncated (${truncated.join(', ')}); covered count may be understated.`);

  const idPool = [];
  const summaryPool = [];
  for (const fact of collections[0][1].slice(0, MAX_RECORDS)) {
    if (!isObject(fact)) continue;
    // Structured id anchors: asset id literals in fact.evidenceIds, plus
    // assetId/assetIds. Linked-evidence summaries are added below.
    push(idPool, fact.assetId, fact.assetIds, fact.evidenceIds);
    push(summaryPool, fact.answer, fact.detail, fact.summary, fact.note, fact.evidence);
  }
  for (const finding of collections[1][1].slice(0, MAX_RECORDS)) {
    if (!isObject(finding) || finding.deleted === true) continue;
    push(idPool, finding.assetId, finding.assetIds, finding.evidenceIds);
    push(summaryPool, finding.claim, finding.title, finding.summary, finding.note,
      finding.affectedAssets, finding.evidence);
  }
  for (const evidence of collections[2][1].slice(0, MAX_RECORDS)) {
    if (!isObject(evidence)) continue;
    push(idPool, evidence.assetId, evidence.assetIds);
    // Every state.evidence summary participates, including the records linked
    // by fact.evidenceIds / finding.evidenceIds / coverage.evidenceIds.
    push(summaryPool, evidence.summary, evidence.path, evidence.note);
  }
  for (const row of collections[3][1].slice(0, MAX_RECORDS)) {
    if (!isObject(row)) continue;
    push(idPool, row.assetId, row.assetIds, row.evidenceIds);
    push(summaryPool, row.note, row.surface, row.evidence);
  }

  const idText = joinPool(idPool);
  const summaryText = joinPool(summaryPool);
  if (idPool.join('\n').length > MAX_POOL_CHARS || summaryPool.join('\n').length > MAX_POOL_CHARS) {
    limitations.push('anchor text pool truncated; literal fallback may miss anchors beyond the retained window.');
  }
  if (limitations.length < MAX_LIMITATIONS) {
    limitations.push(`Anchor signals: ${idPool.length} id fields, ${summaryPool.length} fact/evidence/finding/coverage summary fields.`);
  }

  let coveredAssets = 0;
  for (const row of scopeRows) {
    const byId = containsLiteral(idText, row.assetId) || containsLiteral(summaryText, row.assetId);
    const byValue = containsLiteral(summaryText, row.value);
    row.covered = byId || byValue;
    if (row.covered) coveredAssets += 1;
  }

  const byType = {};
  for (const type of SCOPE_TYPES) {
    byType[type] = { scopeAssets: 0, coveredAssets: 0, ratio: 0, untestedAssets: 0 };
  }
  for (const row of scopeRows) {
    const bucket = byType[row.type];
    bucket.scopeAssets += 1;
    if (row.covered) bucket.coveredAssets += 1;
    else bucket.untestedAssets += 1;
  }
  for (const type of SCOPE_TYPES) {
    const bucket = byType[type];
    bucket.ratio = roundRatio(bucket.coveredAssets, bucket.scopeAssets);
  }

  const untestedRows = scopeRows.filter((row) => !row.covered).sort(sortUntested);
  if (untestedRows.length > MAX_UNTESTED) {
    limitations.push(`untestedAssets truncated to ${MAX_UNTESTED} of ${untestedRows.length}; highest-value assets retained.`);
  }
  if (scopeRows.length === 0) {
    limitations.push('No in-scope assets found; ratio is defined as 0, not 100%.');
  }
  const untestedAssets = untestedRows.slice(0, MAX_UNTESTED).map((row) => ({
    assetId: row.assetId,
    type: row.type,
    value: row.value,
    reason: line(`no fact/evidence anchor for ${row.type} ${row.value}`, MAX_REASON)
  }));

  return {
    scopeAssets: scopeRows.length,
    coveredAssets,
    ratio: roundRatio(coveredAssets, scopeRows.length),
    untestedAssets,
    byType,
    limitations: limitations.slice(0, MAX_LIMITATIONS)
  };
}

/**
 * Turn up to N untested in-scope assets into concrete, asset-bound direction
 * candidates. Endpoint/service and explicitly high-value assets come first;
 * results are deduplicated by assetId and question, and strictly bounded.
 *
 * @param {object} state canonical v4 state (malformed/empty tolerated)
 * @param {{limit?:number, maxDirections?:number, max?:number, count?:number}} options
 * @returns {Array<{question:string, doneWhen:string, axis:string[], reason:string, assetId:string}>}
 */
export function untestedDirections(state, options = {}) {
  const opts = isObject(options) ? options : {};
  const limit = resolveLimit(opts);
  const derived = deriveCoverage(state);
  const untested = array(derived.untestedAssets)
    .filter(isObject)
    .map((row) => ({
      assetId: line(row.assetId, 80),
      type: normalizeType(row.type) || 'app',
      value: line(row.value, MAX_VALUE),
      score: scoreOf(row)
    }))
    .filter((row) => row.value)
    .sort(sortUntested);
  const out = [];
  const seen = new Set();
  for (const asset of untested) {
    // An untestedAssets row without a usable assetId cannot satisfy the
    // asset-bound contract; skip rather than emitting a dangling direction.
    if (!asset.assetId) continue;
    if (out.length >= limit) break;
    const key = asset.assetId;
    if (seen.has(key)) continue;
    const question = line((QUESTIONS[asset.type] || QUESTIONS.app)(asset.value), MAX_QUESTION);
    if (seen.has(question)) continue;
    seen.add(key);
    seen.add(question);
    out.push({
      question,
      doneWhen: line(doneWhenFor(asset), MAX_DONE_WHEN),
      axis: ['surface'],
      reason: line(`derived coverage: ${asset.type} ${asset.value} (${asset.assetId}) has no fact/evidence anchor`, MAX_REASON),
      assetId: asset.assetId
    });
  }
  return out.slice(0, MAX_DIRECTIONS);
}
