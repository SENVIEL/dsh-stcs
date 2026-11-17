/**
 * v4 asset inventory helpers.
 *
 * v4 keeps its own canonical `assets` collection.  The UI and the v3
 * compatibility layer both count that collection, so it must be populated
 * from the engagement goal even before a worker discovers anything.
 *
 * Asset values are deliberately stable, human-readable strings:
 *   root-domain  example.com
 *   subdomain    app.example.com
 *   ip           203.0.113.10
 *   app          https://app.example.com
 *   service      app.example.com:8443
 *   endpoint     POST /api/v1/upload
 */

export const ASSET_TYPES = ['root-domain', 'subdomain', 'ip', 'service', 'app', 'endpoint'];

const MULTI_LEVEL_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
  'com.cn', 'net.cn', 'org.cn', 'gov.cn',
  'com.hk', 'org.hk', 'com.tw', 'com.au', 'co.jp', 'co.kr',
  'com.sg', 'com.br', 'com.mx', 'com.tr'
]);

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const HOST_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function normalizeAssetType(value) {
  const raw = String(value == null ? '' : value).trim().toLowerCase();
  const aliases = {
    domain: 'root-domain',
    'root-domain': 'root-domain',
    root: 'root-domain',
    host: 'subdomain',
    hostname: 'subdomain',
    subdomain: 'subdomain',
    ip: 'ip',
    ipv4: 'ip',
    service: 'service',
    port: 'service',
    app: 'app',
    application: 'app',
    url: 'app',
    endpoint: 'endpoint',
    api: 'endpoint'
  };
  return aliases[raw] || '';
}

function normalizeHost(value) {
  return String(value == null ? '' : value).trim().toLowerCase().replace(/\.$/, '');
}

function isIpv4(host) {
  if (!IPV4_RE.test(host)) return false;
  return host.split('.').every((part) => Number(part) >= 0 && Number(part) <= 255);
}

function rootDomainOf(host) {
  const labels = normalizeHost(host).split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  const suffix = labels.slice(-2).join('.');
  return labels.slice(MULTI_LEVEL_SUFFIXES.has(suffix) ? -3 : -2).join('.');
}

function addItem(map, type, value, meta, source) {
  const normalizedType = normalizeAssetType(type);
  const normalizedValue = String(value == null ? '' : value).trim();
  if (!normalizedType || !normalizedValue) return;
  const key = `${normalizedType}\u0000${normalizedValue.toLowerCase()}`;
  if (map.has(key)) return;
  map.set(key, {
    type: normalizedType,
    value: normalizedValue,
    meta: meta || `source:${source}`
  });
}

function parseTarget(raw, map, source) {
  let value = String(raw == null ? '' : raw).trim();
  if (!value) return;
  if (value.startsWith('*.')) {
    const host = normalizeHost(value.slice(2));
    if (HOST_RE.test(host)) addItem(map, 'root-domain', rootDomainOf(host), 'source:goal', source);
    return;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const host = normalizeHost(url.hostname);
      if (!host) return;
      const port = url.port ? Number(url.port) : 0;
      if (isIpv4(host)) addItem(map, 'ip', host, 'source:goal', source);
      else {
        addItem(map, 'root-domain', rootDomainOf(host), 'source:goal', source);
        if (host !== rootDomainOf(host)) addItem(map, 'subdomain', host, 'source:goal', source);
      }
      addItem(map, 'app', `${url.protocol}//${host}${port ? `:${port}` : ''}`, 'source:goal', source);
      if (port && !((url.protocol === 'http:' && port === 80) || (url.protocol === 'https:' && port === 443))) {
        addItem(map, 'service', `${host}:${port}`, 'source:goal', source);
      }
      return;
    } catch {
      return;
    }
  }

  if (isIpv4(value)) {
    addItem(map, 'ip', value, 'source:goal', source);
    return;
  }

  const hostPort = value.match(/^([^:/\s]+):(\d{1,5})$/);
  if (hostPort) {
    const host = normalizeHost(hostPort[1]);
    if (isIpv4(host)) addItem(map, 'ip', host, 'source:goal', source);
    else if (HOST_RE.test(host)) {
      addItem(map, 'root-domain', rootDomainOf(host), 'source:goal', source);
      if (host !== rootDomainOf(host)) addItem(map, 'subdomain', host, 'source:goal', source);
    }
    addItem(map, 'service', `${host}:${hostPort[2]}`, 'source:goal', source);
    return;
  }

  const host = normalizeHost(value);
  if (!HOST_RE.test(host)) return;
  addItem(map, 'root-domain', rootDomainOf(host), 'source:goal', source);
  if (host !== rootDomainOf(host)) addItem(map, 'subdomain', host, 'source:goal', source);
}

function addFacts(map, textValue, source) {
  const body = String(textValue == null ? '' : textValue);
  if (!body) return;
  const endpointRe = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)/gi;
  for (const match of body.matchAll(endpointRe)) {
    const method = match[1].toUpperCase();
    const endpoint = `${method} ${match[2].replace(/[.,;:]+$/, '')}`;
    addItem(map, 'endpoint', endpoint, 'source:fact', source);
  }
}

/**
 * Derive the initial inventory from the goal and any facts/findings already
 * present.  It intentionally uses only structured target fields and explicit
 * HTTP-method/path tokens in facts: guessing hostnames from prose creates
 * noisy false assets.
 */
export function deriveAssetsFromState(state) {
  const map = new Map();
  const goal = state?.goal || {};
  for (const target of [goal.target, ...(Array.isArray(goal.targets) ? goal.targets : [])]) {
    parseTarget(target, map, 'goal');
  }
  for (const fact of (Array.isArray(state?.facts) ? state.facts : [])) {
    addFacts(map, fact?.answer, 'fact');
    addFacts(map, fact?.detail, 'fact');
  }
  for (const finding of (Array.isArray(state?.findings) ? state.findings : [])) {
    for (const asset of (Array.isArray(finding?.affectedAssets) ? finding.affectedAssets : [])) {
      parseTarget(asset, map, 'finding');
    }
  }
  return [...map.values()];
}

export function isKnownAssetType(value) {
  return ASSET_TYPES.includes(normalizeAssetType(value));
}
