/**
 * STCS live target map.
 *
 * Derived, read-only index over the canonical v4 blackboard:
 *   apps / endpoints / params / authFlows
 *
 * It never writes canonical state. Coordinator persists the returned map in its
 * own board so a task can be replayed from the same board revision.
 */
import { asArray, stableId, text, uniqueBy } from './util.js';

const METHOD_RE = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)/i;
const HTTP_URL_RE = /https?:\/\/[^\s"'<>)]+/gi;
const DIRECTION_RE = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[^\s,;)\]}"']+)/gi;
const AUTH_RE = /(登录|登陆|认证|会话|令牌|token|jwt|bearer|cookie|session|oauth|sso|单点|扫码|验证码|密码)/i;
const AUTH_PATH_RE = /(login|sign-?in|auth|token|session|oauth|sso)/i;

function normalizePath(raw) {
  let value = text(raw).trim().replace(/[),.;]+$/g, '');
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      return `${parsed.pathname || '/'}${parsed.search || ''}`;
    } catch {
      return value;
    }
  }
  if (value.startsWith('/')) return value;
  return '';
}

function parseEndpointValue(raw) {
  const value = text(raw).trim();
  if (!value) return null;
  const methodMatch = value.match(METHOD_RE);
  if (methodMatch) {
    const path = normalizePath(methodMatch[2]);
    if (!path) return null;
    return { method: methodMatch[1].toUpperCase(), path };
  }
  const path = normalizePath(value);
  if (!path) return null;
  return { method: 'GET', path };
}

function endpointKey(method, path) {
  return `${text(method).toUpperCase()} ${text(path).split('?')[0]}`;
}

function appOrigin(app) {
  const value = text(app?.value).trim();
  if (!/^https?:\/\//i.test(value)) return '';
  try { return new URL(value).origin; } catch { return ''; }
}

/**
 * Canonical identity for one app row. The same origin written with and
 * without a trailing slash (`http://host:4444` vs `http://host:4444/`) must be
 * ONE app, otherwise the Coordinator derives every initial hypothesis twice.
 * Free text is not an app: asset type `app` is also used for product names.
 */
function canonicalAppValue(raw) {
  const value = text(raw).trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
      return `${parsed.origin}${pathname}${parsed.search || ''}`;
    } catch {
      return value.replace(/\/+$/, '');
    }
  }
  if (/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d+)?$/i.test(value)) return value.toLowerCase();
  return '';
}

function endpointUrl(appValue, path) {
  const origin = appOrigin({ value: appValue });
  if (origin && path.startsWith('/')) return `${origin}${path}`;
  return path;
}

function addEndpoint(bucket, spec) {
  const method = text(spec.method || 'GET').toUpperCase();
  const path = normalizePath(spec.path);
  if (!path) return null;
  const key = endpointKey(method, path);
  let row = bucket.get(key);
  if (!row) {
    row = {
      id: stableId('ep', key),
      method,
      path,
      key,
      appId: text(spec.appId),
      url: text(spec.url),
      sources: [],
      tested: false,
      evidenceRefs: []
    };
    bucket.set(key, row);
  }
  if (spec.source && !row.sources.includes(spec.source)) row.sources.push(spec.source);
  if (spec.appId && !row.appId) row.appId = text(spec.appId);
  if (spec.url && !row.url) row.url = text(spec.url);
  if (spec.tested === true) row.tested = true;
  for (const ref of asArray(spec.evidenceRefs)) {
    if (ref && !row.evidenceRefs.includes(ref)) row.evidenceRefs.push(ref);
  }
  return row;
}

function extractParams(value, endpointId, locationHint = '') {
  const raw = text(value);
  const out = [];
  const add = (name, location) => {
    const clean = text(name).replace(/^['"]|['"]$/g, '').trim();
    if (!clean || clean.length > 80) return;
    out.push({ endpointId: text(endpointId), name: clean, location });
  };
  for (const match of raw.matchAll(/[?&]([A-Za-z0-9_\-[\].]+)=/g)) add(match[1], 'query');
  for (const match of raw.matchAll(/\/(?::([A-Za-z0-9_]+)|\{([A-Za-z0-9_]+)\})/g)) add(match[1] || match[2], 'path');
  for (const match of raw.matchAll(/(?:params?|参数|body|表单)[:：=]\s*([A-Za-z0-9_,\-[\].]+)/gi)) {
    for (const name of match[1].split(',')) add(name, locationHint || 'body');
  }
  return out;
}

function authKind(value) {
  const raw = text(value);
  if (/oauth|sso|单点/i.test(raw)) return 'oauth';
  if (/jwt|bearer|token|令牌/i.test(raw)) return 'token';
  if (/cookie|session|会话/i.test(raw)) return 'cookie';
  return 'login';
}

function matchingEndpoint(endpoints, value) {
  const raw = text(value);
  return endpoints.find((item) => raw.includes(item.path) || item.path === raw)
    || endpoints.find((item) => AUTH_PATH_RE.test(item.path))
    || null;
}

export function emptyTargetMap() {
  return { apps: [], endpoints: [], params: [], authFlows: [], updatedAt: 0 };
}

export function normalizeTargetMap(value) {
  const map = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    apps: asArray(map.apps).filter((item) => item && item.id),
    endpoints: asArray(map.endpoints).filter((item) => item && item.id && item.method && item.path),
    params: asArray(map.params).filter((item) => item && item.endpointId && item.name),
    authFlows: asArray(map.authFlows).filter((item) => item && item.id && item.kind),
    updatedAt: Number(map.updatedAt) || 0
  };
}

/**
 * Incrementally fold canonical assets / directions / facts / evidence into the
 * live map. `previous` is never mutated; existing ids are preserved so board
 * decisions keep pointing at the same endpoint across ticks.
 */
export function syncTargetMap(previous, state, now = Date.now()) {
  const base = normalizeTargetMap(previous);
  const apps = [];
  const appByValue = new Map();
  const addApp = (value, meta, source) => {
    const raw = canonicalAppValue(value);
    if (!raw) return null;
    const key = raw.toLowerCase();
    let row = appByValue.get(key);
    if (!row) {
      row = { id: stableId('app', key), value: raw, meta: text(meta), sources: [] };
      appByValue.set(key, row);
      apps.push(row);
    }
    if (source && !row.sources.includes(source)) row.sources.push(source);
    return row;
  };

  for (const asset of asArray(state?.assets)) {
    if (!asset || asset.deleted === true) continue;
    if (['app', 'root-domain', 'subdomain'].includes(text(asset.type))) {
      addApp(asset.value, asset.meta, `asset:${asset.id}`);
    }
  }
  const goal = state?.goal || {};
  addApp(goal.target || asArray(goal.targets)[0], 'goal', 'goal');
  const firstApp = apps[0] || null;

  const endpointBucket = new Map();
  for (const asset of asArray(state?.assets)) {
    if (!asset || asset.deleted === true || text(asset.type) !== 'endpoint') continue;
    const parsed = parseEndpointValue(asset.value);
    if (parsed) addEndpoint(endpointBucket, {
      ...parsed,
      appId: firstApp?.id,
      url: endpointUrl(firstApp?.value, parsed.path),
      source: `asset:${asset.id}`,
      evidenceRefs: asArray(asset.evidenceIds)
    });
  }
  for (const direction of asArray(state?.directions)) {
    const blob = `${text(direction?.question)} ${text(direction?.doneWhen)}`;
    for (const match of blob.matchAll(DIRECTION_RE)) {
      const parsed = { method: match[1].toUpperCase(), path: normalizePath(match[2]) };
      if (!parsed.path) continue;
      addEndpoint(endpointBucket, {
        ...parsed,
        appId: firstApp?.id,
        url: endpointUrl(firstApp?.value, parsed.path),
        source: `direction:${direction.id}`,
        tested: ['done', 'exhausted', 'empty'].includes(text(direction.state)),
        evidenceRefs: asArray(direction?.conclusion?.evidenceIds)
      });
    }
    for (const match of blob.matchAll(HTTP_URL_RE)) {
      const parsed = parseEndpointValue(match[0]);
      if (!parsed) continue;
      addEndpoint(endpointBucket, {
        ...parsed,
        appId: firstApp?.id,
        url: match[0],
        source: `direction:${direction.id}`,
        tested: ['done', 'exhausted', 'empty'].includes(text(direction.state))
      });
    }
  }
  for (const fact of asArray(state?.facts)) {
    const blob = `${text(fact?.answer)} ${text(fact?.detail)}`;
    for (const match of blob.matchAll(DIRECTION_RE)) {
      const parsed = { method: match[1].toUpperCase(), path: normalizePath(match[2]) };
      if (!parsed.path) continue;
      addEndpoint(endpointBucket, {
        ...parsed,
        appId: firstApp?.id,
        url: endpointUrl(firstApp?.value, parsed.path),
        source: `fact:${fact.id}`,
        evidenceRefs: asArray(fact.evidenceIds)
      });
    }
  }

  const endpoints = [...endpointBucket.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const endpoint of endpoints) {
    endpoint.url = endpoint.url || endpointUrl(firstApp?.value, endpoint.path);
    endpoint.params = extractParams(endpoint.path, endpoint.id)
      .map((item) => item.name)
      .filter((item, index, all) => all.indexOf(item) === index);
  }

  const params = [];
  const seenParams = new Set();
  const addParam = (item) => {
    const key = `${item.endpointId}|${item.location}|${item.name}`;
    if (seenParams.has(key)) return;
    seenParams.add(key);
    params.push({ id: stableId('param', key), ...item });
  };
  for (const endpoint of endpoints) {
    for (const name of asArray(endpoint.params)) addParam({ endpointId: endpoint.id, name, location: 'path' });
    for (const item of extractParams(endpoint.path, endpoint.id)) addParam(item);
  }
  for (const direction of asArray(state?.directions)) {
    const blob = `${text(direction?.question)} ${text(direction?.doneWhen)}`;
    const matched = endpoints.find((endpoint) => blob.includes(endpoint.path));
    for (const item of extractParams(blob, matched?.id || '')) {
      if (item.endpointId) addParam(item);
    }
  }

  const authFlows = [];
  const addAuthFlow = (kind, endpoint, evidenceRefs, source) => {
    const key = `${kind}|${endpoint?.id || 'unknown'}`;
    let row = authFlows.find((item) => item.key === key);
    if (!row) {
      row = {
        id: stableId('auth', key),
        key,
        kind,
        endpointId: endpoint?.id || '',
        endpoint: endpoint?.path || '',
        evidenceRefs: [],
        sources: []
      };
      authFlows.push(row);
    }
    for (const ref of asArray(evidenceRefs)) if (ref && !row.evidenceRefs.includes(ref)) row.evidenceRefs.push(ref);
    if (source && !row.sources.includes(source)) row.sources.push(source);
  };
  for (const fact of asArray(state?.facts)) {
    const blob = `${text(fact?.answer)} ${text(fact?.detail)}`;
    if (!AUTH_RE.test(blob)) continue;
    addAuthFlow(authKind(blob), matchingEndpoint(endpoints, blob), asArray(fact.evidenceIds), `fact:${fact.id}`);
  }
  for (const evidence of asArray(state?.evidence)) {
    const blob = `${text(evidence?.summary)} ${text(evidence?.path)}`;
    if (!AUTH_RE.test(blob)) continue;
    addAuthFlow(authKind(blob), matchingEndpoint(endpoints, blob), [text(evidence?.id)].filter(Boolean), `evidence:${evidence?.id}`);
  }

  const order = new Map(apps.map((item, index) => [item.id, index]));
  return {
    apps: uniqueBy(apps, (item) => item.value.toLowerCase()).sort((a, b) => (order.get(a.id) || 0) - (order.get(b.id) || 0)),
    endpoints,
    params: params.sort((a, b) => a.id.localeCompare(b.id)),
    authFlows: authFlows.sort((a, b) => a.id.localeCompare(b.id)),
    updatedAt: Number(now) || Date.now()
  };
}

export function summarizeTargetMap(value) {
  const map = normalizeTargetMap(value);
  return {
    apps: map.apps.length,
    endpoints: map.endpoints.length,
    untestedEndpoints: map.endpoints.filter((item) => item.tested !== true).length,
    params: map.params.length,
    authFlows: map.authFlows.length
  };
}
