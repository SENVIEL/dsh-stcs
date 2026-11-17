/**
 * P0-4 engagement-level HTTP traffic index.
 *
 * ARTEX records every MITM exchange into an FTS5 index so a later worker can
 * search historical responses for secrets, stack traces, internal IPs or
 * hidden endpoints. DSH v4 workers each wrote their own evidence files and
 * nothing could query across them.
 *
 * This module mirrors trace.js: a separate storage domain, one bounded
 * append-only row per session, pure add/search helpers, deduplicated and
 * hashed. It never reads the network; callers feed already-captured bytes.
 */
import crypto from 'node:crypto';

export const TRAFFIC_VERSION = 1;
export const MAX_TRAFFIC_RECORDS = 600;
export const MAX_TRAFFIC_BODY = 64 * 1024;
export const MAX_TRAFFIC_URL = 2048;
export const MAX_TRAFFIC_QUERY = 256;
export const TRAFFIC_ROLES = ['baseline', 'proof', 'verification', 'supporting', 'counter', 'untagged'];

function text(value, max = Number.MAX_SAFE_INTEGER) {
  const out = value === undefined || value === null ? '' : String(value);
  return out.length > max ? out.slice(0, max) : out;
}

function hash(value) {
  return crypto.createHash('sha256').update(text(value)).digest('hex');
}

function clampInt(value, fallback, min, max) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function emptyRecord(sessionId, now = Date.now()) {
  return { version: TRAFFIC_VERSION, sessionId, revision: 0, counter: 0, updatedAt: now, records: [] };
}

function normalizeRecord(row, sessionId) {
  if (!row || typeof row !== 'object') return emptyRecord(sessionId);
  const records = Array.isArray(row.records) ? row.records.filter((r) => r && typeof r === 'object') : [];
  return {
    version: TRAFFIC_VERSION,
    sessionId: text(row.sessionId || sessionId),
    revision: Math.max(0, Number(row.revision) || 0),
    counter: Math.max(records.length, Number(row.counter) || 0),
    updatedAt: Number(row.updatedAt) || 0,
    records: records.slice(-MAX_TRAFFIC_RECORDS).map((r) => ({
      ...r,
      body: text(r.body, MAX_TRAFFIC_BODY),
      role: TRAFFIC_ROLES.includes(r.role) ? r.role : 'untagged'
    }))
  };
}

function hostOf(rawUrl, fallbackHost = '') {
  const value = text(rawUrl).trim();
  if (!value) return text(fallbackHost);
  try {
    return new URL(value).host;
  } catch {
    const m = value.match(/^https?:\/\/([^/\s]+)/i);
    return m ? m[1] : text(fallbackHost);
  }
}

/**
 * Normalise one captured exchange into an indexable row.
 * Accepts either structured fields or a raw HTTP request/response transcript.
 */
export function normalizeTraffic(input = {}, now = Date.now()) {
  const method = text(input.method || 'GET', 16).toUpperCase();
  const url = text(input.url || input.path, MAX_TRAFFIC_URL).trim();
  const host = text(input.host || hostOf(url), 256).trim();
  const status = Number(input.status) > 0 ? Math.round(Number(input.status)) : 0;
  let body = text(input.body, MAX_TRAFFIC_BODY);
  // A raw transcript may carry "HTTP/1.1 200 ...\r\n\r\n<body>" or a request
  // line; extract status and body when structured fields were not supplied.
  const raw = text(input.raw, MAX_TRAFFIC_BODY * 2);
  let derivedUrl = url;
  let derivedMethod = method;
  let derivedStatus = status;
  if (raw) {
    if (!derivedStatus) derivedStatus = statusMatchCode(raw);
    if (!body) {
      const sep = raw.search(/\r?\n\r?\n/);
      if (sep >= 0) body = raw.slice(sep + (raw.slice(sep).startsWith('\r\n\r\n') ? 4 : 2));
    }
    if (!derivedUrl) {
      const reqLine = raw.match(/^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)/im);
      if (reqLine) {
        derivedMethod = reqLine[1];
        derivedUrl = reqLine[2];
      }
    }
  }
  // A bare response transcript without a URL/Host is still indexable by body.
  if (!derivedUrl && !host && !body && !raw) fail('traffic/empty', 'traffic record requires url, host, body or raw');
  const resolvedHost = host || '(unknown)';
  const role = TRAFFIC_ROLES.includes(input.role) ? input.role : 'untagged';
  const headers = input.headers && typeof input.headers === 'object' && !Array.isArray(input.headers)
    ? Object.fromEntries(Object.entries(input.headers).slice(0, 64).map(([k, v]) => [text(k, 128), text(v, 1024)]))
    : {};
  return {
    method: derivedMethod,
    url: derivedUrl,
    host: resolvedHost,
    status: derivedStatus,
    headers,
    body,
    role,
    taskId: text(input.taskId, 160),
    workerId: text(input.workerId, 160),
    evidenceId: text(input.evidenceId, 160),
    findingId: text(input.findingId, 160),
    summary: text(input.summary, 400).trim() || `${method} ${url || host} ${status || ''}`.trim(),
    at: now
  };
}

function statusMatchCode(raw) {
  const m = text(raw).match(/HTTP\/\d(?:\.\d)?\s+(\d{3})/i);
  return m ? Number(m[1]) : 0;
}

/** Append one normalised traffic row to a session record (pure). */
export function addTrafficRecord(record, input = {}, now = Date.now()) {
  const current = normalizeRecord(record, text(input.sessionId));
  const sessionId = text(input.sessionId || current.sessionId);
  if (!sessionId) fail('traffic/session', 'traffic sessionId required');
  const row = normalizeTraffic({ ...input, sessionId }, now);
  const digest = hash([row.method, row.url, row.host, row.status, row.body, row.role].join('\u0000'));
  const existing = current.records.find((item) => item.digest === digest);
  if (existing) return { record: current, item: existing, reused: true };
  const counter = current.counter + 1;
  const item = { id: `traffic-${counter}`, ...row, digest };
  const records = current.records.concat(item);
  if (records.length > MAX_TRAFFIC_RECORDS) records.splice(0, records.length - MAX_TRAFFIC_RECORDS);
  return {
    record: { ...current, revision: current.revision + 1, counter, updatedAt: now, records },
    item,
    reused: false
  };
}

/**
 * Search historical responses. `body_contains` is a case-insensitive literal
 * substring match over the response body (plus summary/url), which is what
 * "search for a secret / stack trace / internal IP" needs.
 */
export function searchTraffic(record, options = {}) {
  const current = normalizeRecord(record, text(options.sessionId));
  const bodyContains = text(options.body_contains || options.bodyContains, MAX_TRAFFIC_QUERY).toLowerCase();
  const urlContains = text(options.url_contains || options.urlContains, MAX_TRAFFIC_QUERY).toLowerCase();
  const host = text(options.host, 256).toLowerCase();
  const status = Number(options.status) > 0 ? Math.round(Number(options.status)) : 0;
  const method = text(options.method, 16).toUpperCase();
  const role = text(options.role, 40);
  const taskId = text(options.taskId, 160);
  const excludeTaskId = text(options.excludeTaskId, 160);
  const limit = clampInt(options.limit, 20, 1, 100);
  let items = current.records;
  if (host) items = items.filter((item) => text(item.host).toLowerCase().includes(host));
  if (urlContains) items = items.filter((item) => text(item.url).toLowerCase().includes(urlContains));
  if (status) items = items.filter((item) => Number(item.status) === status);
  if (method) items = items.filter((item) => text(item.method).toUpperCase() === method);
  if (role) items = items.filter((item) => item.role === role);
  if (taskId) items = items.filter((item) => item.taskId === taskId);
  if (excludeTaskId) items = items.filter((item) => item.taskId !== excludeTaskId);
  if (bodyContains) {
    items = items.filter((item) => [item.body, item.summary, item.url]
      .some((value) => text(value).toLowerCase().includes(bodyContains)));
  }
  const total = items.length;
  const selected = items.slice(-limit).map((item) => ({
    id: item.id, method: item.method, url: item.url, host: item.host, status: item.status,
    role: item.role, taskId: item.taskId, evidenceId: item.evidenceId, findingId: item.findingId,
    summary: item.summary,
    snippet: (() => {
      const hay = `${item.body}`;
      const at = bodyContains ? hay.toLowerCase().indexOf(bodyContains) : -1;
      if (at < 0) return text(item.summary || hay, 320);
      const start = Math.max(0, at - 100);
      return `${start > 0 ? '…' : ''}${hay.slice(start, at + bodyContains.length + 160)}…`;
    })()
  }));
  return { total, returned: selected.length, hasMore: total > selected.length, items: selected };
}

export function trafficStats(record) {
  const current = normalizeRecord(record, '');
  const byHost = new Map();
  const byStatus = new Map();
  const byRole = new Map();
  for (const item of current.records) {
    byHost.set(item.host || '(none)', (byHost.get(item.host || '(none)') || 0) + 1);
    byStatus.set(String(item.status || 0), (byStatus.get(String(item.status || 0)) || 0) + 1);
    byRole.set(item.role || 'untagged', (byRole.get(item.role || 'untagged') || 0) + 1);
  }
  return {
    revision: current.revision,
    records: current.records.length,
    updatedAt: current.updatedAt,
    byHost: Object.fromEntries(byHost),
    byStatus: Object.fromEntries(byStatus),
    byRole: Object.fromEntries(byRole)
  };
}

/** Same table adapter shape as createTraceStore. */
export function createTrafficStore({ table, now = () => Date.now() }) {
  if (!table || typeof table.get !== 'function' || typeof table.put !== 'function') {
    throw new Error('traffic store requires get/put table');
  }
  const chains = new Map();
  const load = async (sessionId) => normalizeRecord(await table.get(sessionId), sessionId);
  const save = async (sessionId, record) => { await table.put(sessionId, record); };
  const requireSession = (id) => {
    const value = text(id);
    if (!value) fail('traffic/session', 'traffic sessionId required');
    return value;
  };
  const enqueue = (sessionId, operation) => {
    const previous = chains.get(sessionId) ?? Promise.resolve();
    const current = previous.then(operation, operation);
    chains.set(sessionId, current.then(() => {}, () => {}));
    return current;
  };
  return {
    async record(sessionId, input) {
      const id = requireSession(sessionId);
      return enqueue(id, async () => {
        const current = await load(id);
        const out = addTrafficRecord(current, { ...input, sessionId: id }, now());
        if (!out.reused) await save(id, out.record);
        return { item: out.item, reused: out.reused, revision: out.record.revision };
      });
    },
    async search(sessionId, options = {}) {
      const id = requireSession(sessionId);
      return searchTraffic(await load(id), { ...options, sessionId: id });
    },
    async stats(sessionId) {
      const id = requireSession(sessionId);
      return trafficStats(await load(id));
    }
  };
}
