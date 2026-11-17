/**
 * DSH pentest v2 — plugin entry.
 *
 * 只注册“写 state + 读 state + 快照投影”的工具。
 * 调度、spawn、report 在下一层 adapter 接入；本文件不直接 spawn。
 */

import { defineTool } from '@deepseek-ai/dsh-tools';
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';
import crypto from 'node:crypto';
import { createHandlers } from './handlers.js';
import { createDshStateStore } from './dsh-store.js';
import { V4Session } from './v4/session.js';
import { reduceV4 } from './v4/reduce.js';
import { V4Dispatcher } from './v4/dispatch.js';
import { TeamRoleRunner, CORE_ROLE_NAMES } from './v4/roles.js';
import { renderV4Report } from './v4/report.js';
import { validateReportMarkdown, parseReportGaps } from './v4/report-template.js';
import { writeV4Docx } from './v4/docx.js';
import { deriveCoverageFindings, enrichFindingsFromEvidence } from './v4/finding-fields.js';
import { ASSET_TYPES } from './v4/assets.js';
import { redLineReason, normalizeAuthorization, auditStateOf, isHumanGoalCommand, RED_LINE, AUTHORIZATION_POLICY } from './v4/policy.js';
import { platformGuardReason } from './v4/authorization.js';
import { hasAuditorReproduction, latestValidationFor } from './v4/validations.js';
import { normalizeDedupeKey } from './v4/dedupe.js';
import { selectAuditCandidates } from './v4/audit.js';
import { evidenceVersion, verifyReportEvidenceRoles, evidenceByRole, reportEvidenceStatus } from './v4/evidence-version.js';
import { planV4, isLeadOnlyDirection } from './v4/plan.js';
import { createTraceStore } from './trace.js';
import { createTrafficStore, normalizeTraffic } from './traffic.js';
import { buildApiRecon } from './v4/api-recon.js';
import { buildCheckpoint, selectResumeCandidates } from './v4/checkpoint.js';
import { deriveCoverage, untestedDirections } from './v4/coverage-derived.js';
import { evaluateRetest, aggregateRetests, RETEST_VERDICTS } from './v4/retest.js';
import { createAssetGraphStore, scopeKeyForTarget } from './asset-graph.js';
import { exportEvidence, verifyEvidenceExport } from './evidence-store.js';
import { buildPlan } from './planner.js';
import { applySnapshot, jsonSafe, toProjection } from './projection.js';
import { readLegacyState } from './legacy.js';
import { extractRelayedMessages } from './team-bridge.js';
import {
  checkNetworkTarget,
  isDestructiveRequest,
  networkCandidatesFrom,
  userAllowsMutation
} from './scope.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { openSharedDomain } from './domain-open.js';

export const name = 'pentest-v2';
export const inject = ['tools', 'storageDomain', 'sessions'];

// STCS additive facade handoff for the companion `dsh-pentest-v2/artex` row.
// A preset plugin that provides a Cordis service must isolate that service in
// a realm shared by the provider and every consumer; a third-party bundle
// cannot guarantee that, and leaking `pentestV4` into the preset's root realm
// makes the whole preset unmountable. Both rows run in one Host process, so a
// process-global symbol carries the facade even when the profile resolves the
// package through two physical copies (node_modules and .vendor).
const PENTEST_V4_FACADE = Symbol.for('dsh-pentest-v2.pentestV4Facade');

export function getPentestV4Facade() {
  const facade = globalThis[PENTEST_V4_FACADE];
  return facade && typeof facade.getSession === 'function' ? facade : null;
}

// Synchronous goal cache for context-free hard guards. Populated from
// pentest_add_goal (custom execute) and from every ensure/state read.
const pentestGoals = new Map();

function rememberPentestGoal(sessionId, goal) {
  if (!sessionId || !goal) return;
  const workdir = String(goal.workdir || '').trim();
  if (workdir === '') return;
  pentestGoals.set(sessionId, {
    target: String(goal.target || ''),
    targets: Array.isArray(goal.targets) ? goal.targets : [],
    excludedTargets: Array.isArray(goal.excludedTargets) ? goal.excludedTargets : [],
    authorization: String(goal.authorization || ''),
    workdir
  });
}
function tool(definition) {
  const execute = definition.execute;
  return defineTool({
    ...definition,
    parameters: definition.parameters || {},
    execute: async (...args) => jsonSafe(await execute(...args)),
    output: definition.output ?? {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }]
    }
  });
}

const domainSpec = defineDomain({
  name: 'stcs_v2',
  version: 1,
  tables: { states: domainTable(z.any()) }
});

// v4 is a separate domain: the v3 store stays readable and untouched, and a
// schema/version mismatch in one domain can never block the other.
const v4Spec = defineDomain({
  name: 'stcs_v4',
  version: 1,
  tables: { states: domainTable(z.any()) }
});

const legacySpec = defineDomain({
  name: 'stcs_legacy',
  version: 2,
  tables: {
    goals: domainTable(z.any()),
    intents: domainTable(z.any()),
    facts: domainTable(z.any()),
    findings: domainTable(z.any()),
    assets: domainTable(z.any()),
    edges: domainTable(z.any()),
    digests: domainTable(z.any()),
    queue: domainTable(z.any())
  }
});

// Trace is deliberately a separate domain: worker-process logs must never
// inflate the canonical graph snapshot or the UI projection.
const traceSpec = defineDomain({
  name: 'pentest_trace',
  version: 1,
  tables: { sessions: domainTable(z.any()) }
});

// P0-4: engagement-level searchable HTTP traffic is separate from both the
// canonical graph and the worker trace, so a 600-row index never inflates a
// UI snapshot or a session projection.
const trafficSpec = defineDomain({
  name: 'pentest_traffic',
  version: 1,
  tables: { sessions: domainTable(z.any()) }
});

// Global asset truth is intentionally separate from per-session state. It is
// the DSH analogue of ARTEX's asset graph; anchors connect it to directions,
// facts and findings without coupling the two graphs' write paths.
const assetGraphSpec = defineDomain({
  name: 'pentest_asset_graph',
  version: 1,
  tables: { graph: domainTable(z.any()) }
});

function rootGraphSessionIdOf(exec, sessions) {
  if (!exec?.agent) throw new Error('pentest_* tools require an owning agent session');
  let session = exec.agent.session;
  const seen = new Set();
  while (session && typeof session.header?.parentSession === 'string' && session.header.parentSession !== '') {
    const sessionId = session.id || session.header?.id;
    if (sessionId) seen.add(sessionId);
    const parentId = session.header.parentSession;
    if (seen.has(parentId)) break;
    const parent = typeof sessions?.get === 'function' ? sessions.get(parentId) : undefined;
    if (parent?.header) {
      session = parent;
      continue;
    }
    return parentId;
  }
  return session?.id || session?.header?.id;
}

/**
 * 每个渗透会话必须有独立工作目录：<base>/<target-slug>_<session-short>/
 * - 模型给 workdir 时以它为 base；没给时用会话 cwd；
 * - base 已经带 session 短 id 或 target slug 时原样使用；
 * - 这样 3 个会话不会再共用同一个 Szwater 根目录。
 */
function shortSession(sessionId) {
  return String(sessionId || '').replace(/^session-/, '').slice(0, 8) || 'unknown';
}

function ensureWorkdir(cwd, target, workdir, sessionId) {
  const requested = String(workdir || '').trim();
  const base = requested !== '' ? requested : String(cwd || '').trim();
  if (base === '') return '';
  const slug = autoGoalDirName(target) || 'engagement';
  const suffix = shortSession(sessionId);
  const leaf = slug + '_' + suffix;
  const normalized = path.normalize(base);
  const baseName = path.basename(normalized);
  if (baseName.includes(suffix)) return normalized;
  return path.join(normalized, leaf);
}

/** Create the standard workspace layout before the model writes anything. */
export function ensureWorkspaceLayout(workdir) {
  const raw = String(workdir || '').trim();
  if (raw === '') return [];
  const dir = path.isAbsolute(raw) ? raw : path.resolve(raw);
  const created = [];
  try {
    fs.mkdirSync(dir, { recursive: true });
    for (const name of ['recon', 'evidence', 'reports', 'scripts']) {
      const target = path.join(dir, name);
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
        created.push(target);
      }
    }
  } catch {
    return created;
  }
  return created;
}

/** 生成/补齐 SCOPE.md（授权与红线）。这是旧版 pentest_open 的产物，v2 迁移时漏掉了。 */
function ensureScopeFile({ cwd, workdir, target, objective, authorization, targets = [], excludedTargets = [], force = false }) {
  const raw = String(workdir || '').trim();
  if (raw === '') return '';
  const dir = path.isAbsolute(raw) ? raw : path.join(String(cwd || process.cwd()), raw);
  const scopePath = path.join(dir, 'SCOPE.md');
  try {
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(scopePath) && !force) return scopePath;
    const lines = [
      '# SCOPE — 授权与红线',
      '',
      '<!-- generated from pentest state; state.goal.targets/excludedTargets is canonical -->',
      '',
      '## 授权',
      '- 授权记录：' + (String(authorization || '') || '未记录（红线缺失，禁止交付）'),
      '- 目标：' + (targets.length > 0 ? targets.join('、') : String(target || '')),
      '- 目的：' + String(objective || ''),
      '- 生成时间：' + new Date().toISOString(),
      '',
      '## 范围（结构化，来自 state）',
      '- in-scope：' + (targets.length > 0 ? targets.join('、') : '（由 goal.target 兜底解析）'),
      '- excluded：' + (excludedTargets.length > 0 ? excludedTargets.join('、') : '（无）'),
      '',
      '## 工作区结构',
      '- `recon/`：目标侦察脚本、静态资源、接口/路由枚举结果',
      '- `evidence/`：请求响应、截图、下载文件、hash 与证据索引',
      '- `scripts/`：本次会话新增的自动化脚本',
      '- `reports/`：报告与交付物',
      '- 所有测试过程生成的文件必须放在本工作区内，禁止使用旧目录或外部工具包目录。',
      '',
      '## 红线（用户唯一红线）',
      `- ${RED_LINE}`,
      '- 测试产物写入本目录，不写系统临时目录。',
      ''
    ];
    fs.writeFileSync(scopePath, lines.join('\n'), 'utf8');
    return scopePath;
  } catch {
    return '';
  }
}

const WORKDIR_PARAM = { type: 'string', description: 'Evidence/report workspace. Lead should pass an absolute path.' };

function resolveModelPath(cwd, raw) {
  const value = String(raw || '').trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  if (value === '') return '';
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(String(cwd || process.cwd()), value);
}

function isInsideRoot(root, candidate) {
  const r = path.normalize(path.resolve(root));
  const c = path.normalize(path.resolve(candidate));
  const rel = path.relative(r, c);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}

function parseToolArgs(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return {};
}

function latestUserTextOf(exec) {
  try {
    const session = exec && exec.agent && exec.agent.session;
    if (!session || typeof session.snapshotEvents !== 'function') return '';
    const events = session.snapshotEvents() || [];
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const ev = events[i];
      if (!ev || ev.type !== 'user/message') continue;
      const data = ev.data || {};
      if ((data.source || {}).kind !== 'user') continue;
      const parts = Array.isArray(data.content) ? data.content : [];
      return parts.map((part) => (part && typeof part.text === 'string' ? part.text : '')).join('\n').trim();
    }
  } catch { /* ignore */ }
  return '';
}

function userNegatesGoalTermination(text) {
  return /(?:不要|不用|别|无需|不准|禁止|永不|绝不|不允许|不能).{0,16}(?:结束|终止|停止|暂停|标记|block|complete|pause|stop)/i.test(String(text || ''));
}

// Goal lifecycle is decided ONLY by policy.js (isHumanGoalCommand). No local
// regex copies: duplicated human-command detection is what let injected
// <sidecar_planner>/<goal_round> messages pass as "the user said stop".
function userExplicitlyEndsGoal(text) { return isHumanGoalCommand(text, 'complete'); }
function userExplicitlyPausesGoal(text) { return isHumanGoalCommand(text, 'pause'); }

function userAllowsOutside(text, target) {
  const raw = String(text || '');
  if (raw === '') return false;
  const outsideWords = '根目录|外部|工作目录外|系统临时目录|桌面|下载目录|用户目录';
  if (new RegExp('(?:不要|别|禁止|不得|不能|勿).{0,24}(?:' + outsideWords + ')', 'i').test(raw)) return false;
  // A bare path appearing in the prompt is not permission: the model often
  // echoes the requested path back. Require an explicit "allow/please write
  // outside" phrase instead. Merely naming a Desktop/system path must not
  // open the boundary.
  return new RegExp('(?:允许|可以|请|直接|把|将)[^。\\n]{0,30}(?:写|放|保存|输出|生成)[^。\\n]{0,24}(?:' + outsideWords + ')|(?:写到|放到|保存到|输出到|生成到)\\s*(?:' + outsideWords + ')', 'i').test(raw);
}

export function shellWriteLike(command) {
  return /(?:^|[;&|]\s*)(?:New-Item|Set-Content|Add-Content|Out-File|Copy-Item|Move-Item|Rename-Item|Remove-Item|Start-Transcript|Invoke-WebRequest|Invoke-RestMethod|curl(?:\.exe)?|wget|tee|python|node|npm|pip|git\s+clone)\b|(?:^|[^0-9])>>?\s*[^\s|&;]+|--output(?:=|\s)|-OutFile\b/i.test(command);
}

function shellVariablesOf(text) {
  const vars = new Map();
  const re = /(?:^|[;&|\s])\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"([^"]+)"|'([^']+)')/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const value = match[2] || match[3] || '';
    if (value !== '') vars.set(match[1], value);
  }
  return vars;
}

function expandShellValue(raw, vars) {
  let value = String(raw || '');
  if (value.startsWith('$')) value = vars.get(value.slice(1)) || value;
  return value.replace(/^\$env:\w+[\\/]?/i, '');
}

export function shellOutsideTargets(command, goalRoot, cwd, workdir) {
  const text = String(command || '');
  const base = String(workdir || cwd || process.cwd());
  const vars = shellVariablesOf(text);
  const patterns = [
    />\s*(?:"([^"]+)"|'([^']+)'|([^\s;|&]+))/g,
    /(?:Out-File|Set-Content|Add-Content|New-Item)\s+(?:-Path\s+)?(?:"([^"]+)"|'([^']+)'|([^\s;|&]+))/gi,
    /(?:Copy-Item|Move-Item)[^\n]*?(?:-Destination\s+)(?:"([^"]+)"|'([^']+)'|([^\s;|&]+))/gi,
    /(?:Invoke-WebRequest|iwr|curl(?:\.exe)?|wget)\b[^\n]*?(?:-OutFile|-o|-O|--output)\s+(?:"([^"]+)"|'([^']+)'|([^\s;|&]+))/gi,
    /(?:python(?:\.exe)?|py|node|pwsh|powershell)(?:\.exe)?\s+(?:-File\s+)?(?:"([^"]+)"|'([^']+)'|([^\s;|&]+))/gi,
    /(?:Set-Location|Push-Location|cd)\s+(?:"([^"]+)"|'([^']+)'|([^\s;|&]+))/gi
  ];
  const outside = [];
  const consider = (raw) => {
    let value = expandShellValue(raw, vars);
    if (value === '' || value.startsWith('-') || /^https?:\/\//i.test(value)) return;
    if (value.startsWith('$')) return;
    const target = resolveModelPath(base, value);
    if (target !== '' && !isInsideRoot(goalRoot, target)) outside.push(target);
  };
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      consider(match[1] || match[2] || match[3] || '');
    }
  }
  // Copy-Item/Move-Item positional destination ($OUT / "C:\\outside\\dir").
  const copyPairs = /(?:Copy-Item|Move-Item)\b[^\n]*?\s+(?:"[^"]+"|'[^']+'|\$?[A-Za-z_][^\s;|&]*)\s+(?:"([^"]+)"|'([^']+)'|(\$[A-Za-z_][A-Za-z0-9_]*))/gi;
  let pair;
  while ((pair = copyPairs.exec(text)) !== null) consider(pair[1] || pair[2] || pair[3] || '');
  // Inline Python writes: open(r'C:\\outside\\x', 'w')
  const inlineOpen = /\b(?:open|Path)\s*\(\s*(?:r|u)?["']([A-Za-z]:\\[^"']+)["']/g;
  let opened;
  while ((opened = inlineOpen.exec(text)) !== null) consider(opened[1]);
  return outside;
}


/* ── 自动目标：首条用户消息里带目标时，在模型动手前先把 goal 记录进图 ── */
function autoGoalTextOf(message) {
  const parts = Array.isArray(message?.content) ? message.content : [];
  return parts
    .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function autoGoalOptOut(text) {
  return /(?:不要|不用|别|无需|不需要|先别)\s*(?:设置|记录|建|创建|添加)?\s*(?:目标|goal)|先别.*目标|只聊天|不需要目标|无需目标/i.test(text);
}

function autoGoalTarget(text) {
  const url = text.match(/https?:\/\/[^\s<>"'）)】\]，,。；;]+/i);
  if (url) return url[0].replace(/[.,;!?]+$/, '');
  const ip = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/);
  if (ip) return ip[0];
  const host = text.match(/\b(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,24}(?::\d{1,5})?\b/);
  if (host && !/\.(?:json|md|txt|py|js|ts|html?|php|xml|ya?ml|log|csv|zip|png|jpe?g|gif|exe|dll|docx?|xlsx?|pptx?|pdf|sh|ps1|bat|cmd|go|rs|java|c|cpp|h|conf|ini|env)$/i.test(host[0])) {
    return host[0];
  }
  return '';
}

function autoGoalObjective(text, target) {
  const byPurpose = text.match(/目的\s*[：:]\s*([^\n\r。；;]+)/);
  if (byPurpose) return byPurpose[1].trim();
  const byGoal = text.match(/目标\s*[：:]\s*([^\n\r。；;]+)/);
  if (byGoal && !/https?:\/\//i.test(byGoal[1])) return byGoal[1].trim();
  let rest = text.split(target).join(' ').replace(/\s+/g, ' ').trim();
  rest = rest.replace(/^对\s*/u, '').replace(/^[^\p{L}\p{N}]+/u, '');
  if (rest === '') return '用户指定目标的渗透测试';
  return rest.slice(0, 300);
}

function autoGoalDirName(target) {
  let host = target;
  let port = '';
  try {
    const url = new URL(target);
    host = url.hostname;
    port = url.port;
  } catch {
    const match = String(target).match(/^([^:\/\s]+)(?::(\d+))?/);
    if (match) {
      host = match[1];
      port = match[2] || '';
    }
  }
  const clean = (value) => String(value || '').replace(/[^A-Za-z0-9._-]/g, '_');
  return port ? clean(host) + '_' + clean(port) : clean(host);
}

const emptyProjection = {
  goal: null,
  nodes: [],
  assets: [],
  edges: [],
  queue: [],
  coverage: [],
  digests: [],
  intents: [],
  facts: [],
  findings: [],
  counts: { intents: 0, facts: 0, findings: 0, assets: 0, queue: 0 },
  revision: 0,
  members: [],
  memberNames: {}
};

async function openDomain(ctx) {
  return openSharedDomain(ctx, domainSpec);
}

/**
 * Committed agent preset for a live session. The header keeps the creation
 * time value ("standard"); the new-session dialog commits the choice to the
 * `agentPreset` session projection, so every preset check must read that.
 */
function sessionPresetOf(ctx, session) {
  try {
    const registry = typeof ctx.get === 'function' ? ctx.get('agentPresets') : undefined;
    if (registry && typeof registry.presetForSession === 'function') {
      const selected = registry.presetForSession(session);
      if (selected) return String(selected);
    }
  } catch { /* fall back to the header */ }
  try {
    if (session && typeof session.snapshotEvents === 'function') {
      const events = session.snapshotEvents() || [];
      for (let index = events.length - 1; index >= 0; index -= 1) {
        const event = events[index];
        if (event?.type === 'agent-preset/selected') {
          const selected = String(event.data?.agentPreset || '');
          if (selected) return selected;
        }
      }
    }
  } catch { /* fall back to the header */ }
  return String(session?.header?.agentPreset || '');
}

/**
 * STCS owns its own protocol section. The legacy `pentest:protocol` /
 * `pentest:orchestration` sections teach the Lead to add directions and
 * dispatch, which is exactly what the STCS root must not do; hide them for
 * STCS sessions and leave every other preset untouched.
 */
function legacyProtocolFor(ctx, context, value) {
  try {
    const session = context?.scope?.session || context?.scope;
    if (sessionPresetOf(ctx, session) === 'artex') return '';
  } catch { /* keep the legacy protocol on doubt */ }
  return value;
}

async function openTraceDomain(ctx) {
  return openSharedDomain(ctx, traceSpec);
}

async function openTrafficDomain(ctx) {
  return openSharedDomain(ctx, trafficSpec);
}

async function openAssetGraphDomain(ctx) {
  return openSharedDomain(ctx, assetGraphSpec);
}

export function apply(ctx) {
  let domainPromise;
  let legacyPromise;
  let handlersPromise;
  let tracePromise;
  let trafficPromise;
  let assetGraphPromise;
  const getSubagents = () => {
    try { return typeof ctx.get === 'function' ? ctx.get('subagents') : undefined; } catch { return undefined; }
  };

  const getDomain = () => {
    if (!domainPromise) domainPromise = openDomain(ctx);
    return domainPromise;
  };
  const getLegacyDomain = () => {
    if (!legacyPromise) legacyPromise = openSharedDomain(ctx, legacySpec);
    return legacyPromise;
  };
  const getHandlers = async () => {
    if (!handlersPromise) {
      handlersPromise = (async () => {
        const domain = await getDomain();
        const store = createDshStateStore({
          table: domain.table('states'),
          sessions: ctx.sessions,
          now: () => Date.now()
        });
        return createHandlers({
          store,
          legacyState: async (sessionId) => {
            const legacy = await getLegacyDomain();
            return readLegacyState(legacy, sessionId);
          }
        });
      })();
    }
    return handlersPromise;
  };
  let v4DomainPromise;
  let v4StorePromise;
  const getV4Domain = () => {
    if (!v4DomainPromise) v4DomainPromise = openSharedDomain(ctx, v4Spec);
    return v4DomainPromise;
  };
  const getV4Store = () => {
    if (!v4StorePromise) {
      v4StorePromise = (async () => {
        const domain = await getV4Domain();
        return createDshStateStore({
          table: domain.table('states'),
          sessions: ctx.sessions,
          now: () => Date.now(),
          reduce: reduceV4
        });
      })();
    }
    return v4StorePromise;
  };
  const getV4Session = async (sessionId) => new V4Session({ store: await getV4Store(), sessionId });

  function findingCandidates(state, excludeId) {
    return (state.findings || [])
      .filter((item) => item.deleted !== true && item.id !== excludeId)
      .map((item) => ({
        id: item.id,
        claim: item.claim,
        severity: item.severity,
        impactProven: item.impactProven,
        directionId: item.directionId,
        vulnType: item.vulnType || '',
        rootCause: item.rootCause || '',
        exploitTechnique: item.exploitTechnique || '',
        affectedAssets: item.affectedAssets || [],
        evidenceIds: item.evidenceIds || [],
        dedupeKey: item.dedupeKey || ''
      }));
  }

  function auditorDedupeKey(structured) {
    try {
      return normalizeDedupeKey({ vulnType: structured.vulnType, rootCause: structured.rootCause });
    } catch {
      return String(structured.dedupeKey || '').trim();
    }
  }

  function auditMetadata(structured, extra = {}) {
    return {
      vulnType: structured.vulnType,
      rootCause: structured.rootCause,
      exploitTechnique: structured.exploitTechnique,
      dedupeKey: auditorDedupeKey(structured),
      severityRationale: structured.severityRationale,
      auditDecision: structured.decision,
      ...extra
    };
  }

  async function applyAuditorResult({ session, runner, findingId, structured }) {
    const verdict = structured.verdict;
    let evidenceIds = [];
    if (verdict === 'reproduced') {
      const prepared = runner.prepareEvidence(structured.evidence);
      if (prepared.length === 0) throw new Error('auditor reproduced without new evidence');
      const before = new Set((await session.read()).evidence.map((item) => item.id));
      const next = await session.addEvidence(prepared);
      evidenceIds = (next.evidence || []).filter((item) => !before.has(item.id)).map((item) => item.id);
    }
    if (structured.decision === 'needs_review' || structured.safetyDecision === 'requires_user_approval') {
      const reviewed = await session.reviewFinding({
        findingId,
        status: 'pending',
        safetyDecision: structured.safetyDecision,
        note: structured.reason || structured.notes || '',
        proposedAction: structured.proposedAction || ''
      });
      await session.rateFinding({
        findingId,
        ...auditMetadata(structured, {
          severity: structured.severity,
          impactProven: structured.impactProven,
          affectedAssets: structured.affectedAssets || []
        })
      });
      return { pendingApproval: true, safetyDecision: structured.safetyDecision, revision: reviewed.revision };
    }
    if (structured.decision === 'duplicate' && structured.duplicateOf) {
      const merged = await session.mergeFinding({ findingId: structured.duplicateOf, sourceId: findingId });
      const target = (await session.read()).findings.find((item) => item.id === structured.duplicateOf);
      const affectedAssets = [...new Set([...(target?.affectedAssets || []), ...(structured.affectedAssets || [])])];
      await session.rateFinding({
        findingId: structured.duplicateOf,
        ...auditMetadata(structured, {
          severity: structured.severity,
          impactProven: structured.impactProven,
          affectedAssets
        })
      });
      return { merged: true, duplicateOf: structured.duplicateOf, evidenceIds, revision: merged.revision };
    }
    await session.validate({
      findingId,
      verdict,
      validator: 'agent:pentest-auditor',
      evidenceIds,
      notes: structured.reason || structured.notes || '',
      metadata: auditMetadata(structured)
    });
    await session.rateFinding({
      findingId,
      ...auditMetadata(structured, {
        severity: structured.severity,
        impactProven: structured.impactProven,
        affectedAssets: structured.affectedAssets || [],
        ...(structured.reason ? { riskAnalysis: structured.reason } : {})
      })
    });
    return { verdict, decision: structured.decision, severity: structured.severity, evidenceIds };
  }

  async function materializeCoverageFindings({ session, state }) {
    const enriched = deriveCoverageFindings(state);
    const existingIds = new Set((state.findings || []).map((item) => item.id));
    const materialized = [];
    for (const finding of enriched.findings || []) {
      if (!finding.derived || existingIds.has(finding.id)) continue;
      await session.addFinding({
        directionId: finding.directionId,
        claim: finding.claim,
        title: finding.title,
        severity: finding.severity,
        impactProven: finding.impactProven,
        evidenceIds: finding.evidenceIds || []
      });
      materialized.push(finding.id);
    }
    return { state: await session.read(), materialized };
  }

  async function autoAuditFindings({ session, runner, state, findingIds = [], timeoutMs = 300000, skipAudited = false }) {
    const result = { audited: [], pending: [], failed: [], skipped: [] };
    for (const findingId of findingIds) {
      const finding = (state.findings || []).find((item) => item.id === findingId && item.deleted !== true);
      if (!finding || finding.severity === 'info') {
        result.skipped.push({ findingId, reason: 'info-or-missing' });
        continue;
      }
      // ONE audit-state rule (policy.js), identical to projection/UI.
      if (skipAudited && auditStateOf(finding, state.validations || []) === 'audited') {
        result.skipped.push({ findingId, reason: 'already-audited' });
        continue;
      }
      if (['rejected', 'false_positive', 'not_reproduced'].includes(finding.status)) {
        const latest = latestValidationFor(state.validations || [], findingId);
        // Only an auditor's own negative decision is final. A legacy
        // Lead-signed rejection still needs independent review.
        if (latest && latest.validator === 'agent:pentest-auditor' && latest.superseded !== true) {
          result.skipped.push({ findingId, reason: `status:${finding.status}` });
          continue;
        }
      }
      if (finding.approvalStatus === 'pending' || finding.approvalStatus === 'denied') {
        result.skipped.push({ findingId, reason: `approval:${finding.approvalStatus}` });
        continue;
      }
      const redLine = redLineReason(`${finding.claim || ''} ${finding.description || ''} ${finding.steps?.join(' ') || ''}`);
      if (redLine) {
        await session.reviewFinding({
          findingId,
          status: 'pending',
          safetyDecision: 'requires_user_approval',
          note: redLine,
          proposedAction: finding.claim || ''
        });
        result.pending.push({ findingId, reason: redLine });
        continue;
      }
      // Auditors are ALWAYS visible teammates (TeamRoleRunner). Never fall
      // back to a structured subagent: that made an audit look like an extra
      // worker and attached dozens of role children to unrelated chats.
      // A failed teammate is recorded as failed and retried on cooldown.
      if (!(runner instanceof TeamRoleRunner)) {
        result.failed.push({ findingId, error: 'auditor requires a visible teammate transport (subagents.startActivation)' });
        continue;
      }
      const auditPayload = {
        findingId,
        claim: finding.claim,
        severity: finding.severity,
        impactProven: finding.impactProven,
        evidenceIds: finding.evidenceIds || [],
        existingFindings: findingCandidates(state, findingId),
        severityPolicy: 'critical=RCE/full admin; high=unauth sensitive/write; medium=limited/conditional; low=info only',
        target: state.goal?.target || '',
        workdir: state.goal?.workdir || process.cwd()
      };
      try {
        const outcome = await runner.run('auditor', auditPayload, {
          timeoutMs: Math.min(Math.max(Number(timeoutMs) || 600000, 1000), 600000), maxDepth: 1
        });
        const applied = await applyAuditorResult({ session, runner, findingId, structured: outcome.structured });
        if (applied.pendingApproval) result.pending.push({ findingId, reason: applied.safetyDecision });
        else result.audited.push({ findingId, decision: applied.decision || (applied.merged ? 'duplicate' : applied.verdict) });
      } catch (error) {
        result.failed.push({ findingId, error: String(error?.message || error) });
      }
    }
    return result;
  }

  // Auto-audit is deliberately queued off the worker commit path. A worker
  // must release its slot immediately after committing; the auditor drains the
  // queue while the remaining workers keep running.
  //
  // Audits use a small worker pool instead of one global chain: a single slow
  // or stuck auditor used to block every other session's validation queue.
  const AUDIT_CONCURRENCY = 4;
  const auditJobs = [];
  let auditRunning = 0;
  const pumpAuditJobs = () => {
    while (auditRunning < AUDIT_CONCURRENCY && auditJobs.length > 0) {
      const job = auditJobs.shift();
      auditRunning += 1;
      Promise.resolve()
        .then(job.run)
        .then(job.resolve, job.reject)
        .finally(() => {
          auditRunning -= 1;
          pumpAuditJobs();
        });
    }
  };
  const enqueueAudit = (options) => new Promise((resolve, reject) => {
    auditJobs.push({ run: () => autoAuditFindings(options), resolve, reject });
    pumpAuditJobs();
  });
  const auditInflight = new Set();
  const enqueueAuditOnce = (options) => {
    const ids = [];
    // A force/manual request supersedes any earlier in-flight bookkeeping for
    // the same session: an old runner that never settled must not make the
    // button report "queued N" while nothing is actually scheduled.
    if (options.force) {
      const prefix = `${options.session?.sessionId || options.sessionId || ''}:`;
      for (const key of [...auditInflight]) if (key.startsWith(prefix)) auditInflight.delete(key);
    }
    for (const findingId of options.findingIds || []) {
      const key = `${options.session?.sessionId || options.sessionId || ''}:${findingId}`;
      if (auditInflight.has(key)) continue;
      auditInflight.add(key);
      ids.push(findingId);
    }
    if (ids.length === 0) return Promise.resolve({ audited: [], pending: [], failed: [], skipped: [] });
    const run = enqueueAudit({ ...options, findingIds: ids });
    const release = () => {
      for (const findingId of ids) auditInflight.delete(`${options.session?.sessionId || options.sessionId || ''}:${findingId}`);
    };
    void run.then(release, release);
    return run;
  };

  // Findings the auditor could not finish are retried with a cooldown instead
  // of being re-spawned every three seconds.
  const auditCooldown = new Map();
  const auditRetryDelayMs = 20000;
  const auditPendingFor = ({ session, state, agent, timeoutMs = 180000, force = false, clearCooldown = force }) => {
    if (!force) {
      // Pausing stops worker dispatch, but validation debt must keep draining:
      // otherwise every 待验证 finding freezes until someone resumes the goal.
      const phase = state?.goal?.phase;
      if (phase !== 'active' && phase !== 'paused') return { queued: 0, reason: 'inactive' };
      if (state.settings?.autoAudit === false) return { queued: 0, reason: 'auto-audit-off' };
    }
    // Auditors must be owned by the target session's own live agent. Both
    // transports require parent.id to be an exact registered agent, so an
    // absent agent means this dormant session simply waits. Never borrow a
    // different live agent: that used to attach dozens of pentest-auditor
    // children to an unrelated chat session and keep respawning them.
    let owningAgent = agent;
    if (!owningAgent) {
      const agentsService = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
      if (agentsService && typeof agentsService.get === 'function') {
        const own = session?.sessionId ? agentsService.get(session.sessionId) : undefined;
        if (own?.id === session?.sessionId) owningAgent = own;
      }
    }
    if (!owningAgent) return { queued: 0, reason: 'no-own-live-agent', run: null };
    const agentTeams = typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined;
    const subagents = getSubagents();
    // DSH 0.2.2-rc.3 removed agentTeams.spawnTeammate. A visible role is now a
    // named subagent, so the only required transport is startActivation.
    if (!subagents?.startActivation && !agentTeams?.spawnTeammate) {
      return { queued: 0, reason: 'no-team-transport', run: null };
    }
    const runner = new TeamRoleRunner({
      session, subagents, agentTeams, agent: owningAgent, cwd: state.goal.workdir || process.cwd()
    });
    const now = Date.now();
    const prefix = `${session.sessionId}:`;
    // A manual "审计待验证" click must override the automatic retry cooldown;
    // otherwise recent failures make the button report "queued 0" for minutes.
    if (force && clearCooldown) {
      for (const key of [...auditCooldown.keys()]) {
        if (key.startsWith(prefix)) auditCooldown.delete(key);
      }
    }
    const ids = selectAuditCandidates(state, { now, cooldown: auditCooldown });
    if (ids.length === 0) return { queued: 0, reason: 'cooldown-or-empty', run: null };
    const run = enqueueAuditOnce({ session, runner, state, findingIds: ids, skipAudited: true, timeoutMs, force });
    void run.then((result) => {
      for (const item of result?.failed || []) {
        auditCooldown.set(`${session.sessionId}:${item.findingId}`, Date.now() + auditRetryDelayMs);
      }
    }, () => {
      for (const id of ids) auditCooldown.set(`${session.sessionId}:${id}`, Date.now() + auditRetryDelayMs);
    });
    // force cleared any stale inflight keys above, so ids.length is the real
    // number the pool accepted.
    return { queued: ids.length, run };
  };

  /**
   * P0 global audit drain. A finding in a dormant session (no live agent of
   * its own) cannot spawn its own visible teammate, so per-session auditing
   * would leave it waiting forever. Use ONE live pentest agent as the host of
   * a single reused `pentest-auditor` teammate, and write each result back to
   * the finding's own v4 session. Never uses a subagent and never borrows a
   * non-pentest chat as an unregistered parent: the host is explicitly the
   * owner of the reused visible member.
   */
  const GLOBAL_AUDIT_MEMBER = 'pentest-auditor-global';
  const drainLog = (reason, extra) => {
    try {
      const line = `${new Date().toISOString()} ${reason}${extra ? ' ' + JSON.stringify(extra) : ''}\n`;
      fs.appendFileSync(path.join(os.homedir(), '.dsh', 'pentest-audit-drain.log'), line, 'utf8');
    } catch { /* best effort */ }
    try { ctx.logger?.warn?.(`[pentest-audit-drain] ${reason}`); } catch { /* best effort */ }
  };
  const drainGlobalAuditDebt = async (sessionIds, agents) => {
    const agentTeams = typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined;
    const subagents = getSubagents();
    if (!subagents?.startActivation && !agentTeams?.spawnTeammate) { drainLog('no-team-transport'); return { queued: 0, reason: 'no-team-transport' }; }
    // Resolve the host three ways, all restricted to v4 pentest sessions:
    // 1) a live agent whose id/sessionId is a v4 state id (agents.list);
    // 2) agents.get(v4Id) for each engagement (works even when list() omits
    //    idle-but-resumable agents);
    // 3) never a session outside the v4 table (so a normal chat is never host).
    const live = agents && typeof agents.list === 'function' ? agents.list() : [];
    const pentestIds = new Set(sessionIds.map(String));
    let host = live.find((item) => item?.id && pentestIds.has(String(item?.session?.id || item?.id)));
    if (!host && agents && typeof agents.get === 'function') {
      for (const sessionId of sessionIds) {
        try {
          const candidate = agents.get(sessionId);
          if (candidate?.id) { host = candidate; break; }
        } catch { /* keep looking */ }
      }
    }
    if (!host) {
      drainLog('no-pentest-live-host', { live: live.map((x) => ({ id: String(x?.id || ''), preset: String(x?.session?.header?.agentPreset || '') })) });
      return { queued: 0, reason: 'no-pentest-live-host' };
    }
    drainLog('host-selected', { host: String(host.id), preset: String(host?.session?.header?.agentPreset || ''), sessions: sessionIds.length });
    const now = Date.now();
    // Flatten ALL pending findings across sessions, then run one job per
    // finding (bounded by AUDIT_CONCURRENCY parallel slots). A job that
    // carries many findings for one member serializes them behind a single
    // teammate and only writes a few validations per tick.
    const work = [];
    for (const sessionId of sessionIds) {
      try {
        // STCS owns its own scheduling and audit queue through the shared
        // pentestV4 facade. The legacy global drain must not race it.
        const liveSession = typeof ctx.sessions?.get === 'function' ? ctx.sessions.get(sessionId) : undefined;
        if (sessionPresetOf(ctx, liveSession) === 'artex') continue;
        const session = await getV4Session(sessionId);
        let state = await session.read();
        if (!state?.goal || state.settings?.autoAudit === false) continue;
        if (!['active', 'paused'].includes(state.goal.phase)) continue;
        const stalePending = (state.findings || []).filter((item) =>
          item && item.deleted !== true && item.approvalStatus === 'pending'
          && !redLineReason(`${item.claim || ''} ${item.description || ''} ${(item.steps || []).join(' ')}`));
        for (const item of stalePending) {
          try { state = await session.run({ type: 'finding', op: 'unblock', id: item.id, now }); }
          catch { /* continue with the rest */ }
        }
        for (const findingId of selectAuditCandidates(state, { now, cooldown: auditCooldown })) {
          work.push({ session, state, sessionId, findingId });
        }
      } catch { /* one bad session must not block the rest */ }
    }
    let queued = 0;
    // ONE reused visible member: never send it concurrent jobs (they would
    // interrupt each other). Take the first pending finding per tick; the 3s
    // tick advances the queue continuously, so 110 findings drain in minutes.
    for (const item of work.slice(0, 1)) {
      const { session, state, sessionId, findingId } = item;
      try {
        const runner = new TeamRoleRunner({
          session, subagents, agentTeams, agent: host,
          cwd: state.goal.workdir || process.cwd(), memberName: GLOBAL_AUDIT_MEMBER
        });
        const run = enqueueAuditOnce({
          session, runner, state, findingIds: [findingId],
          skipAudited: true, timeoutMs: 180000
        });
        queued += 1;
        drainLog('queue', { sessionId: String(sessionId).slice(0, 24), findingId: String(findingId) });
        void run.then((result) => {
          for (const failed of result?.failed || []) {
            auditCooldown.set(`${sessionId}:${failed.findingId}`, Date.now() + auditRetryDelayMs);
          }
        }, () => {
          auditCooldown.set(`${sessionId}:${findingId}`, Date.now() + auditRetryDelayMs);
        });
      } catch { /* keep going */ }
    }
    return { queued, member: GLOBAL_AUDIT_MEMBER };
  };

  // Re-emit the live UI snapshot for either schema. v4 keeps its state in a
  // separate store, so the legacy handler alone silently did nothing for v4
  // sessions and their tab stayed frozen at the pre-pause projection.
  const reprojectSession = async (sessionId, { tolerateAppendFailure = false, force = false } = {}) => {
    try {
      const v4 = await getV4Session(sessionId);
      const state = await v4.read();
      if (state?.goal) {
        await v4.reproject({ tolerateAppendFailure, force });
        return true;
      }
    } catch { /* fall back to the legacy store */ }
    try {
      const handlers = await getHandlers();
      await handlers.reproject({ sessionId });
      return true;
    } catch { /* nothing to repair */ }
    return false;
  };

  // Keep validation work from becoming display-only debt. Called by planner
  // reads and by the explicit autoplan tool: accept proposed directions in a
  // batch, dispatch every free worker slot, and queue all unvalidated findings
  // for the auditor. It is additive and idempotent: accepted candidates and
  // active directions are never duplicated.
  const autoAdvanceV4 = async (sessionId, agent, options = {}) => {
    // STCS sessions are driven by CoordinatorRunner, not by the legacy
    // planner/autoAdvance loop. This is additive: only the new preset id hits it.
    const liveSession = typeof ctx.sessions?.get === 'function' ? ctx.sessions.get(sessionId) : undefined;
    if (sessionPresetOf(ctx, liveSession) === 'artex') {
      return {
        advanced: false,
        reason: 'artex-coordinator-owned',
        accepted: [],
        errors: [],
        queuedAudit: 0,
        audit: { queued: 0, reason: 'artex-coordinator-owned' },
        dispatched: []
      };
    }
    const session = await getV4Session(sessionId);
    let state = await session.read();
    if (!state?.goal || !['active', 'paused'].includes(state.goal.phase)) {
      return { advanced: false, reason: 'inactive-or-missing' };
    }
    const accepted = [];
    const errors = [];
    const finish = async (result) => {
      await reprojectSession(sessionId);
      return result;
    };
    const subagents = typeof ctx.get === 'function' ? ctx.get('subagents') : undefined;
    // Validation is not worker dispatch: pending findings are audited even
    // when background scheduling is off, otherwise they sit at 待验证 forever.
    const audit = auditPendingFor({ session, state, agent });
    // Paused sessions still drain audit debt, but never dispatch new workers.
    if (state.goal.phase !== 'active') {
      return { advanced: false, reason: 'paused-audit-only', accepted: [], errors: [], queuedAudit: audit.queued, audit, dispatched: [] };
    }
    // The human may pause/clear the NATIVE DSH goal from the Web goal card.
    // That does not touch v4 state, so without this check the scheduler would
    // keep dispatching workers "behind the user's back". Native goal wins.
    try {
      const goalsSvc = typeof ctx.get === 'function' ? ctx.get('goals') : undefined;
      const native = goalsSvc && agent && typeof goalsSvc.get === 'function' ? goalsSvc.get(agent) : undefined;
      if (native === undefined || (native && String(native.phase || '') !== 'active')) {
        return { advanced: false, reason: 'native-goal-not-active', accepted: [], errors: [], queuedAudit: audit.queued, audit, dispatched: [] };
      }
    } catch { /* no goals service in isolated tests: keep v4 behavior */ }
    // Opening, selecting or reading a session must never start work. Only an
    // explicit resume/autoplan/dispatch turns background scheduling on.
    if (options.force !== true && state.settings?.autoDispatch !== true) {
      return { advanced: false, reason: 'auto-dispatch-off', accepted: [], errors: [], queuedAudit: audit.queued, audit, dispatched: [] };
    }
    const maxWorkers = Math.min(Math.max(Math.round(Number(state.settings?.workerLimit) || 6), 1), 6);
    let activeTasks = (state.tasks || []).filter((task) => ['queued', 'running'].includes(task.state));
    let freeWorkers = Math.max(0, maxWorkers - activeTasks.length);
    const hadCandidates = (state.planner?.candidates || []).some((item) => item.state === 'proposed');
    if (!subagents || typeof subagents.startActivation !== 'function') {
      return finish({ advanced: false, reason: 'subagents-unavailable', accepted, errors, queuedAudit: audit.queued, audit, dispatched: [] });
    }
    // Report/index/cleanup tasks do not produce vulnerabilities. When real
    // attack hypotheses are waiting, stop letting those bookkeeping tasks
    // occupy every worker slot.
    const workOpen = (state.directions || []).filter((direction) => direction.state === 'open'
      && !isLeadOnlyDirection(direction));
    const reportTaskDirections = new Set((state.directions || [])
      .filter((direction) => isLeadOnlyDirection(direction))
      .map((direction) => direction.id));
    const reportActive = activeTasks.filter((task) => reportTaskDirections.has(task.directionId));
    const cancelledReport = [];
    if (workOpen.length > 0 && reportActive.length > 0) {
      const canceller = new V4Dispatcher({
        session, subagents, agent,
        cwd: state.goal.workdir || process.cwd(),
        provider: 'spawn',
        maxWorkers
      });
      for (const task of reportActive) {
        try {
          await canceller.cancel(task.id);
          cancelledReport.push(task.id);
        } catch (error) {
          errors.push({ taskId: task.id, error: error?.message || String(error) });
        }
      }
      if (cancelledReport.length > 0) {
        state = await session.read();
        activeTasks = (state.tasks || []).filter((task) => ['queued', 'running'].includes(task.state));
        freeWorkers = Math.max(0, maxWorkers - activeTasks.length);
      }
    }
    for (const candidate of (state.planner?.candidates || [])
      .filter((item) => item.state === 'proposed' && !isLeadOnlyDirection({ axis: item.axis, question: item.question }))) {
      try {
        state = await session.acceptCandidate(candidate.id);
        accepted.push(candidate.id);
      } catch (error) {
        errors.push({ candidateId: candidate.id, error: error?.message || String(error) });
      }
    }
    if (freeWorkers === 0) {
      return finish({ advanced: accepted.length > 0, accepted, errors, cancelledReport, queuedAudit: audit.queued, dispatched: [] });
    }

    if (options.dispatchOpen === false && !hadCandidates) {
      return finish({ advanced: accepted.length > 0, accepted, errors, queuedAudit: audit.queued, dispatched: [] });
    }
    const activeDirectionIds = new Set(activeTasks.map((task) => task.directionId));
    let open = (state.directions || [])
      .filter((direction) => direction.state === 'open'
        && !activeDirectionIds.has(direction.id)
        && !isLeadOnlyDirection(direction))
      .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
    if (open.length === 0) {
      const autoPlan = planV4(state);
      // An unfinished goal with no open direction must still produce a NEW
      // concrete attack hypothesis. Only explicit work turns (flow_status /
      // autoplan) pass allowFallback; a plain background tick must not invent
      // work on otherwise idle sessions.
      if (options.allowFallback === true && autoPlan.mustGenerate) {
        const wanted = Math.max(0, Math.min(freeWorkers, 6));
        const specs = (Array.isArray(autoPlan.fallbacks) && autoPlan.fallbacks.length > 0
          ? autoPlan.fallbacks
          : (autoPlan.fallback ? [autoPlan.fallback] : [])).slice(0, wanted);
        for (const spec of specs) {
          try {
            state = await session.addDirection({
              axis: [spec.axis],
              question: spec.question,
              doneWhen: spec.doneWhen,
              origin: 'fallback',
              priority: 20
            });
          } catch (error) {
            errors.push({ fallback: error?.message || String(error) });
          }
        }
        open = (state.directions || [])
          .filter((direction) => direction.state === 'open'
            && !activeDirectionIds.has(direction.id)
            && !isLeadOnlyDirection(direction))
          .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
      }
    }
    if (open.length === 0) {
      return finish({ advanced: accepted.length > 0, accepted, errors, queuedAudit: audit.queued, dispatched: [] });
    }
    const dispatcher = new V4Dispatcher({
      session, subagents, agent,
      cwd: state.goal.workdir || process.cwd(),
      provider: 'spawn',
      maxWorkers,
      onEvidence: trafficEvidenceIndexer(sessionId),
      onCommit: ({ state: committed }) => {
        auditPendingFor({ session, state: committed, agent });
        // Keep the pipeline full after a worker releases its slot.
        void autoAdvanceV4(sessionId, agent, { dispatchOpen: true, force: options.force === true }).catch((error) => {
          try { ctx.logger?.warn?.('pentest auto advance failed: ' + (error?.message || error)); } catch { /* best effort */ }
        });
      }
    });
    const dispatched = [];
    for (const direction of open.slice(0, freeWorkers)) {
      try {
        dispatched.push(await dispatcher.assign(direction.id, { provider: 'spawn' }));
      } catch (error) {
        errors.push({ directionId: direction.id, error: error?.message || String(error) });
      }
    }
    return finish({
      advanced: accepted.length > 0 || dispatched.length > 0,
      accepted,
      errors,
      queuedAudit: audit.queued,
      dispatched
    });
  };

  const trafficEvidenceIndexer = (sessionId) => async (rows, meta = {}) => {
    const traffic = await getTrafficStore();
    const out = { recorded: 0, reused: 0 };
    for (const row of rows || []) {
      if (!row || !String(row.body || '').trim()) continue;
      try {
        // The evidence file is a raw request/response transcript. Extract the
        // URL/status from it when possible, otherwise index by summary/path.
        const result = await traffic.record(sessionId, {
          raw: String(row.body),
          body: String(row.body),
          role: ['baseline', 'proof', 'verification', 'supporting', 'counter'].includes(row.role) ? row.role : 'untagged',
          taskId: String(meta.taskId || ''),
          evidenceId: String(row.sha256 || ''),
          findingId: String((meta.findingIds || [])[0] || ''),
          summary: String(row.summary || row.path || '').slice(0, 400),
          path: String(row.path || '')
        });
        if (result.reused) out.reused += 1;
        else out.recorded += 1;
      } catch { /* one bad transcript must not block the rest */ }
    }
    return out;
  };
  const getTraceStore = () => {
    if (!tracePromise) {
      tracePromise = (async () => {
        const domain = await openTraceDomain(ctx);
        return createTraceStore({ table: domain.table('sessions'), now: () => Date.now() });
      })();
    }
    return tracePromise;
  };
  const getTrafficStore = () => {
    if (!trafficPromise) {
      trafficPromise = (async () => {
        const domain = await openTrafficDomain(ctx);
        return createTrafficStore({ table: domain.table('sessions'), now: () => Date.now() });
      })();
    }
    return trafficPromise;
  };
  const getAssetGraphStore = () => {
    if (!assetGraphPromise) {      assetGraphPromise = (async () => {
        const domain = await openAssetGraphDomain(ctx);
        return createAssetGraphStore({ table: domain.table('graph'), now: () => Date.now() });
      })();
    }
    return assetGraphPromise;
  };

  ctx.effect(() => () => {
    domainPromise?.catch(() => {});
    tracePromise?.catch(() => {});
    assetGraphPromise?.catch(() => {});
  }, 'pentest-v2.domain');

  const call = (fn, options = {}) => async (args, exec) => {
    const handlers = await getHandlers();
    const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
    if (options.skipEnsure !== true) {
      const ensured = await handlers.ensure({ sessionId });
      if (ensured?.goal) rememberPentestGoal(sessionId, ensured.goal);
    }
    return fn(handlers, args, sessionId, exec);
  };

  /**
   * A teammate message is delivered into the Lead inbox as an
   * `agent/inbox/spliced` event. Persist it as a fact so the exploration graph
   * advances even when the model forgot `pentest_add_fact`.
   */
  const ingestRelayedMessage = async (sessionId, relayed) => {
    const handlers = await getHandlers();
    let view;
    try {
      view = await handlers.state({ sessionId });
    } catch {
      return; // not a pentest engagement
    }
    if (!view?.goal) return;
    const detail = String(relayed.detail || '').trim();
    if (detail === '') return;
    // Each teammate report opens its own exploration direction. Reusing one
    // open intent caused the graph to collapse into "1 intent + dozens of
    // facts", unlike an ARTEX worker report which is a fresh claimable branch.
    const summary = detail
      .replace(/\s+/g, ' ')
      .replace(/^[#>*\-\s]+/, '')
      .slice(0, 72)
      .trim();
    // Reports belong to a fact stream, not to planner directions. Creating one
    // intent per teammate report inflated the graph (4 reports => 4 fake
    // directions). Reuse one explicit intake bucket; the planner decides if a
    // new real direction is needed.
    let intent = (view.intents || []).find((item) => String(item.title || '').startsWith('成员回报汇总'))
    if (!intent) {
      try {
        intent = await handlers.addIntent({
          sessionId,
          title: '成员回报汇总（事实入口，不是探索方向）',
          detail: '子代理回报统一入这里，由 planner 决定是否转成新的真实 intent。',
          doneWhen: '回报已入图；需要时再由 planner 派生方向',
          kind: 'recon',
          priority: 1
        });
      } catch {
        intent = (view.intents || []).find((item) => item.state === 'open' || item.state === 'running') || (view.intents || [])[0]
      }
    }
    if (!intent) return;
    await handlers.addFact({
      sessionId,
      intentId: intent.id,
      kind: 'recon',
      target: view.goal.target,
      detail: `【子代理 ${relayed.author || 'teammate'}】${detail}`.slice(0, 6000),
      confidence: 'medium',
      author: relayed.author || 'teammate'
    });
    // Preserve the teammate's process observation even before a formal fact
    // exists; trace failures must never break the graph write above.
    try {
      const trace = await getTraceStore();
      await trace.add(sessionId, {
        workerId: relayed.author || 'teammate',
        tool: 'team-report',
        phase: 'report',
        summary: summary || 'teammate report',
        detail,
        evidenceRefs: []
      });
    } catch { /* trace is best-effort */ }
  };

  if (typeof ctx.on === 'function') {
    ctx.effect(() => {
      const stop = ctx.on('session/event', (session, event) => {
        if (!event || event.type !== 'agent/inbox/spliced') return;
        const targetId = session?.id || session?.header?.id;
        if (!targetId) return;
        for (const relayed of extractRelayedMessages(event.data?.inserted)) {
          void ingestRelayedMessage(targetId, relayed).catch((error) => {
            try {
              ctx.logger?.warn?.(`pentest team bridge: ${error?.message || error}`);
            } catch {
              /* logging is best-effort */
            }
          });
        }
      });
      return () => {
        if (typeof stop === 'function') stop();
      };
    }, 'pentest-v2.team-bridge');
  }

  // 首条用户消息本身带目标时，先自动记录 goal（除非用户明确说不要设置目标）。
  // 这样即使模型漏调 pentest_add_goal，渗透图也不会是空的。
  const autoGoalSessions = new Set();
  const autoGoalPresetOf = (session) => {
    const log = Array.isArray(session?.log) ? session.log : [];
    for (let index = log.length - 1; index >= 0; index -= 1) {
      if (log[index]?.type === 'agent-preset/selected') return log[index].data?.agentPreset;
    }
    return session?.header?.agentPreset;
  };
  /**
   * Pentest guards must NEVER affect standard/safe-research or other presets.
   * A session is in scope only when its own agent preset is `pentest` and it
   * has a pentest goal recorded. Standard mode always passes through.
   */
  const isPentestGuardSession = (exec) => {
    const session = exec?.agent?.session;
    const preset = String(autoGoalPresetOf(session) || '');
    // Preset alone is the scope boundary. Do not require a warmed goal cache:
    // after a restart the cache is empty until the first pentest tool runs,
    // which would otherwise let the first write escape the boundary.
    return preset === 'pentest';
  };
  const autoGoalFromMessage = async (session, message) => {
    const sessionId = session?.id || session?.header?.id;
    if (!sessionId || autoGoalSessions.has(sessionId)) return;
    if (session?.header?.parentSession) return;
    if (Number(session?.header?.delegationDepth ?? 0) > 0) return;
    if (autoGoalPresetOf(session) !== 'pentest') return;
    const text = autoGoalTextOf(message);
    if (text === '') return;
    if (autoGoalOptOut(text)) {
      autoGoalSessions.add(sessionId);
      return;
    }
    const target = autoGoalTarget(text);
    if (target === '') return;
    autoGoalSessions.add(sessionId);
    try {
      const handlers = await getHandlers();
      try {
        const v4 = await getV4Session(sessionId);
        const existingV4 = await v4.read();
        if (existingV4?.goal) {
          rememberPentestGoal(sessionId, { ...existingV4.goal, workdir: existingV4.goal.workdir });
          return;
        }
      } catch {}
      try {
        const view = await handlers.state({ sessionId });
        if (view?.goal) return;
      } catch {
        // 还没有 state 行，继续创建
      }
      const cwd = typeof session?.header?.cwd === 'string' ? session.header.cwd : '';
      const authorization = (text.match(/授权\s*[：:]\s*([^\n\r。；;]+)/) || [])[1] || '';
      const objective = autoGoalObjective(text, target);
      const workdir = ensureWorkdir(cwd, target, '', sessionId);
      ensureWorkspaceLayout(workdir);
      ensureScopeFile({ cwd, workdir, target, objective, authorization, targets: [target] });
      const v4 = await getV4Session(sessionId);
      const createdV4 = await v4.init({ target, targets: [target], excludedTargets: [], objective, authorization, workdir });
      rememberPentestGoal(sessionId, { ...createdV4.goal, workdir });
      try { ctx.logger?.info?.('pentest: auto-recorded goal for ' + sessionId + ': ' + target); } catch { /* best effort */ }
    } catch (error) {
      autoGoalSessions.delete(sessionId);
      try { ctx.logger?.warn?.('pentest auto-goal: ' + (error?.message || error)); } catch { /* best effort */ }
    }
  };

  // UI "暂停全员任务" sends this phrase as a steer message. Handle it in the
  // host before the model runs so pause is deterministic and not a prompt hop.
  const PAUSE_ALL_RE = /(?:暂停|停止|冻结).{0,6}(?:全员|全部|所有|全部成员|全体).{0,6}任务|(?:pause|stop)\s+all\s+(?:tasks|agents|workers)/i;
  const RESUME_ALL_RE = /(?:恢复|继续|重启).{0,6}(?:全员|全部|所有|全体).{0,6}任务|(?:resume|continue)\s+all\s+(?:tasks|agents|workers)/i;
  const REOPEN_GOAL_RE = /(?:恢复|继续|重新打开|解封).{0,6}(?:目标|goal|测试|会话)|(?:reopen|resume).{0,6}(?:goal|test)/i;
  const WORKER_LIMIT_RE = /(?:并发\s*worker\s*(?:上限)?|worker\s*(?:并发|上限)|并发数)\s*(?:设为|设置为|改成|调整为|[:：=])?\s*(\d+)/i;
  const interruptPentestMembers = async (sessionId) => {
    try {
      const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
      const agent = agents && typeof agents.get === 'function' ? agents.get(sessionId) : undefined;
      if (!agent) return;
      if (typeof agent.cancel === 'function') {
        try { agent.cancel({ kind: 'user' }); } catch { /* best effort */ }
      }
      const teams = typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined;
      if (teams && typeof teams.listMembers === 'function') {
        const members = teams.listMembers(agent) || [];
        for (const member of members) {
          if (!member?.name) continue;
          try { await teams.interrupt(agent, member.name); } catch { /* best effort */ }
        }
      }
    } catch { /* optional Team services are absent in tests */ }
  };
  const interruptPentestWorkers = async (sessionId) => {
    try {
      const v4 = await getV4Session(sessionId);
      const state = await v4.read();
      const subagents = typeof ctx.get === 'function' ? ctx.get('subagents') : undefined;
      const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
      const agent = agents && typeof agents.get === 'function' ? agents.get(sessionId) : undefined;
      if (!state?.tasks || !subagents || typeof subagents.interrupt !== 'function') return;
      for (const task of state.tasks) {
        if (!['queued', 'running', 'claimed'].includes(task.state) || !task.childId) continue;
        try { await subagents.interrupt(task.childId, { kind: 'ancestor', agent }); } catch { /* best effort */ }
      }
    } catch { /* optional subagent service */ }
  };
  // Pause is a hard stop, not just a flag: cancel active tasks and put their
  // directions back on the frontier so Resume can schedule them again.
  const pauseActiveTasks = async (sessionId, runCommand = null) => {
    try {
      const v4 = await getV4Session(sessionId);
      const state = await v4.read();
      const run = runCommand || ((command) => v4.run(command));
      const subagents = typeof ctx.get === 'function' ? ctx.get('subagents') : undefined;
      const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
      const agent = agents && typeof agents.get === 'function' ? agents.get(sessionId) : undefined;
      if (!state?.tasks) return;
      const active = state.tasks.filter((task) => ['queued', 'running', 'claimed'].includes(task.state));
      if (active.length === 0) return;
      // Preserve completed checkpoint work before cancelling: task-7 had two
      // real findings in its checkpoint, but pause cancelled it and the
      // findings never reached canonical state.
      let recovered = 0;
      const dispatcher = subagents && agent && state.goal?.workdir
        ? new V4Dispatcher({ session: v4, subagents, agent, cwd: state.goal.workdir })
        : null;
      if (dispatcher) {
        for (const task of active) {
          try {
            const checkpoint = dispatcher.readCheckpoint(task.id);
            if (!checkpoint || checkpoint.directionState !== 'done' || !checkpoint.conclusion) continue;
            const committed = await dispatcher.commitResult(task.id, { stopReason: 'completed', structured: checkpoint });
            if (committed) recovered += 1;
          } catch { /* fall back to cancelling this task */ }
        }
      }
      // Mark every task terminal before interrupting any child. Interrupting one
      // child can abort sibling activations, and those failures must not turn a
      // deliberate pause into a list of failed tasks.
      for (const task of active) {
        try {
          const fresh = await v4.read();
          const current = (fresh.tasks || []).find((item) => item.id === task.id);
          if (current && !['queued', 'running', 'claimed'].includes(current.state)) continue;
          await run({ type: 'task', op: 'cancel', id: task.id, reason: 'paused by user', now: Date.now() });
        } catch { /* task may have completed while pausing */ }
      }
      if (subagents && typeof subagents.interrupt === 'function') {
        for (const task of active) {
          if (!task.childId) continue;
          try { await subagents.interrupt(task.childId, { kind: 'ancestor', agent }); } catch { /* best effort */ }
        }
      }
      const after = await v4.read();
      for (const task of after.tasks || []) {
        if (task.state !== 'cancelled') continue;
        const direction = (after.directions || []).find((item) => item.id === task.directionId);
        if (direction?.state === 'running') {
          try { await run({ type: 'direction', op: 'update', id: direction.id, state: 'open', reason: 'paused by user' }); } catch { /* best effort */ }
        }
      }
    } catch { /* optional services */ }
  };
  /**
   * HARD RULE (user): only the human may create/resume/pause/end/disarm a goal.
   * Auto-resume/edit was removed because it re-created goals the user deleted.
   * Auto-disarm was removed too: the UI renders `active + disarmed` as
   * "已暂停的目标", so calling goals.disarm() made an ACTIVE goal LOOK paused
   * the moment the user opened it. The goal-round-driver is now disabled at
   * the profile level, so no continuation needs suppressing. The plugin
   * touches NO native goal state at all.
   */
  const setNativeGoalPaused = async (sessionId, pause) => {
    try {
      const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
      const goals = typeof ctx.get === 'function' ? ctx.get('goals') : undefined;
      const agent = agents && typeof agents.get === 'function' ? agents.get(sessionId) : undefined;
      const current = goals && agent && typeof goals.get === 'function' ? goals.get(agent) : undefined;
      if (!current || !agent) return false;
      const ref = { id: current.id, revision: current.revision };
      if (pause && typeof goals.pause === 'function') {
        await goals.pause(agent, ref);
        return true;
      }
      if (!pause && typeof goals.resume === 'function') {
        await goals.resume(agent, ref);
        return true;
      }
    } catch { /* no native goal in tests, or already in the requested phase */ }
    return false;
  };
  const applyPauseDirect = async (sessionId, pause, reason = 'UI/用户暂停') => {
    const handlers = await getHandlers();
    const v4 = await getV4Session(sessionId);
    const v4State = await v4.read();
    // A session log can be structurally corrupt after an external edit
    // (seq gap). Host refuses every event append for that session, so all
    // store.run calls must tolerate that failure while still saving the
    // canonical state table. The UI snapshot is re-emitted best-effort.
    const run = (command) => v4.runTolerant(command);
    const out = v4State?.goal
      ? (pause ? await run({ type: 'goal', op: 'pause' }) : await run({ type: 'goal', op: 'resume' }))
      : (pause
        ? await handlers.pauseAll({ sessionId, reason })
        : await handlers.resumeAll({ sessionId }));
    await setNativeGoalPaused(sessionId, pause);
    if (pause) {
      try { await run({ type: 'settings', op: 'set', autoDispatch: false }); } catch { /* legacy state */ }
      await pauseActiveTasks(sessionId, run);
      await interruptPentestMembers(sessionId);
      await interruptPentestWorkers(sessionId);
    } else {
      const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
      const agent = agents && typeof agents.get === 'function' ? agents.get(sessionId) : undefined;
      if (agent) {
        try { await run({ type: 'settings', op: 'set', autoDispatch: true }); } catch { /* state may be legacy */ }
        void autoAdvanceV4(sessionId, agent, { dispatchOpen: true, force: true }).catch(() => {});
      }
    }
    try { await v4.reproject({ tolerateAppendFailure: true }); } catch { /* projection self-heals on next read */ }
    try { await reprojectSession(sessionId, { tolerateAppendFailure: true }); } catch { /* projection self-heals on next read */ }
    try { ctx.logger?.info?.('pentest: ' + (pause ? 'paused' : 'resumed') + ' all tasks for ' + sessionId); } catch { /* best effort */ }
    return out;
  };
  const commands = typeof ctx.get === 'function' ? ctx.get('commands') : undefined;
  if (commands && typeof commands.register === 'function' && typeof ctx.effect === 'function') {
    const register = (name, description, pause) => () => commands.register({
      definitionId: 'pentest-' + name,
      name,
      description,
      handler: async (invocation) => {
        // The command bridge's invocation.agent can be the active conversation
        // rather than the session that owns the rendered pentest tab. The UI
        // appends the exact graph session id as rawInput; prefer it, then fall
        // back to the agent-derived root for manual slash-command use.
        const explicit = String(invocation?.rawInput || '').trim().split(/\s+/)[0];
        const sessionId = explicit.startsWith('session-')
          ? explicit
          : rootGraphSessionIdOf(invocation, ctx.sessions);
        await applyPauseDirect(sessionId, pause);
        return {
          kind: 'success',
          sessionId,
          text: `${pause ? 'Paused' : 'Resumed'} all pentest tasks in ${sessionId}.`
        };
      }
    });
    ctx.effect(register('pentest-pause-all', 'Pause all pentest tasks and workers.', true), 'pentest direct pause command');
    ctx.effect(register('pentest-resume-all', 'Resume scheduling for all pentest tasks.', false), 'pentest direct resume command');
    // Validation debt can be drained without starting a model turn or a
    // worker: the task console calls this directly.
    ctx.effect(() => commands.register({
      definitionId: 'pentest-audit-pending',
      name: 'pentest-audit-pending',
      description: 'Queue the auditor for every pending finding in this session.',
      handler: async (invocation) => {
        const explicit = String(invocation?.rawInput || '').trim().split(/\s+/)[0];
        const sessionId = explicit.startsWith('session-')
          ? explicit
          : rootGraphSessionIdOf(invocation, ctx.sessions);
        const session = await getV4Session(sessionId);
        const state = await session.read();
        if (!state?.goal) return { kind: 'error', text: 'no v4 goal in this session' };
        const queued = auditPendingFor({ session, state, agent: invocation.agent, force: true });
        try { await reprojectSession(sessionId); } catch { /* projection self-heals */ }
        return {
          kind: 'success',
          queued: queued.queued,
          reason: queued.reason || '',
          text: `Queued ${queued.queued} finding(s) for audit.`
        };
      }
    }), 'pentest audit pending command');
  }
  const autoPauseFromMessage = async (session, message) => {
    const sessionId = session?.id || session?.header?.id;
    if (!sessionId || session?.header?.parentSession) return;
    if (Number(session?.header?.delegationDepth ?? 0) > 0) return;
    if (!String(autoGoalPresetOf(session) || '').startsWith('pentest')) return;
    const text = autoGoalTextOf(message);
    if (text === '') return;
    const workerMatch = text.match(WORKER_LIMIT_RE);
    if (workerMatch) {
      try {
        const v4 = await getV4Session(sessionId);
        const next = await v4.setWorkerLimit(Number(workerMatch[1]));
        try { ctx.logger?.info?.('pentest: worker limit ' + next.settings.workerLimit + ' for ' + sessionId); } catch { /* best effort */ }
        return next.settings;
      } catch (error) {
        try { ctx.logger?.warn?.('pentest worker limit failed: ' + (error?.message || error)); } catch { /* best effort */ }
        return;
      }
    }
    const pause = PAUSE_ALL_RE.test(text);
    const resume = !pause && RESUME_ALL_RE.test(text);
    const reopen = !pause && !resume && REOPEN_GOAL_RE.test(text);
    if (!pause && !resume && !reopen) return;
    try {
      const handlers = await getHandlers();
      if (reopen) {
        const reopened = await handlers.goalReopen({ sessionId, reason: 'UI/用户继续目标' });
        await setNativeGoalPaused(sessionId, false);
        try { ctx.logger?.info?.('pentest: reopened goal for ' + sessionId); } catch { /* best effort */ }
        return reopened;
      }
      const v4 = await getV4Session(sessionId);
      const v4State = await v4.read();
      const out = v4State?.goal
        ? (pause ? await v4.pause() : await v4.resume())
        : (pause
          ? await handlers.pauseAll({ sessionId, reason: 'UI/用户暂停' })
          : await handlers.resumeAll({ sessionId }));
      await setNativeGoalPaused(sessionId, pause);
      if (pause) {
        try { await v4.setAutoDispatch(false); } catch { /* legacy state */ }
        await pauseActiveTasks(sessionId);
        await interruptPentestMembers(sessionId);
        await interruptPentestWorkers(sessionId);
      } else if (resume) {
        const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
        const agent = agents && typeof agents.get === 'function' ? agents.get(sessionId) : undefined;
        try { await v4.setAutoDispatch(true); } catch { /* state may be legacy */ }
        if (agent) void autoAdvanceV4(sessionId, agent, { dispatchOpen: true, force: true }).catch(() => {});
      }
      try { await reprojectSession(sessionId); } catch { /* projection self-heals on next read */ }
      try { ctx.logger?.info?.('pentest: ' + (pause ? 'paused' : 'resumed') + ' all tasks for ' + sessionId); } catch { /* best effort */ }
      return out;
    } catch (error) {
      try { ctx.logger?.warn?.('pentest pause/resume failed: ' + (error?.message || error)); } catch { /* best effort */ }
    }
  };
  if (typeof ctx.on === 'function') {
    ctx.effect(() => {
      const stop = ctx.on('session/event', (session, event) => {
        if (!event || event.type !== 'user/message') return;
        const message = event.data;
        if (!message) return;
        const controlText = autoGoalTextOf(message);
        const isControl = controlText !== '' && (PAUSE_ALL_RE.test(controlText) || RESUME_ALL_RE.test(controlText) || REOPEN_GOAL_RE.test(controlText) || WORKER_LIMIT_RE.test(controlText));
        // UI control buttons may arrive with a non-user source kind. Handle the
        // deterministic pause/resume controls before filtering for auto-goal.
        if (isControl) void autoPauseFromMessage(session, message).catch(() => {});
        if (message.source?.kind !== 'user') return;
        // Read once per user turn so a live session reprojects its current
        // snapshot; the read path itself is pure and never repairs state.
        if (autoGoalPresetOf(session) === 'pentest' && !session?.header?.parentSession) {
          const repairSessionId = session?.id || session?.header?.id;
          if (repairSessionId) {
            void (async () => {
              try { await reprojectSession(repairSessionId); } catch { /* 还没有 state 行 */ }
            })();
          }
        }
        void autoGoalFromMessage(session, message).catch(() => {});
      });
      return () => {
        if (typeof stop === 'function') stop();
      };
    }, 'pentest-v2.auto-goal');
  }


  // ── 文件落盘强制：所有测试脚本/文件必须落在 goal.workdir 或其子目录 ──
  // 只对渗透图根会话（含其成员）生效；用户明确下命令指定外部路径时例外。
  // Host file tools use several generations of names; a missing alias means
  // the boundary guard silently lets a write escape goal.workdir. The Web
  // smoke test caught `write_file` writing to an absolute Desktop path.
  const FILE_WRITE_TOOLS = new Set([
    'write', 'write_file', 'edit', 'edit_file', 'multi_edit',
    'create_file', 'str_replace_editor', 'apply_patch', 'append_file'
  ]);
  const SHELL_TOOLS = new Set(['pwsh', 'bash', 'shell', 'cmd', 'powershell']);
  const workdirGuard = async (exec, next) => {
    try {
      const name = String(exec && exec.name || '');
      if (!FILE_WRITE_TOOLS.has(name) && !SHELL_TOOLS.has(name)) return next();
      if (!isPentestGuardSession(exec)) return next();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      if (!sessionId) return next();
      const handlers = await getHandlers();
      let view;
      try { view = await handlers.state({ sessionId }); } catch { return next(); }
      let goal = view && view.goal ? view.goal : null;
      if (!goal) {
        try {
          const v4 = await getV4Session(sessionId);
          const v4State = await v4.read();
          if (v4State?.goal) goal = v4State.goal;
        } catch {}
      }
      if (!goal) return next();
      const goalRoot = String(goal.workdir || '').trim();
      if (goalRoot === '') {
        if (FILE_WRITE_TOOLS.has(name)) {
          return { kind: 'deny', reason: platformGuardReason('【文件落盘拦截】当前渗透 goal 还没有 workdir；先调用 pentest_add_goal 指定工作目录，再写文件。') };
        }
        return next();
      }
      const cwd = exec && exec.agent && exec.agent.session && exec.agent.session.header ? String(exec.agent.session.header.cwd || '') : '';
      const userText = latestUserTextOf(exec);
      const args = parseToolArgs(exec.arguments);

      if (FILE_WRITE_TOOLS.has(name)) {
        const raw = args.file_path || args.path || args.filename || args.file || '';
        if (raw === '') {
          return { kind: 'deny', reason: platformGuardReason('【文件落盘拦截】无法确定写入路径；请使用 write/edit 的 file_path，并写在 ' + goalRoot + ' 下。') };
        }
        const target = resolveModelPath(cwd, raw);
        // 相对路径：如果它落在会话根目录而不是 workdir，自动改写到 workdir 下同名位置。
        if (!isInsideRoot(goalRoot, target) && !path.isAbsolute(String(raw)) && !userAllowsOutside(userText, target)) {
          const underWorkdir = resolveModelPath(goalRoot, raw);
          if (isInsideRoot(goalRoot, underWorkdir)) {
            if (args.file_path !== undefined) args.file_path = underWorkdir;
            else if (args.path !== undefined) args.path = underWorkdir;
            else if (args.filename !== undefined) args.filename = underWorkdir;
            else if (args.file !== undefined) args.file = underWorkdir;
            exec.arguments = args;
            return next();
          }
        }
        if (!isInsideRoot(goalRoot, target) && !userAllowsOutside(userText, target)) {
          return {
            kind: 'deny',
            reason: platformGuardReason('【文件落盘拦截】渗透会话的测试脚本/文件只能写到工作目录或其子目录：\n' + goalRoot + '\n目标路径：' + target + '\n请改写到工作目录下；只有用户明确命令指定外部路径时才允许例外。')
          };
        }
        return next();
      }

      // Shell：默认把 workdir 注入为会话工作目录，并拒绝越界的 workdir / 写文件目标。
      const command = String(args.command || '');
      let workdir = args.workdir;
      if (workdir === undefined || workdir === null || String(workdir).trim() === '') {
        workdir = goalRoot;
        args.workdir = goalRoot;
        exec.arguments = args;
      } else {
        const resolved = resolveModelPath(cwd, workdir);
        if (!isInsideRoot(goalRoot, resolved) && !userAllowsOutside(userText, resolved)) {
          return {
            kind: 'deny',
            reason: '【文件落盘拦截】shell workdir 必须在渗透工作目录下：\n' + goalRoot + '\n收到：' + resolved + '\n请传 workdir=' + goalRoot + '；只有用户明确命令指定外部路径时才允许例外。'
          };
        }
        args.workdir = resolved;
        exec.arguments = args;
      }
      if (shellWriteLike(command)) {
        const outside = shellOutsideTargets(command, goalRoot, cwd, args.workdir).filter((target) => !userAllowsOutside(userText, target));
        if (outside.length > 0) {
          return {
            kind: 'deny',
            reason: '【文件落盘拦截】命令的写入目标不在渗透工作目录下：\n' + outside.join('\n') + '\n工作目录：' + goalRoot + '\n请把脚本/输出/下载改到工作目录或其子目录；只有用户明确命令指定外部路径时才允许例外。'
          };
        }
      }
      return next();
    } catch {
      return next();
    }
  };
  if (typeof ctx.on === 'function') {
    ctx.effect(() => {
      const stop = ctx.on('tools/pre-execute', async (exec, next) => workdirGuard(exec, next));
      return () => { if (typeof stop === 'function') stop(); };
    }, 'pentest-v2.workdir-guard');
  }

  // Phase 3: structured scope guard for network calls and destructive writes.
  // File writes are already covered by workdirGuard; this layer prevents
  // out-of-scope hosts even when the command itself stays under the workdir.
  const NETWORK_TOOLS = new Set(['browser', 'browser_navigate', 'browser_open', 'web_fetch', 'fetch', 'http_request']);
  // External read-only research must not be constrained by the target scope.
  const EXTERNAL_READ_TOOLS = new Set(['web_fetch', 'fetch']);
  const WRITE_INTENT_RE = /(?:^|[\s;&|])(?:curl(?:\.exe)?|Invoke-WebRequest|Invoke-RestMethod|wget(?:\.exe)?)\b/i;
  const WORKER_READONLY_PENTEST = new Set(['pentest_state', 'pentest_plan', 'pentest_flow_status', 'pentest_flow_plan', 'pentest_flow_report']);
  const V3_WRITE_WHEN_V4 = new Set([
    'pentest_add_goal', 'pentest_set_scope', 'pentest_add_intent', 'pentest_add_fact',
    'pentest_add_finding', 'pentest_submit', 'pentest_dispatch', 'pentest_validate',
    'pentest_queue_sync', 'pentest_queue_claim', 'pentest_queue_renew', 'pentest_queue_spend',
    'pentest_queue_complete', 'pentest_queue_fail'
  ]);
  const scopeGuard = async (exec, next) => {
    try {
      // All scope/single-track denials are pentest-preset only. Standard and
      // other modes must pass through untouched, even if a stale goal exists.
      if (!isPentestGuardSession(exec)) return next();
      const name = String(exec && exec.name || '');
      const currentSessionId = String(exec?.agent?.session?.id || exec?.agent?.session?.header?.id || '');
      let rootSessionId = '';
      try { rootSessionId = String(rootGraphSessionIdOf(exec, ctx.sessions) || ''); } catch {}
      if (currentSessionId && rootSessionId && currentSessionId !== rootSessionId
        && name.startsWith('pentest_') && !WORKER_READONLY_PENTEST.has(name)) {
        return { kind: 'deny', reason: platformGuardReason('【v4 单轨】worker 只能做任务并提交结果，不能直接写父会话的渗透图谱；请把结论放在最终 JSON 里。') };
      }
      let v4Goal = null;
      if (rootSessionId && (name === 'spawn_teammate' || V3_WRITE_WHEN_V4.has(name))) {
        try {
          const v4 = await getV4Session(rootSessionId);
          const v4State = await v4.read();
          v4Goal = v4State?.goal || null;
        } catch {}
      }
      if (v4Goal && v4Goal.phase === 'active' && V3_WRITE_WHEN_V4.has(name)) {
        return { kind: 'deny', reason: platformGuardReason('【v4 单轨】该会话已有 v4 目标，禁止再写 v3 图谱；请用 pentest_flow_direction / pentest_flow_dispatch / pentest_flow_validate。') };
      }
      if (name === 'spawn_teammate' && v4Goal && v4Goal.phase === 'active') {
        return { kind: 'deny', reason: platformGuardReason('【v4 单轨】该会话已有 v4 目标，禁止 spawn_teammate；请用 pentest_flow_direction 加方向，再用 pentest_flow_dispatch 派工。') };
      }
      if (!SHELL_TOOLS.has(name) && !NETWORK_TOOLS.has(name)) return next();
      if (EXTERNAL_READ_TOOLS.has(name)) return next();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      if (!sessionId) return next();
      const handlers = await getHandlers();
      let view;
      try { view = await handlers.state({ sessionId }); } catch { return next(); }
      let goal = view && view.goal ? view.goal : null;
      if (!goal) {
        try {
          const v4 = await getV4Session(sessionId);
          const v4State = await v4.read();
          if (v4State?.goal) goal = v4State.goal;
        } catch {}
      }
      if (!goal) return next();
      const args = parseToolArgs(exec.arguments);
      const userText = latestUserTextOf(exec);
      const text = SHELL_TOOLS.has(name)
        ? String(args.command || '')
        : JSON.stringify(args);
      // Shell tooling (pip/git/npm) may legitimately reach package hosts; only
      // inspect explicit HTTP-client invocations.
      if (SHELL_TOOLS.has(name) && !/\b(?:curl(?:\.exe)?|wget(?:\.exe)?|Invoke-WebRequest|Invoke-RestMethod)\b/i.test(text)) return next();
      if (WRITE_INTENT_RE.test(text) && isDestructiveRequest(text) && !userAllowsMutation(userText) && String(goal.authorization || '') === '') {
        return {
          kind: 'deny',
          reason: platformGuardReason('【Scope/写操作拦截】检测到生产数据的 update/delete/PUT/PATCH 类请求。默认禁止修改生产数据；只有用户明确允许修改测试数据时才可继续。')
        };
      }
      const candidates = networkCandidatesFrom(text);
      if (candidates.length === 0) return next();
      const denied = [];
      for (const candidate of candidates) {
        const result = checkNetworkTarget(goal, candidate.value, { allowResearch: NETWORK_TOOLS.has(name) });
        if (!result.allowed) denied.push(result.reason);
      }
      if (denied.length > 0) {
        return { kind: 'deny', reason: platformGuardReason('【Scope/网络目标拦截】\n' + [...new Set(denied)].join('\n')) };
      }
      return next();
    } catch {
      return next();
    }
  };
  if (typeof ctx.on === 'function') {
    ctx.effect(() => {
      const stop = ctx.on('tools/pre-execute', async (exec, next) => scopeGuard(exec, next));
      return () => { if (typeof stop === 'function') stop(); };
    }, 'pentest-v2.scope-guard');
  }

  // Monotonic boundary for paths/URLs. The waterfall guards above remain the
  // rich policy; this guard is order-independent and uses a synchronous goal
  // cache populated by add_goal/ensure.
  const hardBoundaryGuard = (execution) => {
    try {
      const name = String(execution?.name || '');
      if (!isPentestGuardSession(execution)) return undefined;
      const isFile = FILE_WRITE_TOOLS.has(name);
      const isShell = SHELL_TOOLS.has(name);
      const isNetwork = NETWORK_TOOLS.has(name);
      if (isNetwork && EXTERNAL_READ_TOOLS.has(name)) return undefined;
      if (!isFile && !isShell && !isNetwork) return undefined;
      const sessionId = rootGraphSessionIdOf(execution, ctx.sessions);
      const goal = sessionId ? pentestGoals.get(sessionId) : undefined;
      if (!goal) return undefined;
      const args = parseToolArgs(execution.arguments);
      const cwd = execution?.agent?.session?.header?.cwd ? String(execution.agent.session.header.cwd) : '';
      const userText = latestUserTextOf(execution);
      if (isFile) {
        const raw = args.file_path || args.path || args.filename || args.file || '';
        // Normal relative paths are rewritten to workdir by the waterfall
        // guard; absolute paths and explicit parent traversal are hard-denied
        // when they escape the workspace.
        const rawText = String(raw);
        const escapingRelative = !path.isAbsolute(rawText) && /^\.\.(?:[\\/]|$)/.test(rawText);
        if (raw !== '' && (path.isAbsolute(rawText) || escapingRelative)) {
          const target = resolveModelPath(cwd, raw);
          if (!isInsideRoot(goal.workdir, target) && !userAllowsOutside(userText, target)) {
            return platformGuardReason('【工作目录硬拦截】文件必须写在 ' + goal.workdir + ' 或其子目录：' + target);
          }
        }
        return undefined;
      }
      const text = isShell ? String(args.command || '') : JSON.stringify(args);
      if (isShell) {
        const rawWorkdir = args.workdir;
        if (rawWorkdir !== undefined && rawWorkdir !== null && String(rawWorkdir).trim() !== '') {
          const resolved = resolveModelPath(cwd, rawWorkdir);
          if (!isInsideRoot(goal.workdir, resolved) && !userAllowsOutside(userText, resolved)) {
            return platformGuardReason('【工作目录硬拦截】shell workdir 必须位于 ' + goal.workdir + '：' + resolved);
          }
        }
        if (shellWriteLike(text)) {
          if (args.workdir === undefined || args.workdir === null || String(args.workdir).trim() === '') {
            return platformGuardReason('【工作目录硬拦截】会写文件的 shell 命令必须显式传 workdir=' + goal.workdir);
          }
          const outside = shellOutsideTargets(text, goal.workdir, cwd, args.workdir)
            .filter((target) => !userAllowsOutside(userText, target));
          if (outside.length > 0) {
            return platformGuardReason('【工作目录硬拦截】shell 写入目标越界：' + outside.join(', '));
          }
        }
      }
      if (isShell && !/\b(?:curl(?:\.exe)?|wget(?:\.exe)?|Invoke-WebRequest|Invoke-RestMethod)\b/i.test(text)) return undefined;
      if (isShell && WRITE_INTENT_RE.test(text) && isDestructiveRequest(text) && !userAllowsMutation(userText) && String(goal.authorization || '') === '') {
        return platformGuardReason('【Scope 硬拦截】检测到生产数据 update/delete 类请求；需要用户明确允许修改测试数据。');
      }
      const candidates = networkCandidatesFrom(text);
      if (candidates.length === 0) return undefined;
      const denied = [];
      for (const candidate of candidates) {
        const result = checkNetworkTarget(goal, candidate.value, { allowResearch: isNetwork });
        if (!result.allowed) denied.push(result.reason);
      }
      if (denied.length > 0) return platformGuardReason('【Scope 硬拦截】\n' + [...new Set(denied)].join('\n'));
      return undefined;
    } catch {
      return undefined;
    }
  };
  if (typeof ctx.tools?.guard === 'function') {
    ctx.effect(() => {
      const dispose = ctx.tools.guard(hardBoundaryGuard);
      return () => { if (typeof dispose === 'function') dispose(); };
    }, 'pentest-v2.boundary-hard-guard');
  }

  // A pentest goal stays active until the human explicitly ends/pauses it.
  // The DSH-native `update_goal` tool must not let the model mark the goal
  // blocked/complete/paused on its own.
  const goalLifecycleGuard = (execution) => {
    try {
      if (String(execution?.name || '') !== 'update_goal') return undefined;
      if (!isPentestGuardSession(execution)) return undefined;
      const sessionId = rootGraphSessionIdOf(execution, ctx.sessions);
      if (!sessionId) return undefined;
      const args = parseToolArgs(execution.arguments);
      const action = String(args.action || '');
      if (!['blocked', 'complete', 'pause'].includes(action)) return undefined;
      // 受阻 is never allowed from the model, even with an "explicit" message
      // in context (planner heartbeats are injected as user messages).
      if (action === 'blocked') {
        return '【目标保护】渗透目标不允许被模型标记为受阻；只有用户能暂停或结束任务。目标保持原状态，继续推进或等待用户指示。';
      }
      const userText = latestUserTextOf(execution);
      if (action === 'pause' ? userExplicitlyPausesGoal(userText) : userExplicitlyEndsGoal(userText)) return undefined;
      return '【目标保护】渗透目标不会由模型自动 complete/pause；只有用户明确要求时才允许。';
    } catch {
      return undefined;
    }
  };
  if (typeof ctx.tools?.guard === 'function') {
    ctx.effect(() => {
      const dispose = ctx.tools.guard(goalLifecycleGuard);
      return () => { if (typeof dispose === 'function') dispose(); };
    }, 'pentest-v2.goal-lifecycle-guard');
  }

  ctx.tools.register(tool({
    name: 'pentest_migrate',
    description: 'Migrate this session from the legacy pentest tables into one v2 state row and emit the first UI snapshot. Idempotent.',
    parameters: {},
    execute: call((h, args, sessionId) => h.migrate({ sessionId }), { skipEnsure: true })
  }));

  ctx.tools.register(tool({
    name: 'pentest_migrate_v3',
    description: 'Dry-run or apply the v2 -> v3 schema migration for this session. write=false is read-only; write=true replaces this state row and emits a v3 snapshot. Back up the state store before a bulk migration.',
    parameters: {
      write: { type: 'boolean', description: 'false=dry-run (default), true=replace the state row and emit v3 snapshot' }
    },
    execute: call((h, args, sessionId) => h.migrateV3({ sessionId, write: args.write === true }), { skipEnsure: true })
  }));

  ctx.tools.register(tool({
    name: 'pentest_add_goal',
    description: 'Initialize a pentest engagement. This MUST be the first action after the user gives a target: record target/objective before recon/scripts/delegation. Calling again updates target/objective without wiping the graph.',
    parameters: {
      target: { type: 'string', required: true, description: 'Authorized target URL/domain/IP.' },
      objective: { type: 'string', required: true, description: 'Engagement objective.' },
      authorization: { type: 'string', description: 'Authorization note.' },
      workdir: WORKDIR_PARAM,
      targets: { type: 'array', items: { type: 'string' }, description: 'Structured in-scope targets (URL/domain/IP[:port], wildcard *.domain).' },
      excludedTargets: { type: 'array', items: { type: 'string' }, description: 'Explicit out-of-scope targets.' }
    },
    execute: async (args, exec) => {
      const handlers = await getHandlers();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const cwd = typeof exec?.agent?.session?.header?.cwd === 'string' ? exec.agent.session.header.cwd : '';
      const workdir = ensureWorkdir(cwd, args.target, args.workdir, sessionId);
      const out = await handlers.addGoal({
        sessionId,
        target: args.target,
        objective: args.objective,
        authorization: args.authorization,
        workdir,
        targets: args.targets,
        excludedTargets: args.excludedTargets
      });
      ensureScopeFile({
        cwd,
        workdir: out.workdir || workdir,
        target: args.target,
        objective: args.objective,
        authorization: args.authorization,
        targets: out.targets || args.targets || [],
        excludedTargets: out.excludedTargets || args.excludedTargets || []
      });
      ensureWorkspaceLayout(out.workdir || workdir);
      rememberPentestGoal(sessionId, { ...out, workdir: out.workdir || workdir });
      return out;
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_set_scope',
    description: 'Replace the structured scope in state. targets are in-scope URL/domain/IP[:port] entries; excludedTargets always win.',
    parameters: {
      targets: { type: 'array', items: { type: 'string' }, required: true },
      excludedTargets: { type: 'array', items: { type: 'string' } }
    },
    execute: async (args, exec) => {
      const handlers = await getHandlers();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const cwd = typeof exec?.agent?.session?.header?.cwd === 'string' ? exec.agent.session.header.cwd : '';
      const out = await handlers.setScope({
        sessionId,
        targets: args.targets,
        excludedTargets: args.excludedTargets || []
      });
      try {
        const view = await handlers.state({ sessionId });
        if (view?.goal) rememberPentestGoal(sessionId, view.goal);
        ensureScopeFile({
          cwd,
          workdir: view?.goal?.workdir || '',
          target: view?.goal?.target || '',
          objective: view?.goal?.objective || '',
          authorization: view?.goal?.authorization || '',
          targets: out.targets,
          excludedTargets: out.excludedTargets,
          force: true
        });
        ensureWorkspaceLayout(view?.goal?.workdir || '');
      } catch { /* scope write is best effort; state is canonical */ }
      return out;
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_add_intent',
    description: 'Add one exploration intent (direction). A queue task is created and its taskId returned; dispatch that task with pentest_dispatch or execute directly. Findings are first-class and may be recorded as unbound when the source direction is not yet clear.',
    parameters: {
      title: { type: 'string', required: true, description: 'One distinct direction; do not repeat an existing title.' },
      detail: { type: 'string', description: 'Concrete scope of this direction.' },
      doneWhen: { type: 'string', description: 'Observable completion criterion.' },
      kind: { type: 'string', enum: ['recon', 'verify', 'exploit', 'report'], description: 'recon=侦察方向（只产出事实/资产）；verify/exploit=验证或利用方向（可产出漏洞）。默认 recon。' },
      priority: { type: 'number', description: 'Higher runs earlier.' },
      dependsOn: { type: 'array', items: { type: 'string' }, description: 'Intent ids that must be done first.' },
      fromFactId: { type: 'string', description: 'Derive this intent from a fact; creates a derived_from edge.' },
      budget: { type: 'object', additionalProperties: true, description: 'Optional task budget {maxCalls,maxMs,maxEvidence}; 0 means unlimited.' },
      maxCalls: { type: 'number' },
      maxMs: { type: 'number' },
      maxEvidence: { type: 'number' }
    },
    execute: call((h, args, sessionId) => h.addIntent({
      sessionId,
      title: args.title,
      detail: args.detail,
      doneWhen: args.doneWhen,
      kind: args.kind,
      priority: args.priority,
      dependsOn: args.dependsOn,
      fromFactId: args.fromFactId,
      budget: args.budget,
      maxCalls: args.maxCalls,
      maxMs: args.maxMs,
      maxEvidence: args.maxEvidence
    }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_update_intent',
    description: 'Set one intent terminal state. Valid states: open/running/done/exhausted/blocked/stopped.',
    parameters: {
      intentId: { type: 'string', required: true },
      state: { type: 'string', required: true, enum: ['open', 'running', 'done', 'exhausted', 'blocked', 'stopped'] },
      reason: { type: 'string' }
    },
    execute: call((h, args, sessionId) => h.updateIntent({ sessionId, intentId: args.intentId, state: args.state, reason: args.reason }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_add_fact',
    description: 'Record one fact yielded by an intent. Duplicate facts are reused.',
    parameters: {
      intentId: { type: 'string', required: true },
      detail: { type: 'string', required: true },
      kind: { type: 'string', description: 'info/service/http/vuln/etc.' },
      target: { type: 'string' },
      confidence: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      evidenceRefs: { type: 'array', items: { type: 'string' } }
    },
    execute: call((h, args, sessionId) => h.addFact({
      sessionId,
      intentId: args.intentId,
      kind: args.kind,
      target: args.target,
      detail: args.detail,
      confidence: args.confidence,
      evidenceRefs: args.evidenceRefs
    }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_add_asset',
    description: 'Record one asset. Duplicate values are reused, never duplicated.',
    parameters: {
      type: { type: 'string', required: true, enum: ['root-domain', 'subdomain', 'ip', 'service', 'app', 'endpoint'] },
      value: { type: 'string', required: true },
      meta: { type: 'string' },
      parentId: { type: 'string' },
      inScope: { type: 'boolean' }
    },
    execute: call(async (h, args, sessionId) => {
      const result = await h.addAsset({
        sessionId,
        assetType: args.type,
        value: args.value,
        meta: args.meta,
        parentId: args.parentId,
        inScope: args.inScope
      });
      // Best-effort global mirror; a full asset graph must never fail the
      // canonical engagement write.
      let scopeKey = '';
      try {
        const view = await h.state({ sessionId });
        scopeKey = scopeKeyForTarget(view.goal?.target, sessionId);
        const graph = await getAssetGraphStore();
        await graph.add(sessionId, [{ type: args.type, value: args.value, meta: args.meta }], scopeKey);
      } catch { /* global index is an enhancement, not a write dependency */ }
      return scopeKey ? { ...result, scopeKey } : result;
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_add_finding',
    description: 'Record one vulnerability finding for a client deliverable. description and riskAnalysis are each a 1-2 sentence summary. reproducibleSteps is REQUIRED and each step must contain a complete raw HTTP request packet (request line + Host + required headers + blank line + body) so Burp can replay it without reconstruction; do not omit the packet. intentId is optional source lineage: if unknown, record now with sourceStatus=unbound and link later; findings are first-class and never wrapped in synthetic verify intents.',
    parameters: {
      title: { type: 'string', required: true },
      severity: { type: 'string', required: true, enum: ['critical', 'high', 'medium', 'low', 'info'] },
      intentId: { type: 'string', description: 'Optional source direction. Omit when the source is not yet known; the finding is marked unbound.' },
      fromFactId: { type: 'string', description: 'Optional fact that produced this finding.' },
      reproducibleSteps: { type: 'array', items: { type: 'string' }, required: true },
      stepNotes: { type: 'array', items: { type: 'string' }, description: 'One concise explanation per reproducible step, same order/length: what this step does, why, and what response feature is expected. The report prints it before the raw packet; do not leave it empty.' },
      stepResponses: { type: 'array', items: { type: 'string' }, description: 'Optional raw response body/headers for each step, same order/length. Stored as content-addressed evidence and printed under 返回.' },
      stepExpected: { type: 'array', items: { type: 'string' }, description: 'Optional expected result per step, same order/length. Printed before the response so a reader can tell a hit from a miss.' },
      apiSources: { type: 'array', items: { type: 'string' }, description: 'Where this endpoint comes from: JS bundle URL/path, source file, route definition, or static chunk. Required when the finding is only an endpoint/link. Example: https://target/static/js/app.3f2a.js -> /api/user/list.' },
      dedupeKey: { type: 'string', description: 'Stable root-cause key, e.g. CWE-862:/api/index.php?ctl=bruce. Same root cause across hosts MUST reuse one key and merge affectedAssets instead of creating duplicate findings.' },
      description: { type: 'string' },
      riskAnalysis: { type: 'string' },
      remediation: { type: 'string' },
      affectedAssetId: { type: 'string' },
      affectedAssets: { type: 'array', items: { type: 'string' } },
      evidenceStatus: { type: 'string', enum: ['confirmed', 'likely', 'unverified'] },
      verificationLevel: { type: 'string', enum: ['source_only', 'local_harness', 'live_readonly', 'live_state_change', 'confirmed'], description: 'How far this finding was actually verified; do not use confirmed for source-only or harness-only evidence.' },
      impactProven: { type: 'string', enum: ['none', 'info', 'read', 'write', 'rce'] },
      preconditions: { type: 'string', enum: ['unauth', 'low-priv', 'auth', 'interactive', 'internal'] },
      scope: { type: 'string', enum: ['single', 'multi', 'all'] },
      impactEvidence: { type: 'string' },
      evidenceRefs: { type: 'array', items: { type: 'string' } },
      poc: { type: 'string' },
      counterevidence: { type: 'string' },
      confidence: { type: 'number' },
      noAssetReason: { type: 'string' },
      validation: { type: 'object', additionalProperties: true },
      retest: { type: 'object', additionalProperties: true },
      trafficRef: { type: 'string' },
      report: { type: 'string' }
    },
    execute: call((h, args, sessionId) => h.addFinding({ sessionId, ...args }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_update_finding',
    description: 'Patch one existing finding. Use this to add report-ready reproducibleSteps, remediation, affectedAssetId or evidence fields to a finding created before those fields were required.',
    parameters: {
      id: { type: 'string', required: true },
      title: { type: 'string' },
      severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
      intentId: { type: 'string' },
      reproducibleSteps: { type: 'array', items: { type: 'string' } },
      stepNotes: { type: 'array', items: { type: 'string' }, description: 'One explanation per step, same order/length.' },
      stepResponses: { type: 'array', items: { type: 'string' }, description: 'Raw response per step, same order/length. Replacing reproducibleSteps resets it unless supplied together.' },
      stepExpected: { type: 'array', items: { type: 'string' }, description: 'Expected result per step, same order/length. Replacing reproducibleSteps resets it unless supplied together.' },
      apiSources: { type: 'array', items: { type: 'string' }, description: 'JS bundle/source file/route definition that exposes this endpoint.' },
      dedupeKey: { type: 'string' },
      description: { type: 'string' },
      riskAnalysis: { type: 'string' },
      remediation: { type: 'string' },
      affectedAssetId: { type: 'string' },
      affectedAssets: { type: 'array', items: { type: 'string' } },
      evidenceStatus: { type: 'string', enum: ['confirmed', 'likely', 'unverified'] },
      verificationLevel: { type: 'string', enum: ['source_only', 'local_harness', 'live_readonly', 'live_state_change', 'confirmed'], description: 'How far this finding was actually verified; do not use confirmed for source-only or harness-only evidence.' },
      impactProven: { type: 'string', enum: ['none', 'info', 'read', 'write', 'rce'] },
      preconditions: { type: 'string', enum: ['unauth', 'low-priv', 'auth', 'interactive', 'internal'] },
      scope: { type: 'string', enum: ['single', 'multi', 'all'] },
      impactEvidence: { type: 'string' },
      evidenceRefs: { type: 'array', items: { type: 'string' } },
      poc: { type: 'string' },
      counterevidence: { type: 'string' },
      confidence: { type: 'number' },
      noAssetReason: { type: 'string' },
      validation: { type: 'object', additionalProperties: true },
      retest: { type: 'object', additionalProperties: true },
      trafficRef: { type: 'string' },
      report: { type: 'string' }
    },
    execute: call((h, args, sessionId) => h.updateFinding({ sessionId, ...args }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_validate_finding',
    description: 'Record an independent validation verdict for a finding. reproduced requires the request/response evidence; not_reproduced/inconclusive explain why.',
    parameters: {
      id: { type: 'string', description: 'Finding id (alias: findingId).' },
      findingId: { type: 'string', description: 'Alias for id.' },
      verdict: { type: 'string', required: true, enum: ['reproduced', 'not_reproduced', 'inconclusive'] },
      evidenceRefs: { type: 'array', items: { type: 'string' } },
      notes: { type: 'string' },
      validator: { type: 'string' }
    },
    execute: call((h, args, sessionId) => h.validateFinding({
      sessionId,
      ...args,
      id: args.id || args.findingId
    }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_retest_finding',
    description: 'Record a retest result on an existing finding. Use after remediation or a later verification pass.',
    parameters: {
      id: { type: 'string', description: 'Finding id (alias: findingId).' },
      findingId: { type: 'string', description: 'Alias for id.' },
      verdict: { type: 'string', enum: ['fixed', 'still_present', 'inconclusive'] },
      summary: { type: 'string' }
    },
    execute: call((h, args, sessionId) => h.retestFinding({
      sessionId,
      ...args,
      id: args.id || args.findingId
    }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_state',
    description: 'Read the canonical engagement state. Default returns the full graph (legacy). Pass view:"brief" for a small context-budget view: counts, frontier, recent fact answers, stuck tasks and unvalidated high/critical findings.',
    parameters: {
      view: { type: 'string', enum: ['full', 'brief'], description: 'full (default) returns the legacy payload; brief returns counts + actionable items only.' },
      limit: { type: 'number', description: 'Max items per brief section (1-50, default 10).' }
    },
    execute: call((h, args, sessionId) => h.state({ sessionId, view: args.view, limit: args.limit }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_runtime_probe',
    description: 'Diagnostic (read-only): report which DSH host services and subagent providers this pentest plugin can see at runtime, including each provider outputSchema capability. Use before wiring v4 dispatch.',
    parameters: {},
    execute: async (_args, exec) => {
      const get = (name) => {
        try { return typeof ctx.get === 'function' ? ctx.get(name) : undefined } catch { return undefined; }
      };
      const subagents = get('subagents');
      const providers = [];
      if (subagents && typeof subagents.list === 'function') {
        for (const name of subagents.list() || []) {
          let capabilities = null;
          let inheritsParentContext = null;
          try {
            const provider = subagents.getProvider?.(name);
            capabilities = provider?.capabilities ?? null;
            inheritsParentContext = provider?.inheritsParentContext ?? null;
          } catch { /* provider inspection is best effort */ }
          providers.push({ name, capabilities, inheritsParentContext });
        }
      }
      const teams = get('agentTeams');
      let team = null;
      try {
        if (teams && typeof teams.membership === 'function' && exec?.agent) {
          const membership = teams.membership(exec.agent);
          team = membership ? { role: membership.role, name: membership.name } : null;
        }
      } catch { team = null; }
      return {
        services: {
          subagents: Boolean(subagents),
          agentTeams: Boolean(teams),
          goals: Boolean(get('goals')),
          tokenMeter: Boolean(get('tokenMeter')),
          spillStore: Boolean(get('spillStore'))
        },
        providers,
        team,
        note: 'providers[].capabilities.outputSchema tells whether structured worker output is available'
      };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_start',
    description: 'Start a v4 engagement: axis-based directions, evidence-gated findings and single-track dispatch. Use this instead of pentest_add_goal for new sessions.',
    parameters: {
      target: { type: 'string', required: true },
      targets: { type: 'array', items: { type: 'string' }, description: 'Structured in-scope targets; defaults to [target].' },
      excludedTargets: { type: 'array', items: { type: 'string' } },
      objective: { type: 'string', required: true },
      authorization: { type: 'string' },
      workdir: { type: 'string' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const cwd = exec?.agent?.session?.header?.cwd || process.cwd();
      const workdir = ensureWorkdir(cwd, args.target, args.workdir, sessionId);
      const targets = Array.isArray(args.targets) && args.targets.length > 0 ? args.targets : [args.target];
      const excludedTargets = Array.isArray(args.excludedTargets) ? args.excludedTargets : [];
      const authorization = normalizeAuthorization(args.authorization || '');
      ensureWorkspaceLayout(workdir);
      const session = await getV4Session(sessionId);
      const existing = await session.read();
      const scopeChanged = Boolean(existing) && (
        String(authorization) !== String(existing.goal?.authorization || '') ||
        String(args.objective || '') !== String(existing.goal?.objective || '') ||
        JSON.stringify(targets) !== JSON.stringify(existing.goal?.targets || [])
      );
      ensureScopeFile({ cwd, workdir, target: args.target, objective: args.objective, authorization: authorization || existing?.goal?.authorization || '', targets, excludedTargets, force: scopeChanged });
      if (existing) {
        const currentTargets = Array.isArray(existing.goal?.targets) ? existing.goal.targets : [];
        let goal = existing.goal;
        let revision = existing.revision;
        const patch = { targets, excludedTargets };
        // One-way migration: strip Lead-authored "verifiable authorization"
        // gates from historical engagements even when the caller does not
        // resend authorization. Explicit user scope/red lines are preserved.
        const existingAuth = String(goal.authorization || '');
        const cleanedAuth = normalizeAuthorization(existingAuth);
        if (cleanedAuth && cleanedAuth !== existingAuth) patch.authorization = cleanedAuth;
        if (args.authorization !== undefined && String(authorization) !== String(goal.authorization || '')) patch.authorization = authorization;
        if (args.objective !== undefined && String(args.objective) !== String(goal.objective || '')) patch.objective = args.objective;
        if (args.target !== undefined && String(args.target) !== String(goal.target || '')) patch.target = args.target;
        if (JSON.stringify(currentTargets) !== JSON.stringify(targets) || patch.authorization !== undefined || patch.objective !== undefined || patch.target !== undefined) {
          const updated = await session.goalSet(patch);
          goal = updated.goal;
          revision = updated.revision;
        }
        rememberPentestGoal(sessionId, { ...goal, workdir: goal?.workdir || workdir });
        return { started: false, already: true, version: existing.version, revision, goal };
      }
      const state = await session.init({
        target: args.target,
        targets,
        excludedTargets,
        objective: args.objective,
        authorization,
        workdir
      });
      rememberPentestGoal(sessionId, { ...state.goal, workdir });
      return { started: true, version: state.version, revision: state.revision, workdir, goal: state.goal };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_authorize',
    description: 'Update the engagement authorization/red-line and targets after pentest_flow_start. Required before writing or delivery when the initial authorization was empty.',
    parameters: {
      authorization: { type: 'string', required: true, description: 'Authorization note and red-line constraints; stored in state.goal.authorization.' },
      objective: { type: 'string' },
      targets: { type: 'array', items: { type: 'string' } },
      excludedTargets: { type: 'array', items: { type: 'string' } }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const authorization = normalizeAuthorization(String(args.authorization || '').trim());
      if (!authorization) throw new Error('authorization/red-line text is required');
      const targets = Array.isArray(args.targets) && args.targets.length > 0
        ? args.targets : (state.goal?.targets || [state.goal?.target]);
      const excludedTargets = Array.isArray(args.excludedTargets)
        ? args.excludedTargets : (state.goal?.excludedTargets || []);
      const patch = { authorization, targets, excludedTargets };
      if (args.objective) patch.objective = args.objective;
      const next = await session.goalSet(patch);
      const cwd = exec?.agent?.session?.header?.cwd || process.cwd();
      ensureScopeFile({
        cwd, workdir: next.goal.workdir, target: next.goal.target,
        objective: next.goal.objective, authorization, targets, excludedTargets, force: true
      });
      return {
        updated: true,
        authorization: next.goal.authorization,
        targets: next.goal.targets,
        excludedTargets: next.goal.excludedTargets,
        revision: next.revision
      };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_direction',
    description: 'Add a v4 direction: an open question + a decidable doneWhen on one or more exploration axes. Not a "verify X" wrapper.',
    parameters: {
      axis: { type: 'array', items: { type: 'string' }, required: true, description: 'One or more of surface/identity/config/component/input/logic/chain/credential/infra/evidence/cleanup/deliver.' },
      question: { type: 'string', required: true },
      doneWhen: { type: 'string', required: true },
      stage: { type: 'string', enum: ['explore', 'probe', 'exploit', 'confirm', 'deliver'] },
      priority: { type: 'number' },
      parents: { type: 'array', items: { type: 'string' }, description: 'Parent direction ids or fact ids for the exploration chain.' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const key = String(args.question || '').toLowerCase().replace(/\s+/g, '').slice(0, 240);
      const duplicate = (state.directions || []).find((item) => String(item.question || '').toLowerCase().replace(/\s+/g, '').slice(0, 240) === key);
      if (duplicate) throw new Error(`duplicate direction: ${duplicate.id} already has this question`);
      const next = await session.addDirection({
        axis: args.axis, question: args.question, doneWhen: args.doneWhen,
        stage: args.stage, priority: args.priority, parents: args.parents
      });
      const direction = next.directions[next.directions.length - 1];
      return {
        id: direction.id, axis: direction.axis, question: direction.question,
        doneWhen: direction.doneWhen, stage: direction.stage, state: direction.state,
        parents: direction.parents || [],
        revision: next.revision
      };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_directions',
    description: 'Add up to 4 independent v4 directions in one call. Use for parallel dimensions; do not batch dependent chain steps.',
    parameters: {
      items: {
        type: 'array',
        required: true,
        items: {
          type: 'object',
          properties: {
            axis: { type: 'array', items: { type: 'string' } },
            question: { type: 'string' },
            doneWhen: { type: 'string' },
            stage: { type: 'string', enum: ['explore', 'probe', 'exploit', 'confirm', 'deliver'] },
            priority: { type: 'number' },
            parents: { type: 'array', items: { type: 'string' } }
          },
          additionalProperties: false
        }
      }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const items = Array.isArray(args.items) ? args.items.slice(0, 4) : [];
      if (items.length === 0) throw new Error('items must contain at least one direction');
      const created = [];
      let next = state;
      const seen = new Set((state.directions || []).map((item) => String(item.question || '').toLowerCase().replace(/\s+/g, '').slice(0, 240)));
      for (const item of items) {
        const key = String(item.question || '').toLowerCase().replace(/\s+/g, '').slice(0, 240);
        if (seen.has(key)) continue;
        seen.add(key);
        next = await session.addDirection({
          axis: item.axis, question: item.question, doneWhen: item.doneWhen,
          stage: item.stage, priority: item.priority, parents: item.parents, origin: 'lead'
        });
        created.push(next.directions[next.directions.length - 1]);
      }
      return {
        directions: created.map((direction) => ({
          id: direction.id, axis: direction.axis, question: direction.question,
          doneWhen: direction.doneWhen, state: direction.state, origin: direction.origin
        })),
        revision: next.revision
      };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_goal',
    description: 'Add a goal under the root goal. Goals can only be closed by pentest_flow_prove with a fact/finding evidence id.',
    parameters: {
      title: { type: 'string', required: true },
      criteria: { type: 'string' },
      parentId: { type: 'string' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const next = await session.addGoal({ title: args.title, criteria: args.criteria, parentId: args.parentId });
      const goal = next.goals[next.goals.length - 1];
      return { id: goal.id, title: goal.title, state: goal.state, revision: next.revision };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_prove',
    description: 'Prove one goal with an existing fact or finding. All goals met marks the engagement done.',
    parameters: {
      goalId: { type: 'string', required: true },
      evidenceId: { type: 'string', required: true },
      reason: { type: 'string' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const next = await session.proveGoal({ goalId: args.goalId, evidenceId: args.evidenceId, reason: args.reason });
      const goal = next.goals.find((item) => item.id === args.goalId);
      return { goalId: args.goalId, state: goal?.state, phase: next.goal.phase, revision: next.revision };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_candidate',
    description: 'Accept one or more worker-proposed next directions in a batch, reject one with a reason, or block one until a prerequisite is supplied. Use ids for the batch proposed by planV4 accept_candidates.',
    parameters: {
      id: { type: 'string', description: 'Single candidate id (legacy form).' },
      ids: { type: 'array', items: { type: 'string' }, description: 'Candidate ids for batch accept.' },
      op: { type: 'string', required: true, enum: ['accept', 'reject', 'block'] },
      reason: { type: 'string' },
      blockedBy: { type: 'array', items: { type: 'string' }, description: 'Missing prerequisites that prevent this candidate from running.' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const ids = Array.isArray(args.ids) && args.ids.length > 0
        ? [...new Set(args.ids.map(String).filter(Boolean))]
        : [args.id].filter(Boolean).map(String);
      if (ids.length === 0) throw new Error('candidate id or ids is required');
      if (ids.length > 1 && args.op !== 'accept') throw new Error('batch candidate operation only supports accept');
      const results = [];
      let revision = state.revision;
      for (const id of ids) {
        const next = args.op === 'accept'
          ? await session.acceptCandidate(id)
          : args.op === 'block'
            ? await session.blockCandidate(id, args.reason, args.blockedBy)
            : await session.rejectCandidate(id, args.reason);
        const candidate = next.planner.candidates.find((item) => item.id === id);
        results.push({ id, state: candidate?.state, blockedBy: candidate?.blockedBy || [] });
        revision = next.revision;
      }
      if (results.length === 1) return { ...results[0], revision };
      return { results, revision };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_dispatch',
    description: 'Dispatch one or more v4 directions to DSH subagents. Without count it fills every free worker slot (up to maxWorkers, default 6); dependent chain steps stay serial.',
    parameters: {
      directionId: { type: 'string', description: 'Omit to fill all free worker slots with the highest-priority open directions.' },
      directionIds: { type: 'array', items: { type: 'string' }, description: 'Explicit batch of independent directions.' },
      count: { type: 'number', description: 'When no directionId is given, claim up to this many open directions; default fills every free worker slot (max equal to maxWorkers).' },
      provider: { type: 'string', enum: ['spawn', 'fork'], description: 'Only providers with structured outputSchema: spawn or fork.' },
      agentPreset: { type: 'string' },
      maxWorkers: { type: 'number', description: 'Concurrent active worker limit, default 6, max 6.' },
      maxDurationMs: { type: 'number', description: 'Optional per-worker wall-clock budget; values below 30 minutes are raised to 30 minutes, default unlimited.' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      if (!String(state.goal?.authorization || '').trim()) {
        throw new Error('authorization/red-line is empty: call pentest_flow_authorize before dispatching workers');
      }
      const subagents = typeof ctx.get === 'function' ? ctx.get('subagents') : undefined;
      if (!subagents || typeof subagents.startActivation !== 'function') {
        throw new Error('subagents service unavailable; cannot dispatch');
      }
      const configuredWorkers = Number(state.settings?.workerLimit);
      const maxWorkers = Math.min(Math.max(Math.round(Number(args.maxWorkers) || (Number.isFinite(configuredWorkers) ? configuredWorkers : 6)), 1), 6);
      // A short kill timer loses every fact and finding the worker had already
      // written to disk. Keep any explicit budget, but never let the Lead set
      // one below 30 minutes.
      const requestedDuration = Number(args.maxDurationMs);
      const workerDurationMs = Number.isFinite(requestedDuration) && requestedDuration > 0
        ? Math.max(requestedDuration, 30 * 60 * 1000)
        : 0;
      const activeTasks = (state.tasks || []).filter((task) => ['queued', 'running'].includes(task.state));
      const freeWorkers = Math.max(0, maxWorkers - activeTasks.length);
      const agentTeams = typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined;
      // Audits queued by this dispatcher must use a visible teammate. If the
      // team transport is absent, do not queue an audit at all rather than
      // silently falling back to a subagent role.
      const roleRunner = (subagents?.startActivation || agentTeams?.spawnTeammate)
        ? new TeamRoleRunner({ session, subagents, agentTeams, agent: exec.agent, cwd: state.goal.workdir })
        : null;
      const dispatcher = new V4Dispatcher({
        session, subagents, agent: exec.agent,
        cwd: state.goal.workdir,
        provider: args.provider || 'spawn',
        maxWorkers,
        maxDurationMs: workerDurationMs,
        onEvidence: trafficEvidenceIndexer(sessionId),
        onCommit: roleRunner
          ? ({ state: committed, findingIds }) => {
            const pendingIds = (committed.findings || [])
              .filter((finding) => finding.deleted !== true && finding.severity !== 'info')
              .map((finding) => finding.id);
            void enqueueAuditOnce({
              session,
              runner: roleRunner,
              state: committed,
              skipAudited: true,
              findingIds: pendingIds.length > 0 ? pendingIds : findingIds
            });
            // A completed worker frees a slot; immediately fill it from any
            // remaining open directions instead of waiting for the Lead.
            void autoAdvanceV4(sessionId, exec.agent, { dispatchOpen: true }).catch((error) => {
              try { ctx.logger?.warn?.('pentest auto advance failed: ' + (error?.message || error)); } catch { /* best effort */ }
            });
          }
          : null
      });
      const activeDirectionIds = new Set(activeTasks
        .map((task) => task.directionId));
      const open = (state.directions || [])
        .filter((item) => item.state === 'open'
          && !activeDirectionIds.has(item.id)
          && !isLeadOnlyDirection(item))
        .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
      const explicit = Array.isArray(args.directionIds) ? args.directionIds.filter(Boolean) : [];
      let ids = explicit;
      if (ids.length === 0) {
        if (args.directionId) ids = [args.directionId];
        else {
          const count = args.count === undefined
            ? freeWorkers
            : Math.min(Math.max(Math.round(Number(args.count) || 1), 1), maxWorkers);
          ids = open.slice(0, Math.max(0, count)).map((item) => item.id);
        }
      }
      if (freeWorkers === 0) throw new Error(`worker limit reached (${maxWorkers}); wait for an active worker or raise the limit`);
      ids = ids.slice(0, freeWorkers);
      if (ids.length === 0) throw new Error('no open direction to dispatch');
      const byId = new Map((state.directions || []).map((direction) => [direction.id, direction]));
      const leadOnly = ids.filter((id) => {
        const direction = byId.get(id);
        return direction && isLeadOnlyDirection(direction);
      });
      if (leadOnly.length > 0) {
        throw new Error(`refusing to dispatch report/cleanup directions to workers: ${leadOnly.join(', ')}`);
      }
      // Start the auditor on existing validation debt in parallel with the
      // workers we are about to launch. Do not await it: the Lead must keep
      // filling free worker slots instead of blocking on the audit member.
      auditPendingFor({ session, state, agent: exec.agent });
      if (ids.length === 1) {
        return dispatcher.assign(ids[0], { provider: args.provider, agentPreset: args.agentPreset });
      }
      const tasks = [];
      const errors = [];
      for (const id of ids.slice(0, maxWorkers)) {
        try {
          tasks.push(await dispatcher.assign(id, { provider: args.provider, agentPreset: args.agentPreset }));
        } catch (error) {
          errors.push({ directionId: id, error: error?.message || String(error) });
        }
      }
      return { tasks, errors, maxWorkers };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_worker_limit',
    description: 'Set the per-engagement concurrent worker limit (1-6, default 3). Raising fills free slots on the next dispatch; lowering does not kill running workers.',
    parameters: {
      limit: { type: 'number', required: true }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const next = await session.setWorkerLimit(args.limit);
      return { settings: next.settings, concurrency: planV4(next).concurrency, revision: next.revision };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_coverage',
    description: 'Record coverage for one exploration axis: no_issue_found, issue_found, not_tested or blocked.',
    parameters: {
      axis: { type: 'array', items: { type: 'string' }, required: true },
      result: { type: 'string', required: true, enum: ['no_issue_found', 'issue_found', 'not_tested', 'blocked'] },
      note: { type: 'string' },
      evidenceIds: { type: 'array', items: { type: 'string' } }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const next = await session.run({
        type: 'coverage', op: 'set', axis: args.axis, result: args.result,
        note: args.note, evidenceIds: args.evidenceIds
      });
      return { coverage: next.coverage, revision: next.revision };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_asset',
    description: 'Record one or more v4 assets (root-domain/subdomain/ip/service/app/endpoint). Duplicate type+value pairs are reused. Target-level assets are seeded by flow_start; use this for assets discovered later.',
    parameters: {
      assets: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            type: { type: 'string', enum: ASSET_TYPES },
            value: { type: 'string' },
            meta: { type: 'string' }
          }
        }
      },
      // P0-5: surface-stage api-recon artifacts. Pass the file contents (or
      // parsed objects); the module derives endpoint assets + verify directions.
      apiMerged: { type: 'string', description: 'Contents of recon/api_merged.txt (METHOD /path lines).' },
      paramsMerged: { type: 'string', description: 'Contents of recon/params_merged.txt.' },
      siteMap: { type: 'string', description: 'Contents of recon/site_map.json.' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      // Read recon artifacts from workdir/recon/ when no inline content is given.
      const root = path.resolve(state.goal.workdir || '.');
      const readRecon = (inline, name) => {
        if (inline !== undefined && inline !== null && String(inline) !== '') return String(inline);
        const file = path.join(root, 'recon', name);
        const resolved = path.resolve(file);
        if (resolved !== root && !resolved.startsWith(root + path.sep)) return '';
        try { return fs.existsSync(resolved) ? fs.readFileSync(resolved, 'utf8') : ''; } catch { return ''; }
      };
      const recon = (args.apiMerged !== undefined || args.paramsMerged !== undefined || args.siteMap !== undefined)
        ? buildApiRecon({
          apiMerged: readRecon(args.apiMerged, 'api_merged.txt'),
          paramsMerged: readRecon(args.paramsMerged, 'params_merged.txt'),
          siteMap: readRecon(args.siteMap, 'site_map.json')
        })
        : null;
      const items = (Array.isArray(args.assets) ? args.assets : [])
        .map((item) => ({ type: item?.type, value: item?.value, meta: item?.meta }))
        .filter((item) => item.type && item.value)
        .concat(recon ? recon.assets : []);
      if (items.length === 0) throw new Error('assets[].type/value or recon artifacts are required');
      const before = new Set((state.assets || []).map((item) => item.id));
      const next = await session.addAsset(items);
      return {
        added: (next.assets || []).filter((item) => !before.has(item.id)),
        assets: next.assets || [],
        total: (next.assets || []).length,
        revision: next.revision,
        ...(recon ? { reconDirections: recon.directions, reconLimitations: recon.limitations, reconCounts: recon.counts } : {})
      };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_status',
    description: 'Read the v4 engagement: goal, open directions, tasks, findings and validation debt. Also accepts proposed candidate directions and fills free worker slots before returning.',
    parameters: {},
    execute: async (_args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      // flow_status is a WORK turn (goal round / user request), not a UI
      // selection. In a real runtime (subagents mounted) an unfinished goal
      // must keep dispatching real probes: derive a fallback direction and
      // dispatch it. Test harnesses without the subagent service keep the
      // pure read semantics so tool-contract tests stay deterministic.
      const subagentsSvc = typeof ctx.get === 'function' ? ctx.get('subagents') : undefined;
      const agentsSvc = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
      // Real runtime has both the subagent service AND the live-agent service;
      // isolated tool-contract harnesses only stub subagents. In real work
      // turns an unfinished goal must keep dispatching real probes.
      const liveDispatch = Boolean(subagentsSvc && typeof subagentsSvc.startActivation === 'function'
        && agentsSvc && typeof agentsSvc.get === 'function');
      const auto = liveDispatch
        ? await autoAdvanceV4(sessionId, exec.agent, { dispatchOpen: true, allowFallback: true, force: true })
        : await autoAdvanceV4(sessionId, exec.agent, { dispatchOpen: false });
      let state = await session.read();
      if (!state) return { exists: false };
      // One-way migration for historical engagements: clear Lead-authored
      // verification gates that the user never imposed. Idempotent.
      const existingAuth = String(state.goal?.authorization || '');
      const cleanedAuth = normalizeAuthorization(existingAuth);
      if (cleanedAuth && cleanedAuth !== existingAuth) {
        state = await session.goalSet({ authorization: cleanedAuth });
      }
      // One-way migration: clear historical "待用户审批" that came from the
      // old overly broad red-line keyword rules. The user's ONLY red line is
      // testing interfaces that delete/tamper with existing data; anything
      // else must not sit behind an approval gate.
      const stalePending = (state.findings || []).filter((item) =>
        item && item.deleted !== true && item.approvalStatus === 'pending'
        && !redLineReason(`${item.claim || ''} ${item.description || ''} ${(item.steps || []).join(' ')}`));
      for (const item of stalePending) {
        try { state = await session.run({ type: 'finding', op: 'unblock', id: item.id, now: Date.now() }); }
        catch { /* one bad finding must not block status */ }
      }
      rememberPentestGoal(sessionId, { ...state.goal, workdir: state.goal?.workdir });
      const directions = state.directions || [];
      const tasks = state.tasks || [];
      const validations = state.validations || [];
      const reproduced = new Set(validations
        .filter((item) => item?.verdict === 'reproduced'
          && item.validator === 'agent:pentest-auditor'
          && item.superseded !== true)
        .map((item) => item.findingId));
      const activeTasks = tasks.filter((item) => ['queued', 'running'].includes(item.state));
      const openDirections = directions.filter((item) => ['open', 'running'].includes(item.state));
      const idle = activeTasks.length === 0 && openDirections.length === 0;
      // An unfinished goal is NEVER a reason to idle. When nothing is queued,
      // the Lead must derive a NEW concrete attack hypothesis and dispatch it
      // in THIS turn; "等待窗口 / 本轮不发起探测" is forbidden.
      const deepWork = idle ? {
        unfinished: true,
        mustDoNow: [
          '读 facts / coverage / assets，挑一个还没验证的具体攻击面（换入口、换协议、换参数、换等价路径、换证据链）',
          '用 pentest_flow_direction 或 pentest_flow_directions 写 1 个带具体 endpoint/参数/判定条件的新方向',
          '用 pentest_flow_dispatch（或 pentest_flow_autoplan）立即派 worker 去真发请求、取响应、落证据',
          '不要回「状态不变 / 等待窗口 / 本轮不探测」；目标未达成前每轮都必须有新的实测动作'
        ],
        hint: '目标未完成：本轮必须新增一个可验证方向并派活实测，禁止只回一句现状。'
      } : null;
      return {
        exists: true,
        idle,
        ...(deepWork || {}),
        version: state.version,
        revision: state.revision,
        goal: state.goal,
        counts: {
          directions: directions.length,
          goals: (state.goals || []).length,
          candidates: (state.planner?.candidates || []).filter((item) => item.state === 'proposed').length,
          facts: (state.facts || []).length,
          findings: (state.findings || []).filter((item) => item.deleted !== true && item.severity !== 'info').length,
          assets: (state.assets || []).length,
          evidence: (state.evidence || []).length,
          validations: validations.length,
          coverage: (state.coverage || []).length,
          tasks: tasks.length
        },
        goals: (state.goals || []).map((item) => ({ id: item.id, title: item.title, criteria: item.criteria, state: item.state, proofs: item.proofs })),
        assets: (state.assets || []).slice(0, 100).map((item) => ({ id: item.id, type: item.type, value: item.value, meta: item.meta || '' })),
        planner: { ...state.planner, candidates: (state.planner?.candidates || []).filter((item) => item.state === 'proposed') },
        coverageGaps: planV4(state).coverageGaps,
        // P1-9: coverage as a derived asset-anchoring metric, not a 12-axis
        // checkbox. Additive; existing coverageGaps/counts stay unchanged.
        derivedCoverage: deriveCoverage(state),
        untestedDirections: untestedDirections(state, { limit: 3 }),
        // P0-6: bounded continue-from candidates derived from failed tasks.
        resumeCandidates: selectResumeCandidates(state, { maxCandidates: 5 }),
        concurrency: planV4(state).concurrency,
        roles: state.roles || {},
        report: state.report || null,
        reportStale: Boolean(state.report && Number(state.revision) !== Number(state.report.revision) + 1),
        reportEvidenceStale: Boolean(state.report
          && (state.report.evidenceStale === true
            || reportEvidenceStatus(state, state.report.evidenceVersion).stale)),
        reportPendingReporter: Boolean(state.report?.pendingReporter),
        evidenceVersion: evidenceVersion(state),
        directions: directions
          .filter((item) => ['open', 'running'].includes(item.state))
          .map((item) => ({ id: item.id, axis: item.axis, question: item.question, doneWhen: item.doneWhen, stage: item.stage, state: item.state })),
        tasks: tasks.slice(-10).map((item) => ({
          id: item.id, directionId: item.directionId, state: item.state,
          provider: item.provider, childId: item.childId, error: item.error,
          result: item.result ? { conclusion: item.result.conclusion, directionState: item.result.directionState } : null
        })),
        pendingApprovals: (state.findings || [])
          .filter((item) => item.deleted !== true && item.approvalStatus === 'pending')
          .map((item) => ({ id: item.id, claim: item.claim, severity: item.severity, proposedAction: item.proposedAction || '', safetyDecision: item.safetyDecision || '' })),
        unvalidated: (state.findings || [])
          .filter((item) => item.deleted !== true && item.severity !== 'info' && !reproduced.has(item.id))
          .map((item) => ({ id: item.id, claim: item.claim, severity: item.severity }))
      };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_report',
    description: 'Render the v4 engagement as Markdown to reports/v4-report.md. Default: deterministic renderer, NO teammate. Only member:true starts the visible reporter teammate — call it ONLY when the user explicitly asks to generate a report.',
    parameters: {
      member: { type: 'boolean', description: 'Start the visible pentest-reporter teammate. Default FALSE. Set true ONLY on an explicit user request to generate a report.' },
      timeoutMs: { type: 'number', description: 'Reporter timeout in ms; default 600000.' },
      docx: { type: 'boolean', description: 'Experimental: also generate reports/v4-report.docx deterministically. Default false; reporter never generates DOCX itself.' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const reportState = deriveCoverageFindings(enrichFindingsFromEvidence(state));
      // P0-3: the reporter must write against a verified evidence set. Check
      // every finding's evidence ids and role coverage before generating.
      const evidenceChecks = verifyReportEvidenceRoles(reportState);
      if (evidenceChecks.length > 0) {
        throw new Error(`报告证据核实未通过：${evidenceChecks.slice(0, 6).join('；')}`);
      }
      const currentEvidenceVersion = evidenceVersion(reportState);
      const evidenceRoles = evidenceByRole(reportState);
      const agentTeams = typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined;
      const subagents = getSubagents();
      // member:true (i.e. the user said "生成报告") may spawn it; otherwise the
      // deterministic renderer writes the file with no agent at all.
      const useMember = args.member === true;
      const root = path.resolve(state.goal.workdir || '.');
      const reporterRole = state.roles?.reporter;
      const canonicalReporterFile = path.join(root, 'reports', 'v4-report.md');
      const recordedReporterFile = path.resolve(root, state.report?.path || path.join('reports', 'v4-report.md'));
      const reporterFile = fs.existsSync(canonicalReporterFile) ? canonicalReporterFile : recordedReporterFile;
      if (reporterFile !== root && !reporterFile.startsWith(root + path.sep)) {
        throw new Error('recorded report path escapes workdir');
      }
      const reporterFileStat = fs.existsSync(reporterFile) ? fs.statSync(reporterFile) : null;
      // The reporter role record bumps revision by one. A report written at
      // revision R is still valid when state is R+1 (only the role record
      // happened); any other graph change means the reporter must run again.
      const reporterRevisionAligned = !Number(reporterRole?.lastRevision)
        || Number(state.revision) <= Number(reporterRole.lastRevision) + 1;
      // lastRunAt is the role-completion time; the reporter writes the file
      // during the run, before that timestamp. New role records carry the run
      // start. Old records only have lastRunAt, so allow the maximum role
      // timeout window (600s) plus overhead as the start estimate.
      const reporterStart = Number(reporterRole?.lastStartedAt) > 0
        ? Number(reporterRole.lastStartedAt)
        : (Number(reporterRole?.lastRunAt) > 0 ? Number(reporterRole.lastRunAt) - 30 * 60 * 1000 : 0);
      const reporterFileFresh = reporterRole?.lastStatus === 'completed'
        && reporterStart > 0
        && reporterFileStat !== null
        && reporterFileStat.isFile()
        && reporterFileStat.size > 0
        && reporterFileStat.mtimeMs >= reporterStart
        && reporterRevisionAligned;
      if (useMember && reporterFileFresh && state.report?.by !== 'teammate:reporter') {
        const markdown = fs.readFileSync(reporterFile, 'utf8');
        const template = validateReportMarkdown(markdown, reportState.findings || []);
        // report.bytes/gaps must describe the actual file, not a model claim.
        const bytes = reporterFileStat.size;
        const gaps = parseReportGaps(markdown);
        const recorded = await session.recordReport({
          path: path.relative(root, reporterFile).split(path.sep).join('/'),
          by: 'teammate:reporter',
          memberName: reporterRole.lastMemberName || 'pentest-reporter',
          bytes,
          gaps,
          templateId: template.templateId,
          evidenceVersion: currentEvidenceVersion,
          evidenceChecks
        });
        return {
          path: reporterFile,
          bytes,
          gaps,
          templateId: template.templateId,
          by: 'teammate:reporter',
          adopted: true,
          memberName: reporterRole.lastMemberName || 'pentest-reporter',
          revision: recorded.revision
        };
      }
      if (useMember) {
        if (!subagents?.startActivation && !agentTeams?.spawnTeammate) throw new Error('reporter transport unavailable: no role transport is mounted');
        const root = path.resolve(state.goal.workdir || '.');
        const reportPath = path.join(root, 'reports', 'v4-report.md');
        const runner = new TeamRoleRunner({ session, subagents, agentTeams, agent: exec.agent, cwd: root });
        const outcome = await runner.run('reporter', {
          revision: state.revision,
          target: state.goal?.target || '',
          targets: state.goal?.targets || [],
          objective: state.goal?.objective || '',
          authorization: state.goal?.authorization || '',
          goals: state.goals || [],
          directions: state.directions || [],
          facts: state.facts || [],
          findings: reportState.findings || [],
          evidence: reportState.evidence || [],
          // P0-3: reporter verifies evidence by baseline/proof/verification
          // role and must bind the exact version it describes.
          evidenceRoles,
          evidenceVersion: currentEvidenceVersion,
          evidenceChecks,
          validations: state.validations || [],
          coverage: state.coverage || [],
          templateId: 'pentest-default-v1',
          reportPath
        }, { timeoutMs: args.timeoutMs });
        const structured = outcome.structured;
        const afterRole = await session.read();
        if (Number(afterRole.revision) !== Number(state.revision) + 1) {
          throw new Error(`state changed while reporter was running（report started at revision ${state.revision}，now ${afterRole.revision}）：re-run pentest_flow_report`);
        }
        const resolved = path.resolve(root, String(structured.reportPath || ''));
        if (resolved !== root && !resolved.startsWith(root + path.sep)) {
          throw new Error(`reporter path escapes workdir: ${structured.reportPath}`);
        }
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile() || fs.statSync(resolved).size === 0) {
          throw new Error(`reporter did not write a non-empty report: ${structured.reportPath}`);
        }
        const bytes = fs.statSync(resolved).size;
        const markdown = fs.readFileSync(resolved, 'utf8');
        const template = validateReportMarkdown(markdown, reportState.findings || []);
        const structuredGaps = Array.isArray(structured.gaps) ? structured.gaps.length : 0;
        const gaps = structuredGaps > 0 ? structuredGaps : parseReportGaps(markdown);
        const word = args.docx === true
          ? writeV4Docx(reportState, path.join(root, 'reports', 'v4-report.docx'))
          : null;
        const recorded = await session.recordReport({
          path: path.relative(root, resolved).split(path.sep).join('/'),
          by: 'teammate:reporter',
          memberName: outcome.memberName || 'pentest-reporter',
          bytes,
          gaps,
          ...(word ? { wordPath: path.relative(root, word.path).split(path.sep).join('/') } : {}),
          templateId: template.templateId,
          evidenceVersion: currentEvidenceVersion,
          evidenceChecks
        });
        return {
          path: resolved,
          bytes,
          ...(word ? { wordPath: word.path, wordBytes: word.bytes } : {}),
          templateId: template.templateId,
          by: 'teammate:reporter',
          role: outcome.role,
          childId: outcome.childId,
          memberName: outcome.memberName,
          gaps: structured.gaps || [],
          notes: structured.notes || '',
          revision: recorded.revision
        };
      }
      const markdown = renderV4Report(reportState);
      const template = validateReportMarkdown(markdown, reportState.findings || []);
      const dir = path.join(state.goal.workdir, 'reports');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, 'v4-report.md');
      fs.writeFileSync(file, markdown, 'utf8');
      const word = args.docx === true
        ? writeV4Docx(reportState, path.join(dir, 'v4-report.docx'))
        : null;
      const recorded = await session.recordReport({
        path: path.relative(path.resolve(state.goal.workdir), file).split(path.sep).join('/'),
        by: 'renderer',
        bytes: Buffer.byteLength(markdown),
        gaps: parseReportGaps(markdown),
        ...(word ? { wordPath: path.relative(path.resolve(state.goal.workdir), word.path).split(path.sep).join('/') } : {}),
        templateId: template.templateId,
        evidenceVersion: currentEvidenceVersion,
        evidenceChecks
      });
      return {
        path: file,
        bytes: Buffer.byteLength(markdown),
        ...(word ? { wordPath: word.path, wordBytes: word.bytes } : {}),
        templateId: template.templateId,
        by: 'renderer',
        revision: recorded.revision,
        counts: {
          directions: (state.directions || []).length,
          findings: (state.findings || []).filter((item) => item.deleted !== true && item.severity !== 'info').length,
          evidence: (state.evidence || []).length,
          validations: (state.validations || []).length
        }
      };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_plan',
    description: 'Read the planner snapshot: goals, mustGenerate, frontier directions, worker-proposed candidates, validation debt and coverage gaps. Automatically accepts candidate directions and fills every free worker slot before returning.',
    parameters: {},
    execute: async (_args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const auto = await autoAdvanceV4(sessionId, exec.agent, { dispatchOpen: false });
      const state = await session.read();
      if (!state) return { exists: false, actions: [], frontier: [], unvalidated: [], coverageGaps: [], derivedCoverage: deriveCoverage(null), untestedDirections: [] };
      return { exists: true, ...planV4(state), auto, derivedCoverage: deriveCoverage(state), untestedDirections: untestedDirections(state, { limit: 3 }) };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_autoplan',
    description: 'Accept proposed candidate directions, dispatch every free worker slot, and queue unvalidated findings for the auditor. Safety net for pending work.',
    parameters: {},
    execute: async (_args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const auto = await autoAdvanceV4(sessionId, exec.agent, { dispatchOpen: true, force: true, allowFallback: true });
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      return { action: auto.advanced ? 'advanced' : 'none', auto, plan: planV4(state), revision: state.revision };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_evidence',
    description: 'Verify sha256 of v4 evidence files, or export verified copies under reports/evidence/.',
    parameters: {
      op: { type: 'string', required: true, enum: ['verify', 'export'] }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const root = path.resolve(state.goal.workdir || '.');
      const results = [];
      for (const item of state.evidence || []) {
        const resolved = path.resolve(root, item.path || '');
        const inside = resolved === root || resolved.startsWith(root + path.sep);
        if (!inside || !fs.existsSync(resolved)) {
          results.push({ id: item.id, path: item.path, status: 'missing' });
          continue;
        }
        const actual = crypto.createHash('sha256').update(fs.readFileSync(resolved)).digest('hex');
        results.push({ id: item.id, path: item.path, status: actual === item.sha256 ? 'ok' : 'mismatch', expected: item.sha256, actual });
      }
      const summary = {
        total: results.length,
        ok: results.filter((item) => item.status === 'ok').length,
        missing: results.filter((item) => item.status === 'missing').length,
        mismatched: results.filter((item) => item.status === 'mismatch').length
      };
      if (args.op === 'verify') return { ...summary, results };
      const dir = path.join(root, 'reports', 'evidence');
      fs.mkdirSync(dir, { recursive: true });
      const exported = [];
      for (const item of results) {
        if (item.status !== 'ok') continue;
        const source = path.resolve(root, item.path);
        const target = path.join(dir, `${item.id}-${path.basename(source)}`);
        fs.copyFileSync(source, target);
        exported.push({ id: item.id, path: path.relative(root, target), sha256: item.actual });
      }
      const manifest = path.join(dir, 'manifest.json');
      fs.writeFileSync(manifest, JSON.stringify({ target: state.goal.target, exported, skipped: results.filter((item) => item.status !== 'ok') }, null, 2), 'utf8');
      return { ...summary, exported: exported.length, manifest, results };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_delivery',
    description: 'Check whether the v4 engagement is ready to deliver: findings validated, evidence verified, directions closed, report generated.',
    parameters: {
      review: { type: 'boolean', description: 'Run the legacy reviewer role before returning; off by default because report structure is checked deterministically.' },
      timeoutMs: { type: 'number', description: 'Reviewer timeout in ms; default 300000.' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const problems = [];
      const root = path.resolve(state.goal.workdir || '.');
      if (!String(state.goal?.authorization || '').trim()) {
        problems.push('授权/红线未记录：禁止交付；先调用 pentest_flow_authorize');
      }
      if (!state.report) {
        problems.push('没有可审计的报告记录：先调用 pentest_flow_report');
      } else {
        // A deterministic renderer report is the normal default now. Only an
        // explicit user request starts the reporter teammate; delivery must
        // not require a member-authored report.
        if (Number(state.revision) !== Number(state.report.revision) + 1) {
          problems.push(`报告已过期：report revision ${state.report.revision}，当前 revision ${state.revision}`);
        }
        if (state.report.pendingReporter === true) {
          problems.push('有新增/补绑的 finding 尚未由 reporter 按 baseline/proof/verification 核实：重新调用 pentest_flow_report');
        }
        if (state.report.evidenceStale === true || (() => {
          const status = reportEvidenceStatus(state, state.report.evidenceVersion);
          return status.stale;
        })()) {
          problems.push('报告引用的证据已变更/补绑：请重新调用 pentest_flow_report 生成新报告，不要覆盖新证据');
        }
        const reportFile = path.resolve(root, state.report.path || '');
        const reportInside = reportFile === root || reportFile.startsWith(root + path.sep);
        const reportStat = reportInside && fs.existsSync(reportFile) ? fs.statSync(reportFile) : null;
        if (!reportInside || !reportStat?.isFile() || reportStat.size === 0) {
          problems.push(`报告文件缺失或为空：${state.report.path || '(未记录)'}`);
        } else {
          const actualBytes = reportStat.size;
          if (Number(state.report.bytes) !== actualBytes) {
            problems.push(`报告字节数不一致：state=${state.report.bytes || 0}，实际=${actualBytes}`);
          }
          const actualGaps = parseReportGaps(fs.readFileSync(reportFile, 'utf8'));
          if (Number(state.report.gaps) !== actualGaps) {
            problems.push(`报告 gaps 不一致：state=${state.report.gaps || 0}，实际=${actualGaps}`);
          }
        }
      }
      const findings = (state.findings || []).filter((item) => item.deleted !== true && item.severity !== 'info');
      const pendingApprovals = findings.filter((item) => item.approvalStatus === 'pending');
      if (pendingApprovals.length > 0) {
        problems.push(`仍有 ${pendingApprovals.length} 个 finding 等待用户审批：${pendingApprovals.map((item) => item.id).join(', ')}`);
      }
      const agentTeams = typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined;
      const runReview = args.review === true;
      const goals = state.goals || [];
      const openGoals = goals.filter((item) => item.state !== 'met');
      if (openGoals.length > 0) problems.push(`还有 ${openGoals.length} 个目标未证明`);
      const evidenceIds = new Set((state.evidence || []).map((item) => item.id));
      for (const goal of goals) {
        for (const proof of goal.proofs || []) {
          if (!evidenceIds.has(proof.evidenceId)) {
            problems.push(`目标 ${goal.id} 的 proof.evidenceId 不是 evidence id：${proof.evidenceId || '(empty)'}`);
          }
        }
      }
      if (findings.length === 0) problems.push('没有任何 finding');
      for (const finding of findings.filter((item) => ['critical', 'high'].includes(item.severity))) {
        if (finding.status !== 'confirmed') problems.push(`高危 finding 未复现验证：${finding.claim}`);
        const independent = hasAuditorReproduction(state.validations || [], finding.id);
        if (!independent) problems.push(`高危 finding 缺少 agent:pentest-auditor 复现：${finding.claim}`);
      }
      const open = (state.directions || []).filter((item) => ['open', 'running'].includes(item.state));
      if (open.length > 0) problems.push(`仍有 ${open.length} 个方向未收口`);
      const proposedCandidates = (state.planner?.candidates || []).filter((item) => item.state === 'proposed');
      if (proposedCandidates.length > 0) {
        problems.push(`仍有 ${proposedCandidates.length} 个 worker 候选方向未处理：${proposedCandidates.map((item) => item.id).join(', ')}`);
      }
      const coverage = state.coverage || [];
      const missingCoverage = (state.directions || [])
        .filter((item) => ['done', 'exhausted', 'blocked', 'empty'].includes(item.state))
        .filter((item) => (item.axis || []).some((axis) => !coverage.some((entry) => entry.axis === axis)));
      if (missingCoverage.length > 0) problems.push(`方向未记录 coverage：${missingCoverage.map((item) => item.id).join(', ')}`);
      for (const item of state.evidence || []) {
        const resolved = path.resolve(root, item.path || '');
        const inside = resolved === root || resolved.startsWith(root + path.sep);
        if (!inside || !fs.existsSync(resolved)) {
          problems.push(`证据缺失：${item.path}`);
          continue;
        }
        const actual = crypto.createHash('sha256').update(fs.readFileSync(resolved)).digest('hex');
        if (actual !== item.sha256) problems.push(`证据被篡改：${item.path}`);
      }
      if (!fs.existsSync(path.join(root, 'reports', 'v4-report.md'))) problems.push('尚未生成 v4 报告');
      let review = null;
      if (runReview) {
        const subagents = getSubagents();
        if (!subagents?.startActivation && !agentTeams?.spawnTeammate) throw new Error('reviewer transport unavailable: no role transport is mounted');
        const runner = new TeamRoleRunner({ session, subagents, agentTeams, agent: exec.agent, cwd: root });
        try {
          const outcome = await runner.run('reviewer', {
            revision: state.revision,
            target: state.goal?.target || '',
            findings: findings.map((item) => ({
              id: item.id, claim: item.claim, severity: item.severity,
              status: item.status || 'unverified', evidenceIds: item.evidenceIds || []
            })),
            directions: (state.directions || []).map((item) => ({
              id: item.id, state: item.state, axis: item.axis,
              question: item.question, hasConclusion: Boolean(item.conclusion)
            })),
            coverage: state.coverage || [],
            evidence: (state.evidence || []).map((item) => ({ id: item.id, path: item.path, sha256: item.sha256 })),
            reportPath: path.join(root, 'reports', 'v4-report.md'),
            currentProblems: problems
          }, { timeoutMs: args.timeoutMs, maxDepth: 1 });
          const structured = outcome.structured;
          if (Number(structured.checkedRevision) !== Number(state.revision)) {
            problems.push(`审查员检查了旧 revision ${structured.checkedRevision}（当前 ${state.revision}），请重新审查`);
          }
          review = { ok: structured.ok, checkedRevision: structured.checkedRevision, problems: structured.problems, notes: structured.notes || '' };
          for (const problem of structured.problems || []) {
            if (problem.severity === 'high') {
              problems.push(`审查问题[${problem.code}]：${problem.detail}`);
            }
          }
        } catch (error) {
          problems.push(`交付审查未完成：${String(error?.message || error)}`);
          review = { ok: false, error: String(error?.message || error) };
        }
      }
      // P2-10: aggregate independent retests; any inconclusive retest blocks
      // delivery. A single failed reproduction is never accepted as fixed.
      const retestResults = (state.validations || [])
        .filter((item) => item?.retest)
        .map((item) => ({ findingId: item.findingId, verdict: item.retest.verdict, reason: item.retest.reason }));
      const retestGate = aggregateRetests(retestResults);
      for (const blocker of retestGate.blockers) problems.push(`独立复测未定论：${blocker}`);
      return { ok: problems.length === 0, problems, retestGate, ...(review ? { review } : {}) };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_validate',
    description: 'Record an independent validation for one v4 finding. reproduced requires its own evidenceIds. independent defaults to true for critical/high findings when agentTeams is available.',
    parameters: {
      findingId: { type: 'string', required: true },
      verdict: { type: 'string', enum: ['reproduced', 'not_reproduced', 'inconclusive'] },
      validator: { type: 'string' },
      independent: { type: 'boolean', description: 'Run pentest-auditor as an isolated role before recording the verdict.' },
      timeoutMs: { type: 'number', description: 'Role run timeout in ms; default 300000, max 600000.' },
      evidenceIds: { type: 'array', items: { type: 'string' } },
      evidenceRefs: { type: 'array', items: { type: 'string' } },
      evidenceKeys: { type: 'array', items: { type: 'string' } },
      notes: { type: 'string' },
      // P2-10: a not_reproduced verdict is only credible as remediation when
      // the retest is comparable, controlled and repeated.
      attempts: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Independent retest attempts; at least two consistent non-reproductions are required to treat a finding as fixed.' },
      comparableEnvironment: { type: 'boolean', description: 'Whether the retest used the same environment as the original reproduction. Default true.' },
      normalControl: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Normal control responses proving the target still works (e.g. {ok:true,status:"200"}).' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');

      let verdict = args.verdict;
      let validator = args.validator;
      let evidenceIds = args.evidenceIds || args.evidenceRefs || args.evidenceKeys || [];
      let roleResult = null;
      let roleError = '';
      const finding = (state.findings || []).find((item) => item.id === args.findingId && item.deleted !== true);
      if (!finding) throw new Error(`finding not found: ${args.findingId}`);
      if (finding.approvalStatus === 'pending') {
        throw new Error('red-line finding is pending user approval; call pentest_flow_approval first');
      }
      if (redLineReason(`${finding.claim || ''} ${finding.description || ''} ${finding.steps?.join(' ') || ''}`)
        && finding.approvalStatus !== 'approved') {
        throw new Error('red-line finding requires explicit user approval before verification; call pentest_flow_approval first');
      }
      const agentTeams = typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined;
      const subagents = getSubagents();
      const runIndependent = args.independent === true
        || (args.independent !== false && Boolean(subagents?.startActivation || agentTeams?.spawnTeammate) && ['critical', 'high'].includes(finding.severity));
      if (runIndependent) {
        if (!subagents?.startActivation && !agentTeams?.spawnTeammate) throw new Error('validator transport unavailable: no role transport is mounted');
        const runner = new TeamRoleRunner({
          session, subagents, agentTeams, agent: exec.agent, cwd: state.goal.workdir || process.cwd()
        });
        try {
          roleResult = await runner.run('auditor', {
            findingId: finding.id,
            claim: finding.claim,
            severity: finding.severity,
            impactProven: finding.impactProven,
            evidenceIds: finding.evidenceIds || [],
            existingFindings: findingCandidates(state, finding.id),
            severityPolicy: 'critical=RCE/full admin; high=unauth sensitive/write; medium=limited/conditional; low=info only',
            target: state.goal?.target || '',
            workdir: state.goal.workdir || process.cwd()
          }, { timeoutMs: args.timeoutMs, maxDepth: 1 });
          const structured = roleResult.structured;
          verdict = structured.verdict;
          validator = 'agent:pentest-auditor';
          const prepared = runner.prepareEvidence(structured.evidence);
          if (prepared.length) {
            const before = new Set((state.evidence || []).map((item) => item.id));
            const addedState = await session.addEvidence(prepared);
            const added = (addedState.evidence || []).filter((item) => !before.has(item.id));
            evidenceIds = added.map((item) => item.id);
          } else {
            evidenceIds = [];
          }
          if (verdict === 'reproduced' && evidenceIds.length === 0) {
            throw new Error('independent validator returned reproduced without new evidence');
          }
          if (!args.notes && structured.notes) args.notes = structured.notes;
        } catch (error) {
          roleError = String(error?.message || error);
          if (/stopped:\s*(aborted|error|max-tokens|refusal)/.test(roleError)) {
            verdict = 'inconclusive';
            validator = validator || 'agent:pentest-auditor';
            evidenceIds = [];
            args.notes = args.notes || `auditor did not complete: ${roleError}`;
          } else {
            throw error;
          }
        }
      }
      const audited = roleResult?.structured;
      if (audited?.decision === 'needs_review' || audited?.safetyDecision === 'requires_user_approval') {
        const reviewed = await session.reviewFinding({
          findingId: args.findingId,
          status: 'pending',
          safetyDecision: audited.safetyDecision,
          note: audited.reason || audited.notes || '',
          proposedAction: audited.proposedAction || ''
        });
        // needs_review is an audit decision too: persist its classification and
        // severity rationale, not only the pending approval flag.
        await session.rateFinding({
          findingId: args.findingId,
          ...auditMetadata(audited, {
            severity: audited.severity,
            impactProven: audited.impactProven,
            affectedAssets: audited.affectedAssets || []
          })
        });
        return {
          findingId: args.findingId,
          pendingApproval: true,
          safetyDecision: audited.safetyDecision,
          revision: reviewed.revision,
          ...(roleResult ? { role: roleResult.role, childId: roleResult.childId } : {})
        };
      }
      if (!verdict) throw new Error('verdict is required unless independent:true supplies one');
      if (!validator) throw new Error('validator is required unless independent:true supplies one');
      if (['critical', 'high'].includes(finding.severity) && validator !== 'agent:pentest-auditor') {
        throw new Error('critical/high findings must be validated by agent:pentest-auditor, not Lead or another validator');
      }
      // P2-10: a single non-reproduction is never "fixed". Only an explicit
      // retest with comparable env + normal control + >=2 consistent attempts
      // may keep not_reproduced; otherwise downgrade to inconclusive.
      const retest = evaluateRetest({
        priorFinding: finding,
        priorEvidence: (state.evidence || []).filter((e) => (finding.evidenceIds || []).includes(e.id)),
        currentEvidence: (state.evidence || []).filter((e) => (evidenceIds || []).includes(e.id)),
        attempts: args.attempts,
        comparableEnvironment: args.comparableEnvironment,
        normalControl: args.normalControl
      });
      let effectiveVerdict = verdict;
      const retestNote = { verdict: retest.verdict, reason: retest.reason, requirements: retest.requirements };
      if (verdict === 'not_reproduced' && retest.verdict !== 'fixed') {
        effectiveVerdict = 'inconclusive';
      }

      const next = await session.validate({
        findingId: args.findingId, verdict: effectiveVerdict, validator,
        evidenceIds, notes: args.notes || undefined,
        metadata: { ...(audited ? auditMetadata(audited) : {}), retest: retestNote }
      });
      const validation = next.validations[next.validations.length - 1];
      if (audited) {
        await session.rateFinding({
          findingId: args.findingId,
          severity: audited.severity,
          impactProven: audited.impactProven,
          vulnType: audited.vulnType,
          rootCause: audited.rootCause,
          exploitTechnique: audited.exploitTechnique,
          affectedAssets: audited.affectedAssets || [],
          dedupeKey: auditorDedupeKey(audited),
          severityRationale: audited.severityRationale,
          auditDecision: audited.decision,
          ...(audited.reason ? { riskAnalysis: audited.reason } : {})
        });
      }
      // A reproduced root RCE is the objective; attach the proof automatically
      // instead of leaving goal.proofs=0 until the user says "complete".
      if (effectiveVerdict === 'reproduced' && audited
        && audited.impactProven === 'rce'
        && ['critical', 'high'].includes(audited.severity)) {
        try {
          await session.proveGoal({
            goalId: 'goal-1',
            evidenceId: args.findingId,
            reason: `independent auditor reproduced ${args.findingId}`
          });
        } catch { /* open work or state rules must not fail the audit result */ }
      }
      return {
        validationId: validation.id, findingId: validation.findingId,
        verdict: validation.verdict, revision: next.revision,
        ...(roleResult ? {
          role: roleResult.role, childId: roleResult.childId,
          evidenceIds, ...(roleError ? { roleError } : {})
        } : {})
      };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_approval',
    description: 'Approve or deny a red-line finding that the auditor marked as needs_review. Approval only unlocks verification; it does not itself reproduce the action.',
    parameters: {
      findingId: { type: 'string', required: true },
      decision: { type: 'string', required: true, enum: ['approved', 'denied'] },
      note: { type: 'string', description: 'User decision reason / constraints.' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const finding = (state.findings || []).find((item) => item.id === args.findingId && item.deleted !== true);
      if (!finding) throw new Error(`finding not found: ${args.findingId}`);
      const status = args.decision === 'approved' ? 'approved' : 'denied';
      const next = await session.reviewFinding({
        findingId: args.findingId,
        status,
        safetyDecision: 'user_' + status,
        note: args.note || ''
      });
      return {
        findingId: args.findingId,
        approvalStatus: status,
        revision: next.revision,
        message: status === 'approved'
          ? 'approved: verification may proceed, but the auditor must still reproduce safely'
          : 'denied: do not execute the red-line action'
      };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_audit',
    description: 'Materialize coverage-derived findings and queue the auditor over every current non-info, unvalidated finding. Returns immediately with the queued count; pass wait=true only when you need the structured audit result inline.',
    parameters: {
      timeoutMs: { type: 'number', description: 'Per-finding auditor timeout; default 300000, max 600000.' },
      wait: { type: 'boolean', description: 'Wait for the audit queue to finish instead of returning immediately.' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const initial = await session.read();
      if (!initial) throw new Error('no v4 goal: call pentest_flow_start first');
      const materialized = await materializeCoverageFindings({ session, state: initial });
      const current = materialized.state;
      const queued = auditPendingFor({
        session, state: current, agent: exec.agent, timeoutMs: args.timeoutMs, force: true
      });
      const result = args.wait === true && queued.run ? await queued.run : null;
      const after = await session.read();
      return {
        materialized: materialized.materialized,
        queued: queued.queued,
        reason: queued.reason || '',
        ...(result || {}),
        roles: after.roles || {},
        findings: (after.findings || [])
          .filter((item) => item.deleted !== true)
          .map((item) => ({
            id: item.id, severity: item.severity, status: item.status,
            approvalStatus: item.approvalStatus || null,
            claim: item.claim
          }))
      };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_role',
    description: 'Run one named role as a visible Team member (or a subagent fallback) and return its structured result. Roles never write v4 state; the Lead remains the only writer.',
    parameters: {
      action: { type: 'string', required: true, enum: ['run', 'status'] },
      role: { type: 'string', enum: CORE_ROLE_NAMES },
      payload: { type: 'object', additionalProperties: true },
      transport: { type: 'string', enum: ['subagent', 'teammate'], description: 'Role transport. DSH 0.2.2+ uses named subagents; teammate is the legacy agentTeams transport.' },
      confirmReporter: { type: 'boolean', description: 'Required true to run the reporter role. The reporter role must only start on an explicit user request to generate a report.' },
      timeoutMs: { type: 'number', description: 'Default 600000, max 600000.' },
      maxDepth: { type: 'number', description: 'Reserved; role agents always run at depth 1.' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const agentTeams = typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined;
      if (args.action === 'status') {
        const roles = Object.fromEntries(CORE_ROLE_NAMES.map((role) => [role, state.roles?.[role] || null]));
        return {
          roles,
          legacyRoles: state.roles || {},
          transports: { teammate: Boolean(agentTeams?.spawnTeammate), subagent: Boolean(getSubagents()?.startActivation) }
        };
      }
      const role = args.role;
      if (!CORE_ROLE_NAMES.includes(role)) throw new Error(`role is required: ${CORE_ROLE_NAMES.join(', ')}`);
      // The reporter member is never started implicitly. A model calling this
      // tool on its own must not spawn it without an explicit user request.
      if (role === 'reporter' && args.confirmReporter !== true) {
        throw new Error('reporter teammate requires an explicit user request to generate a report (pass confirmReporter:true only then)');
      }
      // Roles are named subagents in DSH 0.2.2+; legacy agentTeams is accepted
      // only as a fallback when the host still exposes spawnTeammate.
      const subagents = getSubagents();
      if (!subagents?.startActivation && !agentTeams?.spawnTeammate) {
        throw new Error('role transport unavailable: neither subagents.startActivation nor agentTeams.spawnTeammate is mounted');
      }
      if (args.transport && !['teammate', 'subagent'].includes(args.transport)) {
        throw new Error(`unsupported role transport: ${args.transport}`);
      }
      const runner = new TeamRoleRunner({
        session, subagents, agentTeams, agent: exec.agent, cwd: state.goal.workdir || process.cwd()
      });
      const outcome = await runner.run(role, args.payload || {}, { timeoutMs: args.timeoutMs });
      return outcome;
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_finding',
    description: 'Soft-delete a duplicate or wrong v4 finding so it disappears from the report and delivery check.',
    parameters: { findingId: { type: 'string', required: true } },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const next = await session.deleteFinding(args.findingId);
      return { findingId: args.findingId, deleted: true, revision: next.revision };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_wait',
    description: 'Short diagnostic poll for one v4 task. Do not use it to wait for normal worker progress; dispatch remaining work instead.',
    parameters: {
      taskId: { type: 'string', required: true },
      timeoutMs: { type: 'number', description: 'Default 3000, max 10000.' }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      // No runnable task => do NOT spin. goal-round-driver injects repeated
      // <goal_round> messages; polling here produced endless "子任务状态更新"
      // cards with no work. Return immediately and end the turn.
      const task = (state.tasks || []).find((item) => item.id === String(args.taskId));
      if (!task) throw new Error(`task not found: ${args.taskId}`);
      if (['done', 'failed', 'cancelled', 'unknown'].includes(task.state)) {
        return { done: true, timedOut: false, idle: true, task, note: 'task already terminal; derive a NEW concrete attack direction and dispatch it now, do not poll again' };
      }
      const auto = await autoAdvanceV4(sessionId, exec.agent, { dispatchOpen: false });
      const timeout = Math.min(Math.max(Number(args.timeoutMs) || 3000, 300), 10000);
      const deadline = Date.now() + timeout;
      const terminal = new Set(['done', 'failed', 'cancelled', 'unknown']);
      for (;;) {
        const summary = {
          revision: state.revision,
          facts: (state.facts || []).length,
          findings: (state.findings || []).filter((item) => item.deleted !== true && item.severity !== 'info').length,
          evidence: (state.evidence || []).length
        };
        if (terminal.has(task.state)) return { done: true, timedOut: false, task, summary, auto };
        if (Date.now() >= deadline) return { done: false, timedOut: true, task, summary, auto };
        await new Promise((resolve) => setTimeout(resolve, Math.min(1000, Math.max(100, deadline - Date.now()))));
      }
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_close',
    description: 'Close one open direction as done with a conclusion and at least one evidence id. Refuses while a task is still active.',
    parameters: {
      directionId: { type: 'string', required: true },
      answer: { type: 'string', required: true },
      evidenceIds: { type: 'array', items: { type: 'string' }, required: true }
    },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
      const active = (state.tasks || []).filter((task) => task.directionId === args.directionId && ['queued', 'running'].includes(task.state));
      if (active.length > 0) throw new Error(`direction ${args.directionId} still has active task ${active.map((task) => task.id).join(', ')}; cancel or wait first`);
      if (!Array.isArray(args.evidenceIds) || args.evidenceIds.length === 0) {
        throw new Error('closing a direction as done requires at least one evidence id');
      }
      const next = await session.updateDirection(args.directionId, {
        state: 'done',
        conclusion: { answer: args.answer, evidenceIds: args.evidenceIds }
      });
      const direction = (next.directions || []).find((item) => item.id === args.directionId);
      return { directionId: args.directionId, state: direction?.state || 'done', revision: next.revision };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_cancel',
    description: 'Cancel one running v4 task and interrupt its child agent.',
    parameters: { taskId: { type: 'string', required: true } },
    execute: async (args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal');
      const subagents = typeof ctx.get === 'function' ? ctx.get('subagents') : undefined;
      const dispatcher = new V4Dispatcher({ session, subagents, agent: exec.agent, cwd: state.goal.workdir });
      return { cancelled: await dispatcher.cancel(args.taskId) };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_flow_reconcile',
    description: 'Reconcile running v4 tasks after a restart: a task whose child session is gone becomes unknown, never a permanent running task.',
    parameters: {},
    execute: async (_args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const session = await getV4Session(sessionId);
      const state = await session.read();
      if (!state) throw new Error('no v4 goal');
      const subagents = typeof ctx.get === 'function' ? ctx.get('subagents') : undefined;
      const dispatcher = new V4Dispatcher({ session, subagents, agent: exec.agent, cwd: state.goal.workdir });
      return dispatcher.reconcile();
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_plan',
    description: 'Read the deterministic next-action plan: runnable queue tasks, frontier, blocked directions, high/critical findings awaiting validation, and whether the goal can be completed. Read-only; does not mutate state.',
    parameters: {
      limit: { type: 'number', description: 'Maximum actions/frontier rows to return (default 8, max 20).' }
    },
    execute: call(async (h, args, sessionId) => {
      const view = await h.state({ sessionId });
      return buildPlan(view, { now: Date.now(), limit: args.limit });
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_trace_add',
    description: 'Append one worker process step to the persistent trace store. Use after every meaningful shell/HTTP/browser step; later workers can search it even when no formal fact was written.',
    parameters: {
      taskId: { type: 'string', description: 'Queue task id this step belongs to (optional for recon).' },
      workerId: { type: 'string', description: 'Worker/teammate id; defaults to the current agent session.' },
      step: { type: 'string', description: 'Monotonic step label/number, e.g. "1" or "probe-login".' },
      tool: { type: 'string', description: 'Tool used: pwsh/http/browser/web_fetch/etc.' },
      phase: { type: 'string', description: 'recon/exploit/validate/teardown (default step).' },
      summary: { type: 'string', description: 'Short result summary, <=400 chars.' },
      detail: { type: 'string', description: 'Full request/response or command detail, <=8192 chars.' },
      evidenceRefs: { type: 'array', items: { type: 'string' }, description: 'Evidence ids/paths/hashes associated with this step.' }
    },
    execute: call(async (_h, args, sessionId, exec) => {
      const trace = await getTraceStore();
      const workerId = String(args.workerId || exec?.agent?.session?.id || '').trim();
      return trace.add(sessionId, {
        taskId: args.taskId,
        workerId,
        step: args.step,
        tool: args.tool,
        phase: args.phase,
        summary: args.summary,
        detail: args.detail,
        evidenceRefs: args.evidenceRefs
      });
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_trace_search',
    description: 'Search process traces from this engagement (including other workers). Use before repeating a probe or when a direction stalls.',
    parameters: {
      query: { type: 'string', description: 'Case-insensitive substring over task/worker/tool/summary/detail.' },
      taskId: { type: 'string', description: 'Only this task id.' },
      excludeTaskId: { type: 'string', description: 'Exclude the current task to avoid self-hits.' },
      limit: { type: 'number', description: 'Maximum hits (default 20, max 100).' }
    },
    execute: call(async (_h, args, sessionId) => {
      const trace = await getTraceStore();
      return trace.search(sessionId, {
        query: args.query,
        taskId: args.taskId,
        excludeTaskId: args.excludeTaskId,
        limit: args.limit
      });
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_trace_get',
    description: 'Read full trace records for one task, selected step ids, or one exact event id. Use after trace_search to inspect the exact request/response or command output.',
    parameters: {
      eventId: { type: 'string', description: 'Exact trace event id returned by trace_add or trace_search.' },
      taskId: { type: 'string' },
      stepIds: { type: 'array', items: { type: 'string' } },
      limit: { type: 'number', description: 'Maximum events (default 100, max 200).' }
    },
    execute: call(async (_h, args, sessionId) => {
      const trace = await getTraceStore();
      return trace.get(sessionId, { eventId: args.eventId, taskId: args.taskId, stepIds: args.stepIds, limit: args.limit });
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_trace_stats',
    description: 'Summarize trace coverage by task and tool. Useful for the planner to see which worker processes actually ran.',
    parameters: {},
    execute: call(async (_h, _args, sessionId) => {
      const trace = await getTraceStore();
      return trace.stats(sessionId);
    })
  }));

  // P0-4: engagement-level HTTP traffic index. Workers record captured
  // request/response exchanges here; later workers search historical bodies.
  ctx.tools.register(tool({
    name: 'pentest_traffic_record',
    description: 'Record one captured HTTP request/response into the engagement traffic index so any later worker can search it. Accepts method/url/host/status/headers/body, or a raw HTTP transcript. role binds it to a finding as baseline/proof/verification.',
    parameters: {
      method: { type: 'string' },
      url: { type: 'string' },
      path: { type: 'string' },
      host: { type: 'string' },
      status: { type: 'number' },
      headers: { type: 'object', additionalProperties: true },
      body: { type: 'string' },
      raw: { type: 'string', description: 'Raw HTTP request/response transcript when structured fields are unavailable.' },
      role: { type: 'string', enum: ['baseline', 'proof', 'verification', 'supporting', 'counter', 'untagged'] },
      taskId: { type: 'string' },
      workerId: { type: 'string' },
      evidenceId: { type: 'string' },
      findingId: { type: 'string' },
      summary: { type: 'string' }
    },
    execute: call(async (_h, args, sessionId) => {
      const traffic = await getTrafficStore();
      const out = await traffic.record(sessionId, args);
      return { id: out.item.id, reused: out.reused, revision: out.revision, host: out.item.host, url: out.item.url, status: out.item.status };
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_traffic_search',
    description: 'Search historical HTTP responses across ALL workers in this engagement. body_contains is a case-insensitive literal substring over response bodies — use it to find leaked secrets, stack traces, internal IPs or hidden endpoints in past traffic. Returns bounded snippets, never full bodies.',
    parameters: {
      body_contains: { type: 'string', description: 'Literal substring to find in response bodies / URLs / summaries (case-insensitive).' },
      url_contains: { type: 'string' },
      host: { type: 'string' },
      status: { type: 'number' },
      method: { type: 'string' },
      role: { type: 'string' },
      taskId: { type: 'string' },
      excludeTaskId: { type: 'string', description: 'Exclude one worker task, e.g. to find evidence from OTHER workers.' },
      limit: { type: 'number' }
    },
    execute: call(async (_h, args, sessionId) => {
      const traffic = await getTrafficStore();
      return traffic.search(sessionId, args);
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_traffic_stats',
    description: 'Summarize the engagement traffic index by host, status and evidence role.',
    parameters: {},
    execute: call(async (_h, _args, sessionId) => {
      const traffic = await getTrafficStore();
      return traffic.stats(sessionId);
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_asset_import',
    description: 'Import assets into the global asset graph. Rows are objects: {type,value,meta,parentId}. Deduplicates by type+value, supports parent hierarchy, and never mutates the per-session graph directly.',
    parameters: {
      rows: {
        type: 'array',
        required: true,
        items: { type: 'object', additionalProperties: true },
        description: 'Asset rows; type is root-domain/subdomain/ip/service/app/endpoint.'
      }
    },
    execute: call(async (h, args, sessionId) => {
      const view = await h.state({ sessionId });
      const scopeKey = scopeKeyForTarget(view.goal?.target, sessionId);
      const graph = await getAssetGraphStore();
      return graph.add(sessionId, args.rows, scopeKey);
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_asset_search',
    description: 'Search the global asset graph by value/type/meta. Use before importing or re-testing an endpoint; results include stable global asset ids.',
    parameters: {
      query: { type: 'string' },
      type: { type: 'string', enum: ['root-domain', 'subdomain', 'ip', 'service', 'app', 'endpoint'] },
      limit: { type: 'number' },
      offset: { type: 'number' }
    },
    execute: call(async (h, args, sessionId) => {
      const view = await h.state({ sessionId });
      const scopeKey = scopeKeyForTarget(view.goal?.target, sessionId);
      const graph = await getAssetGraphStore();
      return graph.search({ query: args.query, type: args.type, limit: args.limit, offset: args.offset, scopeKey });
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_asset_link',
    description: 'Anchor a direction/fact/finding from this session to a global asset. Idempotent; validates that the node exists in the canonical engagement state.',
    parameters: {
      nodeType: { type: 'string', required: true, enum: ['direction', 'intent', 'fact', 'finding'] },
      nodeId: { type: 'string', required: true },
      assetId: { type: 'string', required: true }
    },
    execute: call(async (h, args, sessionId) => {
      const view = await h.state({ sessionId });
      const nodeType = args.nodeType === 'intent' ? 'direction' : args.nodeType;
      const collection = nodeType === 'direction'
        ? (view.intents || view.directions || [])
        : nodeType === 'fact'
          ? (view.facts || [])
          : (view.findings || []);
      if (!collection.some((node) => node.id === args.nodeId)) {
        throw new Error(`asset link node not found: ${nodeType} ${args.nodeId}`);
      }
      const scopeKey = scopeKeyForTarget(view.goal?.target, sessionId);
      const graph = await getAssetGraphStore();
      return graph.link({ sessionId, nodeType: args.nodeType, nodeId: args.nodeId, assetId: args.assetId, scopeKey });
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_asset_links',
    description: 'List global-asset anchors for this session, optionally filtered by node type/id.',
    parameters: {
      nodeType: { type: 'string', enum: ['direction', 'intent', 'fact', 'finding'] },
      nodeId: { type: 'string' },
      limit: { type: 'number' }
    },
    execute: call(async (_h, args, sessionId) => {
      const graph = await getAssetGraphStore();
      return graph.links({ sessionId, nodeType: args.nodeType, nodeId: args.nodeId, limit: args.limit });
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_asset_stats',
    description: 'Summarize the global asset graph by asset type and anchor node type.',
    parameters: {},
    execute: call(async (h, _args, sessionId) => {
      const view = await h.state({ sessionId });
      const scopeKey = scopeKeyForTarget(view.goal?.target, sessionId);
      const graph = await getAssetGraphStore();
      return graph.stats({ scopeKey });
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_queue_push',
    description: 'Queue one execution task for an intent. One active task per intent; the state machine enforces it.',
    parameters: {
      intentId: { type: 'string', required: true },
      title: { type: 'string' },
      priority: { type: 'number' },
      maxAttempts: { type: 'number' },
      payload: { type: 'object', additionalProperties: true },
      budget: { type: 'object', additionalProperties: true, description: 'Optional {maxCalls,maxMs,maxEvidence}; 0 means unlimited.' },
      maxCalls: { type: 'number' },
      maxMs: { type: 'number' },
      maxEvidence: { type: 'number' }
    },
    execute: call((h, args, sessionId) => h.queuePush({
      sessionId, intentId: args.intentId, title: args.title, priority: args.priority, maxAttempts: args.maxAttempts, payload: args.payload,
      budget: args.budget, maxCalls: args.maxCalls, maxMs: args.maxMs, maxEvidence: args.maxEvidence
    }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_queue_sync',
    description: 'Create a pending queue task for every non-terminal direction that lacks one. Use to repair a legacy graph before dispatch; idempotent and never creates two active tasks for one direction.',
    parameters: {},
    execute: call((h, args, sessionId) => h.syncQueue({ sessionId }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_reproject',
    description: 'Re-emit the current canonical state as a UI snapshot. Use after a snapshot append error or when the 渗透 tab is stale.',
    parameters: {},
    execute: async (_args, exec) => {
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const ok = await reprojectSession(sessionId, { force: true });
      return { reprojected: ok, sessionId };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_queue_claim',
    description: 'Claim the next ready task for a worker. A worker with an active task gets that same task back.',
    parameters: {
      workerId: { type: 'string', required: true },
      leaseMs: { type: 'number' }
    },
    execute: call((h, args, sessionId) => h.queueClaim({ sessionId, workerId: args.workerId, leaseMs: args.leaseMs }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_queue_renew',
    description: 'Renew the lease of a claimed/running task for the owning worker.',
    parameters: {
      taskId: { type: 'string', required: true },
      workerId: { type: 'string' },
      leaseMs: { type: 'number' }
    },
    execute: call((h, args, sessionId) => h.queueRenew({ sessionId, taskId: args.taskId, workerId: args.workerId, leaseMs: args.leaseMs }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_queue_spend',
    description: 'Charge execution usage to a task budget. Exhausting the budget marks the task dead instead of spinning forever.',
    parameters: {
      taskId: { type: 'string', required: true },
      workerId: { type: 'string' },
      calls: { type: 'number' },
      timeMs: { type: 'number' },
      evidence: { type: 'number' }
    },
    execute: call((h, args, sessionId) => h.queueSpend({ sessionId, taskId: args.taskId, workerId: args.workerId, calls: args.calls, timeMs: args.timeMs, evidence: args.evidence }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_queue_complete',
    description: 'Complete a task. The intent is marked done only when all its tasks are terminal. A task with zero calls/time/evidence is rejected: call pentest_queue_spend first.',
    parameters: {
      taskId: { type: 'string', required: true },
      workerId: { type: 'string' },
      summary: { type: 'string' },
      evidenceIds: { type: 'array', items: { type: 'string' } },
      findingIds: { type: 'array', items: { type: 'string' } }
    },
    execute: call((h, args, sessionId) => h.queueComplete({ sessionId, taskId: args.taskId, workerId: args.workerId, summary: args.summary, evidenceIds: args.evidenceIds, findingIds: args.findingIds }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_queue_fail',
    description: 'Fail a task; retry or dead is decided by maxAttempts. Dead task blocks its intent.',
    parameters: {
      taskId: { type: 'string', required: true },
      workerId: { type: 'string' },
      reason: { type: 'string' }
    },
    execute: call((h, args, sessionId) => h.queueFail({ sessionId, taskId: args.taskId, workerId: args.workerId, reason: args.reason }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_queue_bind_job',
    description: 'Bind a background job to a task so completion/failure cancels it.',
    parameters: {
      taskId: { type: 'string', required: true },
      workerId: { type: 'string' },
      jobId: { type: 'string', required: true }
    },
    execute: call((h, args, sessionId) => h.queueBindJob({ sessionId, taskId: args.taskId, workerId: args.workerId, jobId: args.jobId }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_queue_reconcile',
    description: 'Requeue tasks whose lease expired or whose worker is gone.',
    parameters: {
      liveWorkers: { type: 'array', items: { type: 'string' } }
    },
    execute: call((h, args, sessionId) => h.queueReconcile({ sessionId, liveWorkers: args.liveWorkers }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_dispatch',
    description: 'Assign one pending task to a worker and start its agent. Non-blocking: returns after the task is claimed, never waits for the worker turn.',
    parameters: {
      taskId: { type: 'string' },
      intentId: { type: 'string' },
      workerName: { type: 'string' }
    },
    execute: async (args, exec) => {
      const handlers = await getHandlers();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      await handlers.ensure({ sessionId });
      let taskId = String(args.taskId || '');
      if (taskId === '' && args.intentId) {
        const current = await handlers.state({ sessionId });
        const existing = current.queue.find((task) => task.intentId === args.intentId && ['pending', 'claimed', 'running'].includes(task.state));
        if (existing) taskId = existing.id;
        else {
          const pushed = await handlers.queuePush({ sessionId, intentId: args.intentId, title: args.intentId });
          taskId = pushed.task.id;
        }
      }
      if (taskId === '') throw new Error('pentest_dispatch requires taskId or intentId');
      const workerName = String(args.workerName || ('v2-' + taskId.replace(/[^a-zA-Z0-9-]/g, '')));
      const assigned = await handlers.queueAssign({ sessionId, taskId, workerId: workerName });
      const task = assigned.task;
      const current = await handlers.state({ sessionId });
      const goal = current.goal || {};
      const prompt = [
        `你是渗透测试执行成员 ${workerName}。只执行任务，不创建 goal/intent。`,
        `目标：${goal.target || '(未设置)'}`,
        `目的：${goal.objective || '(未设置)'}`,
        `工作目录：${goal.workdir || '(未设置)'}`,
        `领取任务：${task.id}（intent ${task.intentId}）`,
        `任务：${task.title}`,
        `发现 fact/asset/finding 时调用 pentest_submit；能找到 source 就带 intentId=${task.intentId}，不确定也先记录，后续再关联。`,
        `建议每完成一批探测调用 pentest_queue_spend(taskId="${task.id}", workerId="${workerName}", calls=1, evidence=<新增证据数>)。`,
        `完成后调用 pentest_queue_complete(taskId="${task.id}", workerId="${workerName}", summary="...", evidenceIds=[...], findingIds=[...])。`,
        `不要等待 Lead，不要越权，不要编造证据。`
      ].join('\n');
      // 关键：绝不 await 目标成员整轮；detached 发送后立即返回。
      const p = ctx.tools.execute({
        callId: 'v2-dispatch-' + task.id + '-' + Date.now(),
        name: 'spawn_teammate',
        arguments: { name: workerName, description: task.title, prompt, context: 'fresh' },
        agent: exec.agent,
        signal: new AbortController().signal
      });
      Promise.resolve(p).catch(() => {});
      return { dispatched: true, task, workerName, sessionId };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_add_coverage',
    description: 'Record one tested surface/risk area and its outcome (no_issue_found/ruled_out/not_tested).',
    parameters: {
      surface: { type: 'string', required: true },
      riskArea: { type: 'string', required: true },
      outcome: { type: 'string' },
      evidence: { type: 'string' },
      author: { type: 'string' }
    },
    execute: call((h, args, sessionId) => h.addCoverage({ sessionId, ...args }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_add_digest',
    description: 'Record a compact digest of several facts.',
    parameters: {
      title: { type: 'string', required: true },
      summary: { type: 'string' },
      factIds: { type: 'array', items: { type: 'string' } }
    },
    execute: call((h, args, sessionId) => h.addDigest({ sessionId, ...args }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_submit',
    description: 'Batch-submit facts/assets/findings from a worker. Each item is reported separately; failures are never silent.',
    parameters: {
      intentId: { type: 'string' },
      facts: { type: 'array', items: { type: 'object', additionalProperties: true } },
      assets: { type: 'array', items: { type: 'object', additionalProperties: true } },
      findings: { type: 'array', items: { type: 'object', additionalProperties: true } }
    },
    execute: call((h, args, sessionId) => h.submit({ sessionId, ...args }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_evidence_audit',
    description: 'Audit v3 evidenceIds: every id must exist, sha256 must match, and high/critical findings need reproduced validation. Read-only.',
    parameters: {},
    execute: call((h, args, sessionId) => h.evidenceAudit({ sessionId }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_evidence_export',
    description: 'Materialize v3 evidence records as content-addressed files under <goal.workdir>/evidence/blobs plus index.json. Idempotent; does not change state or the report.',
    parameters: {},
    execute: call(async (h, _args, sessionId) => {
      const view = await h.state({ sessionId });
      const workdir = view.goal?.workdir || '';
      return exportEvidence({ evidence: view.evidence || [], workdir });
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_evidence_verify',
    description: 'Verify that every v3 evidence record has a matching content-addressed blob under the goal workdir. Read-only.',
    parameters: {},
    execute: call(async (h, _args, sessionId) => {
      const view = await h.state({ sessionId });
      const workdir = view.goal?.workdir || '';
      return verifyEvidenceExport({ evidence: view.evidence || [], workdir });
    })
  }));

  ctx.tools.register(tool({
    name: 'pentest_report',
    description: 'Build the final client-deliverable report in the established format: summary table, per-vulnerability sections (description, reproducible test process with raw HTTP, remediation), asset inventory and exploration appendix. format=html returns a self-contained document that Word/browser/PDF can open.',
    parameters: {
      format: { type: 'string', enum: ['markdown', 'html'] }
    },
    execute: async (args, exec) => {
      const handlers = await getHandlers();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const cwd = typeof exec?.agent?.session?.header?.cwd === 'string' ? exec.agent.session.header.cwd : '';
      try {
        const view = await handlers.state({ sessionId });
        const goal = view?.goal || {};
        ensureScopeFile({ cwd, workdir: goal.workdir, target: goal.target, objective: goal.objective, authorization: goal.authorization });
      } catch { /* SCOPE 补齐失败不影响报告 */ }
      return handlers.report({ sessionId, format: args.format });
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_delete_finding',
    description: 'Soft-delete a duplicate/false-positive finding. Deleted findings disappear from report and UI. Use after merging its affectedAssets into the surviving finding.',
    parameters: {
      id: { type: 'string', required: true },
      reason: { type: 'string' }
    },
    execute: call((h, args, sessionId) => h.deleteFinding({ sessionId, id: args.id, reason: args.reason }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_delivery_check',
    description: 'Run before final delivery: checks report freshness vs state revision, SCOPE.md, open intents, coverage/assets, high/critical validation, duplicate dedupeKeys. Returns problems=[] when deliverable is consistent. Does NOT require stopping the goal.',
    parameters: {},
    execute: call((h, args, sessionId) => h.deliveryCheck({ sessionId }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_repair_layout',
    description: 'One-time repair for legacy sessions that shared one workdir: derive an isolated per-session workdir, create SCOPE.md and update goal.workdir. Existing files are NOT moved automatically; they remain in the old directory.',
    parameters: {},
    execute: async (args, exec) => {
      const handlers = await getHandlers();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const cwd = typeof exec?.agent?.session?.header?.cwd === 'string' ? exec.agent.session.header.cwd : '';
      const view = await handlers.state({ sessionId });
      const goal = view?.goal || {};
      if (!goal.target) throw new Error('pentest_repair_layout: no goal in this session');
      const oldWorkdir = String(goal.workdir || '');
      const workdir = ensureWorkdir(cwd, goal.target, oldWorkdir, sessionId);
      const updated = await handlers.addGoal({
        sessionId,
        target: goal.target,
        objective: goal.objective || '',
        authorization: goal.authorization || '',
        workdir
      });
      const scopePath = ensureScopeFile({ cwd, workdir: updated.workdir || workdir, target: goal.target, objective: goal.objective || '', authorization: goal.authorization || '' });
      return {
        oldWorkdir,
        newWorkdir: updated.workdir || workdir,
        scopePath,
        note: '旧目录中的文件未自动搬迁；新文件从现在起写入 newWorkdir。'
      };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_pause_all',
    description: 'Pause scheduling for all pentest tasks and workers without ending the goal. Use when the user asks to 暂停全员任务/暂停所有任务 or the UI requests it. Resume with pentest_resume_all.',
    parameters: {
      reason: { type: 'string' }
    },
    execute: async (args, exec) => {
      const handlers = await getHandlers();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const v4 = await getV4Session(sessionId);
      const v4State = await v4.read();
      const out = v4State?.goal
        ? await v4.pause()
        : await handlers.pauseAll({ sessionId, reason: args.reason });
      await setNativeGoalPaused(sessionId, true);
      try { await v4.setAutoDispatch(false); } catch { /* legacy state */ }
      await pauseActiveTasks(sessionId);
      await interruptPentestMembers(sessionId);
      await interruptPentestWorkers(sessionId);
      return out;
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_resume_all',
    description: 'Resume scheduling after pentest_pause_all. Pending queue tasks can be claimed again; the goal remains active.',
    parameters: {},
    execute: async (args, exec) => {
      const handlers = await getHandlers();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const v4 = await getV4Session(sessionId);
      const v4State = await v4.read();
      const out = v4State?.goal
        ? await v4.resume()
        : await handlers.resumeAll({ sessionId });
      await setNativeGoalPaused(sessionId, false);
      if (v4State?.goal) {
        try { await v4.setAutoDispatch(true); } catch { /* legacy state */ }
        void autoAdvanceV4(sessionId, exec.agent, { dispatchOpen: true, force: true }).catch(() => {});
      }
      try { await reprojectSession(sessionId); } catch { /* projection self-heals */ }
      return out;
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_stop_goal',
    description: 'Only call when the user explicitly says to end/stop/terminate the goal (结束目标/停止目标/终止目标). Do NOT call for 整理成果/封版 — the goal stays active and is ended manually by the user. Unlike blocked/complete, this is allowed even with open intents. Run pentest_report + pentest_delivery_check first.',
    parameters: {
      reason: { type: 'string', required: true }
    },
    execute: async (args, exec) => {
      if (!userExplicitlyEndsGoal(latestUserTextOf(exec))) {
        throw new Error('目标保护：只有用户明确要求结束/终止时才允许 stop；当前目标保持 active。');
      }
      const handlers = await getHandlers();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      // Recover completed checkpoints and stop children before closing the goal;
      // task-7's two findings were otherwise lost on pause/stop.
      await pauseActiveTasks(sessionId);
      const goal = await handlers.goalStop({ sessionId, reason: args.reason });
      // 同时暂停 DSH 原生 goal，避免 pentest 已 stopped 但 DSH goal-round driver 继续自动续跑。
      try {
        const goals = typeof ctx.get === 'function' ? ctx.get('goals') : undefined;
        const agentGoal = goals && typeof goals.get === 'function' ? goals.get(exec?.agent) : undefined;
        if (agentGoal && typeof goals.pause === 'function') {
          await goals.pause(exec.agent, { id: agentGoal.id, revision: agentGoal.revision });
        }
      } catch { /* 没有 goals 服务的独立测试环境忽略 */ }
      const delivery = await handlers.deliveryCheck({ sessionId });
      return { goal, delivery };
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_prove_goal',
    description: 'Attach an existing fact/finding as evidence for the goal.',
    parameters: {
      evidenceId: { type: 'string', required: true },
      reason: { type: 'string' }
    },
    execute: call((h, args, sessionId) => h.goalProve({ sessionId, evidenceId: args.evidenceId, reason: args.reason }))
  }));

  ctx.tools.register(tool({
    name: 'pentest_complete_goal',
    description: 'Only call when the USER explicitly asks to complete/end the goal, and only when all intents are terminal, no active queue remains, and evidence proofs exist. Missing credentials or exhausted branches are not completion.',
    parameters: {},
    execute: async (args, exec) => {
      if (!userExplicitlyEndsGoal(latestUserTextOf(exec))) {
        throw new Error('目标保护：只有用户明确要求完成/结束时才允许 complete；当前目标保持 active。');
      }
      const handlers = await getHandlers();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      return handlers.goalComplete({ sessionId });
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_block_goal',
    description: 'DISABLED: the model may never mark a pentest goal blocked. Only the human can pause/end a session task. Calling this always fails; keep the goal active and continue with the next concrete step.',
    parameters: {
      reason: { type: 'string', required: true },
      kind: { type: 'string', required: true, enum: ['user', 'external', 'no-progress-rounds'] }
    },
    execute: async () => {
      throw new Error('目标保护：渗透目标不能由模型标记为受阻；只有用户能暂停或结束任务。');
    }
  }));

  ctx.tools.register(tool({
    name: 'pentest_reopen_goal',
    description: 'Reopen a blocked goal after the human explicitly authorizes continuing. Keeps the whole graph; only the goal phase and blockedReason are changed.',
    parameters: {
      reason: { type: 'string', description: 'Why the human authorized continuation.' }
    },
    execute: async (args, exec) => {
      const handlers = await getHandlers();
      const sessionId = rootGraphSessionIdOf(exec, ctx.sessions);
      const out = await handlers.goalReopen({ sessionId, reason: args.reason });
      await setNativeGoalPaused(sessionId, false);
      return out;
    }
  }));

  ctx.inject(['sessionProjections'], (projectionCtx) => {
    projectionCtx.sessionProjections.register({
      key: 'pentest',
      schema: z.any(),
      stateSchema: z.any(),
      init: () => emptyProjection,
      apply: (previous, event) => applySnapshot(previous, event),
      view: (state) => state,
      wire: { viewSchema: z.any(), view: (state) => state },
      stateVersion: 2
    });
    projectionCtx.sessionProjections.register({
      key: 'pentestMounted',
      schema: z.boolean(),
      stateSchema: z.boolean(),
      init: () => false,
      apply: (mounted, event) => {
        if (mounted === true) return true;
        if (!event || typeof event !== 'object') return false;
        if (event.type === 'plugin:pentest/state' || event.type === 'pentest/state' || event.type === 'pentest/submit') return true;
        if (event.type === 'tool/call' && typeof event.data?.name === 'string' && event.data.name.startsWith('pentest_')) return true;
        return false;
      },
      view: (mounted) => mounted,
      wire: { viewSchema: z.boolean(), view: (mounted) => mounted },
      stateVersion: 2
    });
  });

  // One-shot self-heal for sessions created before the projection throttle was
  // fixed: their live projection may still be the revision-1 empty snapshot.
  // Once the session is loaded, re-emit its current state so the tab catches
  // up without requiring a new model turn.
  ctx.effect(() => {
    let disposed = false;
    let ticks = 0;
    const attempted = new Set();
    const statePath = path.join(os.homedir(), '.dsh', 'storages', 'stcs_v2.json');
    const v4StatePath = path.join(os.homedir(), '.dsh', 'storages', 'stcs_v4.json');
    const v4Attempted = new Set();
    let cachedMtime = -1;
    let cachedKeys = [];
    let v4CachedMtime = -1;
    let v4CachedKeys = [];
    let v4StartupReprojected = false;
    const tick = async () => {
      if (disposed) return;
      ticks += 1;
      try {
        const stat = fs.statSync(statePath);
        if (stat.mtimeMs !== cachedMtime) {
          cachedMtime = stat.mtimeMs;
          const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
          cachedKeys = Object.keys(raw?.tables?.states?.states ?? raw?.tables?.states ?? {});
        }
        for (const sessionId of cachedKeys) {
          if (!sessionId || attempted.has(sessionId)) continue;
          let session;
          try { session = ctx.sessions?.get?.(sessionId); } catch { session = undefined; }
          if (!session) continue;
          attempted.add(sessionId);
          try {
            const handlers = await getHandlers();
            const view = await handlers.state({ sessionId });
            if (view?.goal) await handlers.reproject({ sessionId });
          } catch { /* state may be legacy/missing; retry is not useful */ }
        }
        // v4 self-heal: older sessions were created before goal-derived assets
        // were seeded. V4Session.read performs the one-way, empty-inventory
        // backfill and its mutation emits a fresh projection snapshot.
        try {
          const v4Stat = fs.statSync(v4StatePath);
          if (v4Stat.mtimeMs !== v4CachedMtime) {
            v4CachedMtime = v4Stat.mtimeMs;
            const rawV4 = JSON.parse(fs.readFileSync(v4StatePath, 'utf8'));
            v4CachedKeys = Object.keys(rawV4?.tables?.states ?? {});
          }
          // Goal lifecycle belongs ONLY to the human, and the host
          // goal-round-driver is disabled at the profile level. The plugin
          // deliberately does NOT touch goals at all: no resume, no edit,
          // no create, no complete, and NO disarm (the UI shows an
          // active+disarmed goal as "已暂停的目标", which misled the user).
          // Unconditional migration (no live agent / drain / tool call needed):
          // clear historical "待用户审批" parked by the old broad red-line
          // keywords. The user's ONLY red line is testing interfaces that
          // delete/tamper with existing data; nothing else should be gated.
          let unblockedThisTick = 0;
          for (const sessionId of v4CachedKeys) {
            if (!sessionId) continue;
            try {
              const v4 = await getV4Session(sessionId);
              let state = await v4.read();
              if (!state?.goal) continue;
              const stale = (state.findings || []).filter((item) =>
                item && item.deleted !== true && item.approvalStatus === 'pending'
                && !redLineReason(`${item.claim || ''} ${item.description || ''} ${(item.steps || []).join(' ')}`));
              for (const item of stale) {
                try { state = await v4.run({ type: 'finding', op: 'unblock', id: item.id, now: Date.now() }); unblockedThisTick += 1; }
                catch (error) { drainLog('unblock-failed', { sessionId: String(sessionId).slice(0, 24), finding: item.id, error: String(error?.message || error) }); }
              }
            } catch { /* one session must not block the rest */ }
          }
          if (unblockedThisTick > 0) drainLog('unblocked', { count: unblockedThisTick });
          // One-shot startup reprojection for EVERY v4 session. The old loop
          // required ctx.sessions.get(id) and only ran once per id, so dormant
          // sessions kept a stale projection cache (e.g. details with no
          // response packets) after a deploy/restart. Derived data must be
          // rebuilt from canonical state on boot, not only for open chats.
          if (!v4StartupReprojected) {
            v4StartupReprojected = true;
            for (const sessionId of v4CachedKeys) {
              if (!sessionId) continue;
              try { await reprojectSession(sessionId, { force: true }); } catch { /* one bad session must not block the rest */ }
            }
          }
          // Only sessions with their OWN live agent may schedule work or audit.
          // Dormant sessions must never borrow another agent (that attached
          // pentest-auditor children to unrelated chats). Cap audit debt work
          // per tick so a 50-session restart cannot flood two global slots.
          const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
          // Audit every session with its own live agent on every tick. The
          // per-session auditPendingFor already dedupes by cooldown + inflight,
          // so do NOT break after 2 sessions — that used to leave findings in
          // later sessions stuck at 待审核 forever.
          let auditSessionsThisTick = 0;
          for (const sessionId of v4CachedKeys) {
            const agent = agents && typeof agents.get === 'function' ? agents.get(sessionId) : undefined;
            if (!agent) continue;
            try {
              await autoAdvanceV4(sessionId, agent, { dispatchOpen: true });
              auditSessionsThisTick += 1;
            } catch (error) {
              try { ctx.logger?.warn?.('pentest auto advance tick failed: ' + (error?.message || error)); } catch { /* best effort */ }
            }
          }
          // P0 global drain: any finding in a session without its own live
          // agent still gets audited by ONE reused visible teammate, so no
          // finding stays "待审核" just because its session is not open.
          try {
            await drainGlobalAuditDebt(v4CachedKeys, agents);
          } catch (error) {
            drainLog('v4-tick-error', { error: String(error?.message || error) });
            try { ctx.logger?.warn?.('pentest global audit drain failed: ' + (error?.message || error)); } catch { /* best effort */ }
          }
        } catch (error) {
          drainLog('v4-block-error', { error: String(error?.message || error) });
        }
      } catch { /* state store not ready yet */ }
    };
    const timer = setInterval(() => { void tick(); }, 3000);
    void tick();
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, 'pentest-v2.projection-self-heal');

  // STCS additive facade: the new `dsh-pentest-v2/artex` plugin shares this
  // exact store/session instance instead of opening a second one. No existing
  // tool, schema, description or protocol semantics are changed.
  const v4Facade = {
    getSession: (sessionId) => getV4Session(sessionId),
    getStore: () => getV4Store(),
    reprojectSession: (sessionId, options) => reprojectSession(sessionId, options),
    trafficEvidenceIndexer: (sessionId) => trafficEvidenceIndexer(sessionId),
    auditPendingFor: (options) => auditPendingFor(options),
    planV4
  };
  globalThis[PENTEST_V4_FACADE] = v4Facade;
  ctx.effect(() => () => {
    if (globalThis[PENTEST_V4_FACADE] === v4Facade) delete globalThis[PENTEST_V4_FACADE];
  }, 'pentest-v2.v4-facade');

  // 探索链路的协议说明只描述图语义，不教模型怎么测试。
  // 真正的约束在 state 层：finding 不能直接挂到 recon intent。
  const PENTEST_PROTOCOL = `你维护一条可回放的探索链路：goal → intent → fact/finding。
【首步·硬约束】用户消息给出目标（URL/域名/IP/主机/路径）或要求做渗透时，第一步必须调用 pentest_flow_status；若不存在 v4 状态，调用 pentest_flow_start 记录 target、targets、objective、authorization（新会话默认 v4）；authorization 必须包含授权方/授权记录和红线，空 authorization 禁止派工和交付；用户中途补充红线时立即调用 pentest_flow_authorize 更新，不能只写 SCOPE.md。只有用户明确要求 v3、或 v4 工具不可用时，才调用 pentest_add_goal。在 goal 建立前，不得执行侦察、写脚本、派活或调用其它工具。除非用户明确说「不要设置目标 / 先别记录目标 / 不建目标 / 只聊天」，才可跳过；跳过时不要创建任何 goal。若用户只给目的没给目标，先用 ask_user_question 问清目标再记录。
系统可能在首条用户消息时已自动记录 goal；若 pentest_state 显示 goal 已存在，直接沿用，不要重复初始化，只有目标/目的需要修正时才调用 pentest_add_goal 更新。
【v4·单轨】新会话优先用 pentest_flow_start 建立目标；一旦 pentest_flow_status 返回 exists:true，本会话只能走 v4：加方向用 pentest_flow_direction，或一次加最多 4 条独立方向用 pentest_flow_directions；派工用 pentest_flow_dispatch（默认 maxWorkers=6；有多个独立 frontier 时不传 count，一次填满所有空闲槽位，绝不要 count=1 逐个派、也不要派 1 个就停下来等 Leader；强依赖链不要并行，等前一步 fact 再派下一步），派工后结束本轮，不要用 pentest_flow_wait 阻塞规划；worker 完成会由 goal/sidecar 唤醒 planner。验收先调用 pentest_flow_audit 一次性审计全部 unvalidated finding（审计成员与 worker 并行，不阻塞派工）；个别需要补验证证据的 finding 再用 pentest_flow_validate（高危优先 independent:true，让 pentest-auditor 独立复现并导入新证据）；状态用 pentest_flow_status；交付前可用 pentest_flow_role 跑 auditor，角色只返回结构化意见，不写 state。evidence/deliver 方向由 Lead 自己 pentest_flow_report + pentest_flow_delivery 完成，不派 worker。禁止 spawn_teammate、禁止 send_message 派活，禁止再调用 pentest_add_goal / pentest_add_intent / pentest_dispatch / pentest_queue_*；v4 的目标、方向和证据只由 v4 工具维护。
【v4 目标】每个 engagement 有 goals；只有 pentest_flow_prove(goalId, evidenceId) 能用 fact/finding 证明目标；全部 goal met 前 pentest_flow_delivery 必然失败。
【授权口径】以用户原话为最高依据；不得自行增加“书面工单/加白回执/测试窗口/测试账号”这类停止门槛。若授权文本里已有 Lead 自己加的此类门槛，先用 pentest_flow_authorize 清理成用户口径。${RED_LINE} 生产环境、获取令牌、上传面探测、只读验证等都不是拒绝测试的理由。授权策略：${AUTHORIZATION_POLICY}
【v4 资产】flow_start 已从目标预置 root-domain/subdomain/ip/app/service；发现新主机、服务或接口用 pentest_flow_asset 写入，worker 也会返回 assets；不要只把资产写进 facts。
【v4 planner】worker/validate/close 后调用 pentest_flow_plan；返回 mustGenerate=true 时必须在同一轮 accept_candidate 或 add_direction，不能空转。候选方向来自 worker 的 nextDirections；接受候选后要 dispatch，拒绝候选要写 reason。没有候选时用 plan.fallback（已带具体 target+axis）建方向，或直接调 pentest_flow_autoplan 让系统建 1 条；不要写“测试输入类漏洞”这种空话。pentest_flow_close 只能关闭已有 fact/evidence 的方向，未执行的方向不能空 close。coverage 用 pentest_flow_coverage 记录 no_issue_found/issue_found/not_tested/blocked。报告整理、证据索引、交付收口、一致性校验是 Lead 自己的直接工作，禁止创建成 direction 或派 worker；方向必须绑定具体 endpoint/参数和可判定证据。
【v4 报告】默认由确定性 renderer 生成报告，绝不自动启动任何报告成员；只有用户明确说「生成报告 / 出报告」时，才调用 pentest_flow_report({member:true}) 让 pentest-reporter 成员写（或 pentest_flow_role 带 confirmReporter:true）。报告生成后 state 变为旧 revision 或再次修改 state 都会让 delivery 判定报告过期。
【intent】intent 是一个可独立验证的探索方向。侦察类 intent 只产出 fact 与 asset；验证/利用类 intent 才产出 finding。kind 可显式传 recon/verify/exploit/report；不传默认 recon。priority 越大越先做。每个 intent 会自动生成一个 queue task，返回里带 taskId。
【状态同步】若 渗透 tab 与 pentest_state 不一致（常见于历史快照 append 被拒），调用 pentest_reproject 重发当前快照；正常写入现在会自动带快照。
【规划】每次新回合或改向前先调用 pentest_plan；优先执行它给出的 runnable task，frontier 为空才从新事实派生 direction，不要凭感觉重复建方向。
【轨迹】每个有意义的 shell/HTTP/browser 步骤后调用 pentest_trace_add 记录 taskId、step、tool、summary、detail；开始新探针前先 pentest_trace_search，复用其他 worker 的过程，避免重复劳动。
【流量】捕获到 request/response 原文后调用 pentest_traffic_record 落盘（role 用 baseline/proof/verification 绑定 finding）；开始新探测或想找密钥/报错/内网 IP/隐藏接口时先 pentest_traffic_search(body_contains=...)，复用历史响应，不要重复 curl 已记录过的 URL。worker 提交的 evidence 文件会自动进索引，无需重复记录。
【接口侦察】surface 阶段跑完 harvest_static/spider_mpa 等后，把 api_merged.txt / params_merged.txt / site_map.json 内容传给 pentest_flow_asset 的 apiMerged/paramsMerged/siteMap 参数：自动写成 endpoint 资产并返回 reconDirections，用 pentest_flow_directions 分批落成 verify 方向后再派工；limitations/列为未覆盖表面，不转成「无更多端点」。
【失败续跑】pentest_flow_status 的 resumeCandidates 列出可继续的失败任务（含 continueFrom 与已有 evidenceIds），同方向至多复核一次，observed 否定结论不续跑；瞬时代理失败不要永久封死方向。
【覆盖度】看 derivedCoverage.ratio（被 fact/evidence 锚定的 in-scope 资产占比）与 untestedDirections，而不是把 12 轴打勾当覆盖；它只是资产锚定指标，不代表安全。
【独立复测】pentest_flow_validate 记 not_reproduced 时必须给出 attempts（≥2 次一致未复现）、comparableEnvironment、normalControl；缺任一会被降级为 inconclusive 并阻断交付，一次失败绝不判已修复。
【资产图】发现主机/子域/服务/端点时用 pentest_asset_import 同步到全局资产图；把方向/事实/漏洞用 pentest_asset_link 锚到 assetId；重复资产复用，不重复导入。
【执行】必须用 pentest_dispatch(taskId 或 intentId) 派 worker；不要直接 spawn_teammate，也不要在没有 task 的情况下自己长跑。若 goal 已有 direction 但 queue 为空，先调用 pentest_queue_sync 补任务。worker 只做 task 对应最小验证，用 pentest_queue_claim/renew/spend 记账，用 pentest_queue_complete/fail 收口；Lead 负责看 queue/frontier、补 intent、验收结果。
【finding】v3 中 finding 是一等节点，写入时传的 intentId 只是来源方向（会落成 directionId）；不要为 finding 手工创建 verify intent，也不要多个 finding 挤在同一个宽方向下冒充验证。报告按 finding 自己的步骤、证据、接口来源读取。
【报告字段】每条 finding 必须同时给 stepNotes 和 apiSources：stepNotes 与 reproducibleSteps 等长、逐步说明“做什么/为什么/看什么响应”；apiSources 写清接口来自哪个 JS bundle/源码文件/路由定义（例如 https://target/static/js/app.3f2a.js -> /api/user/list）。只有漏洞 URL、没有接口来源的 finding 视为不合格；纯端口/服务暴露等非接口类写 N/A（非接口类），不能留空。
【fact】成员发现可验证线索先写 fact（含 target/detail/evidenceRefs）；由 fact 再派生 verify intent 或 finding。
【state】用 pentest_state 看当前图；它返回 frontier（按 priority 排序的 open/running intent）。不要因为看不到某个方向就重复创建同名 intent。
【调度】只执行 queue 里 runnable 的 task；每个 task 用 pentest_queue_renew 续租、pentest_queue_spend 记预算、pentest_queue_complete/fail 收口。没有 runnable task 时，必须在本轮从已有 facts/assets/coverage 里派生一个带具体 endpoint/参数/判定条件的新方向并立即 dispatch，不能只报告当前状态或等待新事实；目标未达成前禁止「等待窗口 / 本轮不发起探测 / 状态不变」这类回复。
【进展判据】判断“要不要开新方向”看进展，不看方向数量：上一轮没有新增 fact、finding 或 reproduced 验证，才算停滞。停滞时必须在本轮做一件有实测价值的事——换入口、换协议、换等价路径、换参数/证据链，写一个具体的新方向并立刻派 worker 真发请求取响应；不要停在「等待下一个窗口」「WAF 封禁所以本轮不测」这类结论上（封禁本身也是一个要换源/换路径去验证的 fact）。空 intent 不算进展，不要新建宽泛方向（宽方向会把多条 finding 挤在同一条链上，报告读不出验证过程）。不要把全部事实堆在同一个 intent 下；每个子代理回报至少转成一个新的 fact，有明确验证价值的回报要转成新的 verify intent。
【来源绑定】finding 必须绑定来源 fact/intent；没有来源的 finding 只能标记为 lineageUnbound，不得进入正常链路图。
【长任务/目标状态】渗透目标永远保持 active，不会因为侦察结束、成员在跑、上下文不足、路径不可达或“暂时没思路”而自动暂停或标记受阻。成员在跑时 Lead 继续检查 frontier、补充方向、整理事实或推进其它方向。禁止在没有完成目标时返回 final answer；禁止用 pentest_block_goal / update_goal blocked 结束任务——pentest_block_goal 已禁用。只有用户本人明确说「暂停/结束/终止」才允许改变目标状态。
【禁止空转，不等于不测试】禁止的是「反复调 wait/status、重复回『目标状态不变 / 报告保持 N findings』、什么都不测」。目标未完成，每一轮都必须有新的实测动作：读已有证据 → 想出一个还没打过的具体攻击面 → 建方向 → 派 worker 发请求取响应 → 落 fact/evidence。禁止「等待窗口 / 本轮不发起探测 / 等待下一小时规律」这类自我设限的回复；WAF 封禁、IP 被限、入口不可达都只是要换路径继续测的 fact，不是停下来的理由。只有用户本人明确说「暂停/结束」才改变目标状态；模型不得自行标记受阻或结束。
【不可达】“当前路径不可达”只是一个 fact/方向结论，不是目标终止条件。必须把它转成新的验证方向（换入口、换协议、换等价路径、换证据链）继续推进；目标保持 active，只有用户明确要求停止时才暂停。
【恢复】目标不会被模型标记受阻；若历史数据里出现 blocked，保持继续推进并等用户确认，不要新建任务、不要自行恢复。
【成员回报】成员完成后应调用 pentest_add_fact 或 pentest_submit；即便没说，插件也会把 Team 回报自动入库为 fact，但显式提交仍然优先。
【工作目录】插件会为每个会话生成 <目标>_<会话短id>/ 独立 workdir 与 SCOPE.md；首次创建后 goal.workdir 固定，后续 add_goal 不允许再改到 evidence 或其它目录。
【工作区结构】工作区内固定使用：recon/（侦察脚本、静态资源、接口枚举）、evidence/（请求响应、截图、下载文件、hash）、scripts/（本次新增自动化脚本）、reports/（报告与交付物）。新生成的文件必须按类归入这些子目录。
【文件落盘】所有测试脚本、下载、报告、证据只能写入 goal.workdir 或其子目录；禁止写会话根目录、旧工具包目录（如 recon-open-test）、系统临时目录。shell 必须使用 workdir=<goal.workdir>（插件会默认注入并拦截越界），禁止在命令里用绝对路径、$VAR、Copy-Item/Move-Item 位置参数或 inline python open() 写到工作区外；write/edit 的 file_path 必须在 workdir 下。只有用户明确命令指定外部路径时才允许例外。
【去重】同一个根因跨主机只写一条 finding；dedupeKey 用 CWE+规范化端点（如 CWE-862:/api/index.php?ctl=bruce），affectedAssets 列出全部主机；report 里不允许同一根因按主机重复计数。
【验证】high/critical 标 confirmed 前必须有 validation.verdict=reproduced 或 evidenceRefs；没有独立验证就标 likely，并在交付检查里说明。
【交付】用户说「整理成果 / 封版」时：先调用 pentest_report 生成最新报告，再调用 pentest_delivery_check；把 problems 修完（或明确说明无法修的原因）后交付。**不要停止或结束 goal**——goal 由用户手动结束；只有用户明确说「结束目标 / 停止目标 / 终止目标」时才调用 pentest_stop_goal。整理成果之后 goal 保持 active 是正常的。
【报告】交付前 pentest_report 必须晚于最后一次图变更；delivery_check 不通过时不得声称“已交付/已封版”。
【证据文件】交付前如 state.evidence 非空，调用 pentest_evidence_export 落盘；用 pentest_evidence_verify 校验，缺失/篡改的 blob 必须修复后才能交付。
`;
  const PENTEST_ORCHESTRATION_PROTOCOL = `【并行调度硬规则】
1. 默认并发是 6 个 worker。每轮先看 pentest_flow_plan / pentest_flow_status 的 concurrency.available；只要还有空闲槽位，pentest_flow_dispatch 不传 count 就会一次填满所有空闲槽位。禁止用 count=1 逐个派工，禁止只派 1 个 worker 就停下来等它、等 Leader 半天；有独立方向时必须把 6 个名额尽量用完。
2. 独立 frontier 一次批量派；只有明确强依赖链才串行。派工后立即结束本轮或继续做审计/规划，不要用 pentest_flow_wait 阻塞，也不要等任意一个 worker 完成。plan/status 会自动接受待验证候选方向并按空闲槽位派发；看到 auto.accepted 或 auto.dispatched 后继续检查剩余 candidates，不要转去 wait。plan 返回 accept_candidate 或 accept_candidates 时，用 pentest_flow_candidate 一次接受这一批候选（ids 批量），再继续填满 worker；不要一次只接受一条。
3. 审计成员与 worker 并行：worker 提交后的审计在后台队列执行，不阻塞 worker 槽位。每次 pentest_flow_plan 返回 unvalidated 非空（actions 里出现 validate 或 validate_batch）时，必须调用一次 pentest_flow_audit，它会审计全部未验证的 finding（包括本次和历史遗留的低危项）；禁止只验证列表里的第一条，禁止遗漏。
4. 审计和 worker 都在跑时，Lead 继续检查 plan、补方向、派空余 worker；不要因为某个 worker 或某个审计任务没结束就停止调度。
5. 用户已明确说“这些都可以/可以测任何方向”时，不要把“没有书面工单/加白回执/测试窗口/测试账号”自行升级成停止条件；按用户原话直接做最小必要验证。${RED_LINE}
6. 报告整理、证据索引、交付收口、一致性校验是 Lead 自己的工作，不得创建成 direction 或派给 worker；worker 槽位只放能产出漏洞/fact/evidence 的攻击假设。`
  if (typeof ctx.inject === 'function') {
    ctx.inject(['systemPrompt'], (scope) => {
      scope.systemPrompt.section({
        name: 'pentest:protocol',
        order: 50,
        text: (context) => legacyProtocolFor(ctx, context, PENTEST_PROTOCOL)
      });
      scope.systemPrompt.section({
        name: 'pentest:orchestration',
        order: 51,
        text: (context) => legacyProtocolFor(ctx, context, PENTEST_ORCHESTRATION_PROTOCOL)
      });
    });
  }

  // [P2 diagnostic] one line per boot: which subagent providers exist and
  // whether they advertise structured output. Removed once P2 wiring lands.
  try {
    if (typeof ctx.get === 'function') {
      const subagents = ctx.get('subagents');
      let line = 'subagents: absent';
      if (subagents && typeof subagents.list === 'function') {
        const names = subagents.list() || [];
        line = names.length === 0
          ? 'subagents: no providers'
          : 'subagents: ' + names.map((name) => {
              let capabilities = null;
              try { capabilities = subagents.getProvider?.(name)?.capabilities ?? null; } catch { /* best effort */ }
              return `${name}(outputSchema=${capabilities?.outputSchema === true})`;
            }).join(', ');
      }
      fs.appendFileSync(
        path.join(os.homedir(), '.dsh', 'pentest-v2-boot.log'),
        `[${new Date().toISOString()}] ${line}\n`,
        'utf8'
      );
    }
  } catch { /* diagnostics must never block plugin load */ }
}

