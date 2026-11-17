/**
 * Phase 3 structured scope helpers.
 *
 * The canonical in-scope/excluded targets live in goal.targets /
 * goal.excludedTargets. The legacy goal.target string is only a compatibility
 * fallback when no structured targets were recorded yet.
 */

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i
const URL_RE = /https?:\/\/[^\s<>"'）)】\]，,。；;]+/gi
const IP_PORT_RE = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g
const DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?::\d{1,5})?\b/gi
const FILE_EXT = /\.(?:json|md|txt|py|js|mjs|ts|tsx|html?|php|xml|ya?ml|log|csv|zip|png|jpe?g|gif|exe|dll|docx?|xlsx?|pptx?|pdf|sh|ps1|bat|cmd|go|rs|java|c|cpp|h|conf|ini|env)$/i

// Public read-only research sources. Target scoping must not block OSINT:
// looking up a fingerprint on grep.app is not traffic to the engagement target.
const RESEARCH_HOSTS = [
  'github.com', 'gitee.com', 'grep.app', 'raw.githubusercontent.com',
  'google.com', 'bing.com', 'duckduckgo.com', 'search.brave.com',
  'stackoverflow.com', 'npmjs.com', 'pypi.org', 'crates.io', 'hub.docker.com',
  'nvd.nist.gov', 'cve.mitre.org', 'exploit-db.com', 'packetstormsecurity.com',
  'vulners.com', 'hacktricks.xyz', 'portswigger.net', 'owasp.org', 'docs.rs'
]

export function isResearchHost(host) {
  const value = String(host || '').toLowerCase()
  return RESEARCH_HOSTS.some((entry) => value === entry || value.endsWith(`.${entry}`))
}

export function hostPortOf(value) {
  const raw = String(value ?? '').trim()
  if (raw === '') return null
  let candidate = raw
  if (!/^https?:\/\//i.test(candidate)) candidate = `http://${candidate}`
  try {
    const url = new URL(candidate)
    // PowerShell interpolates "$p" into double-quoted URLs; the literal
    // hostname then contains "$p" and was treated as an out-of-scope host.
    const host = String(url.hostname || '').toLowerCase().replace(/\$.*$/, '')
    if (host === '') return null
    const isIpv6 = /^\[[0-9a-f:]+\]$/i.test(host)
    if (!isIpv6 && host !== 'localhost' && !IPV4.test(host) && !DOMAIN.test(host)) return null
    const port = url.port !== '' ? String(url.port) : (url.protocol === 'https:' ? '443' : '80')
    return { host, port, protocol: url.protocol.replace(':', '') }
  } catch {
    return null
  }
}

/**
 * Normalize an explicit scope entry. Supports:
 *   https://app.example.com:8443/path
 *   app.example.com:8443
 *   10.0.0.1
 *   *.example.com
 */
export function normalizeScopeEntry(value) {
  let raw = String(value ?? '').trim().toLowerCase()
  if (raw === '') return null
  raw = raw.replace(/[.,;!?，。；]+$/, '')
  let wildcard = false
  if (raw.startsWith('*.')) {
    wildcard = true
    raw = raw.slice(2)
  }
  const explicitPort = /:\d{1,5}(?:[/?#]|$)/.test(raw)
  const parsed = hostPortOf(raw)
  if (!parsed) return null
  const isLocal = parsed.host === 'localhost'
  if (!wildcard && !isLocal && !IPV4.test(parsed.host) && !DOMAIN.test(parsed.host)) return null
  return { host: parsed.host, port: explicitPort ? parsed.port : '', wildcard }
}

/** Extract explicit entries from a goal.target free-text string. */
export function extractScopeEntries(text) {
  const source = String(text ?? '')
  const found = []
  const add = (value) => {
    const entry = normalizeScopeEntry(value)
    if (!entry) return
    if (!found.some((item) => item.host === entry.host && item.port === entry.port && item.wildcard === entry.wildcard)) found.push(entry)
  }
  for (const url of source.match(URL_RE) || []) add(url)
  for (const ip of source.match(IP_PORT_RE) || []) add(ip)
  for (const domain of source.match(DOMAIN_RE) || []) {
    if (FILE_EXT.test(domain)) continue
    add(domain)
  }
  return found
}

function normalizeEntryList(value) {
  const list = Array.isArray(value) ? value : (value === undefined || value === null || value === '' ? [] : [value])
  const out = []
  for (const item of list) {
    const entry = normalizeScopeEntry(item)
    if (entry && !out.some((x) => x.host === entry.host && x.port === entry.port && x.wildcard === entry.wildcard)) out.push(entry)
  }
  return out
}

export function goalScope(goal) {
  const targets = normalizeEntryList(goal?.targets)
  const excludedTargets = normalizeEntryList(goal?.excludedTargets)
  return {
    targets: targets.length > 0 ? targets : extractScopeEntries(goal?.target),
    excludedTargets,
    structured: targets.length > 0
  }
}

function entryMatchesHost(entry, host, port) {
  if (entry.wildcard) {
    if (host !== entry.host && !host.endsWith(`.${entry.host}`)) return false
  } else if (entry.host !== host) return false
  if (entry.port !== '' && String(entry.port) !== String(port)) return false
  return true
}

/**
 * @returns {{allowed:boolean, host:string, port:string, reason:string}}
 */
export function checkNetworkTarget(goal, value, options = {}) {
  const parsed = hostPortOf(value)
  if (!parsed) return { allowed: false, host: '', port: '', reason: '无法解析目标 host' }
  const scope = goalScope(goal)
  const excluded = scope.excludedTargets.find((entry) => entryMatchesHost(entry, parsed.host, parsed.port))
  if (excluded) {
    return { allowed: false, host: parsed.host, port: parsed.port, reason: `host ${parsed.host}:${parsed.port} 在 excludedTargets 中` }
  }
  if (options.allowResearch === true && isResearchHost(parsed.host)) {
    return { allowed: true, host: parsed.host, port: parsed.port, reason: '', research: true }
  }
  if (scope.targets.length === 0) {
    return { allowed: false, host: parsed.host, port: parsed.port, reason: 'goal 没有结构化 scope targets，禁止未授权网络目标' }
  }
  const matched = scope.targets.find((entry) => entryMatchesHost(entry, parsed.host, parsed.port))
  if (!matched) {
    return { allowed: false, host: parsed.host, port: parsed.port, reason: `host ${parsed.host}:${parsed.port} 不在 in-scope targets 中` }
  }
  return { allowed: true, host: parsed.host, port: parsed.port, reason: '', matched }
}

/** Extract all URL/host candidates from a shell command or tool argument. */
export function networkCandidatesFrom(text) {
  const source = String(text ?? '')
  const out = []
  const add = (value) => {
    const parsed = hostPortOf(value)
    if (!parsed) return
    const id = `${parsed.host}:${parsed.port}`
    if (!out.some((item) => item.id === id)) out.push({ id, value, ...parsed })
  }
  for (const url of source.match(URL_RE) || []) add(url)
  // curl/wget hosts without scheme. The command token itself (curl.exe) also
  // looks like a domain, so it must be excluded before host matching.
  const bare = source.match(/(?:curl(?:\.exe)?|wget(?:\.exe)?|Invoke-WebRequest|Invoke-RestMethod)[^\n]*?\s(?:-H\s+\S+\s+)?([a-z0-9._:[\]-]+)/gi) || []
  const COMMAND_TOKEN = /^(?:curl|wget|invoke-webrequest|invoke-restmethod)(?:\.exe)?$/i
  const HOST_TOKEN = /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,24})(?::\d{1,5})?$/i
  for (const match of bare) {
    const parts = match.split(/\s+/)
      .map((part) => part.replace(/^["']|["']$/g, ''))
      .filter((part) => part !== ''
        && !part.startsWith('-')
        && !part.startsWith('$')
        && !/\.exe$/i.test(part)
        && !COMMAND_TOKEN.test(part))
    const candidate = parts.find((part) => HOST_TOKEN.test(part))
    if (candidate) add(candidate)
  }
  return out
}

/** Destructive HTTP mutation detection. Default-denies production update/delete. */
export function isDestructiveRequest(text) {
  const source = String(text ?? '')
  if (!/\b(?:curl(?:\.exe)?|Invoke-WebRequest|Invoke-RestMethod|wget(?:\.exe)?|fetch|requests\.)\b|(?:^|\s)(?:PATCH|PUT|DELETE)\s+/i.test(source)) return false
  if (/(?:-X|--request)\s*(?:DELETE|PUT|PATCH)|\b(?:Method|HttpMethod)\s*[:=]?\s*['"]?(?:Delete|Put|Patch)\b/i.test(source)) return true
  if (/\b(?:DELETE|PUT|PATCH)\s+https?:\/\//i.test(source)) return true
  if (/(?:[?&](?:act|action|op|cmd|method)=(?:update|edit|modify|set|rename|import|merge|move|publish|unpublish|reset|clear|delete|del|remove|drop|truncate)\b|\/(?:update|edit|modify|set|rename|import|merge|delete|del|remove|drop|truncate)(?:[/?&]|$))/i.test(source)) return true
  return false
}

export function userAllowsMutation(text) {
  const source = String(text ?? '')
  if (source === '') return false
  if (/(?:不要|别|禁止|不得|不能|勿)[^。\n]{0,20}(?:修改|更新|删除|写入|清空|改数据)/i.test(source)) return false
  return /(?:允许|可以|授权|请|直接|需要)[^。\n]{0,30}(?:修改|更新|删除|写入|清空|改数据)|测试数据|新增的数据/i.test(source)
}
