/**
 * v4 单轨执行：Direction -> Task -> DSH subagent -> 结构化结果 -> 单事务落库。
 *
 * 设计约束：
 * - 只用 ctx.subagents.startActivation（provider=spawn，outputSchema=true）；
 * - worker 不直接写图谱，只交证据文件 + 结构化结论；
 * - 证据文件在提交前做路径逃逸检查 + sha256 校验；
 * - 一个方向同时只能有一个 queued/running task。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { inferAxes, normalizeAxes } from './axes.js';
import { normalizeAssetType } from './assets.js';
import { RED_LINE } from './policy.js';
import { checkNetworkTarget, networkCandidatesFrom } from '../scope.js';
import { buildSituationalPack } from './situational-pack.js';
import { buildCheckpoint, selectResumeCandidates } from './checkpoint.js';

export const DIRECTION_RESULT_STATES = ['done', 'exhausted', 'blocked', 'empty'];

function shortLabel(value, max = 72) {
  const textValue = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  return textValue.length > max ? `${textValue.slice(0, max - 1)}…` : textValue;
}

export const WORKER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['conclusion', 'directionState', 'evidence', 'facts', 'findings'],
  properties: {
    conclusion: { type: 'string' },
    directionState: { type: 'string', enum: DIRECTION_RESULT_STATES },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'kind', 'role', 'path'],
        properties: {
          key: { type: 'string' },
          kind: { type: 'string', enum: ['request', 'response', 'file', 'log', 'screenshot'] },
          role: { type: 'string', enum: ['baseline', 'proof', 'verification', 'supporting', 'counter'] },
          path: { type: 'string' },
          sha256: { type: 'string' },
          summary: { type: 'string' }
        }
      }
    },
    facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['answer'],
        properties: {
          answer: { type: 'string' },
          confidence: { type: 'string', enum: ['observed', 'inferred', 'high', 'medium', 'low'] },
          evidenceKeys: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    assets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'value'],
        properties: {
          type: {
            type: 'string',
            enum: ['root-domain', 'subdomain', 'ip', 'service', 'app', 'endpoint']
          },
          value: { type: 'string' },
          meta: { type: 'string' }
        }
      }
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'severity'],
        properties: {
          claim: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', description: '客户可读的漏洞描述（1-2 句）。' },
          riskAnalysis: { type: 'string', description: '实际影响与风险量级。' },
          remediation: { type: 'string', description: '可执行的修复建议。' },
          steps: { type: 'array', items: { type: 'string' }, description: 'Each step: one sentence explaining the action, the FULL raw HTTP request packet, and the ACTUAL response (status line + key headers + body excerpt). Never request-only or "预期" guesses.' },
          stepNotes: { type: 'array', items: { type: 'string' }, description: 'What was actually observed in this step (concise, one per step). Do not write 预期.' },
          apiSources: { type: 'array', items: { type: 'string' } },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          verificationLevel: { type: 'string', enum: ['source_only', 'local_harness', 'live_readonly', 'live_state_change', 'confirmed'] },
          impactProven: { type: 'string', enum: ['none', 'info', 'read', 'write', 'rce'] },
          evidenceKeys: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    coverage: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          axis: { type: 'string' },
          result: { type: 'string', enum: ['no_issue_found', 'issue_found', 'not_tested', 'blocked'] },
          note: { type: 'string' },
          evidenceKeys: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    nextQuestions: { type: 'array', items: { type: 'string' } },
    nextDirections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          doneWhen: { type: 'string' },
          axis: { type: 'array', items: { type: 'string' } },
          reason: { type: 'string' }
        },
        required: ['question']
      }
    }
  }
};

function findingHost(value) {
  const textValue = text(value);
  const match = textValue.match(/https?:\/\/([^/\s:]+)/i);
  return (match ? match[1] : textValue.split(/\s+/)[0] || '').toLowerCase();
}

/**
 * Worker commits used to add three separate low findings for the same
 * information-disclosure root cause because every worker wrote its own title.
 * Infer a stable key when the worker did not supply one, and drop a duplicate
 * before the reducer rejects the whole commit.
 */
export function inferFindingDedupeKey(finding, host = '') {
  // A validated RCE is the strongest semantic signal; never let a dedupeKey
  // that mentions a cron endpoint collapse it into an auth-bypass bucket.
  if (text(finding?.impactProven) === 'rce') return `rce:${host}`;
  const explicit = text(finding?.dedupeKey);
  if (explicit) {
    const normalized = explicit.toLowerCase().replace(/\s+/g, ' ').trim();
    const alias = normalized.match(/^(auth_bypass|information_disclosure|insecure_transport|file_upload|login_lockout_dos|rce)\b/);
    if (alias) {
      const map = { auth_bypass: 'auth-bypass', information_disclosure: 'information-disclosure', insecure_transport: 'insecure-transport', file_upload: 'file-upload', login_lockout_dos: 'login-lockout-dos', rce: 'rce' };
      return `${map[alias[1]]}:${host}`;
    }
    return normalized;
  }
  const vuln = text(finding?.vulnType).toLowerCase().replace(/\s+/g, '_');
  if (vuln) {
    const map = { auth_bypass: 'auth-bypass', information_disclosure: 'information-disclosure', insecure_transport: 'insecure-transport', file_upload: 'file-upload', login_lockout_dos: 'login-lockout-dos', rce: 'rce' };
    const key = map[vuln] || vuln;
    if (key) return `${key}:${host}`;
  }
  const blob = `${text(finding?.vulnType)} ${text(finding?.rootCause)} ${text(finding?.title)} ${text(finding?.claim)} ${text(finding?.description)}`;
  // Impact wins over the transport that delivered it: a version-bound RCE is
  // an RCE finding, not an information-disclosure duplicate.
  if (/(?:\brce\b|remote code execution|command execution|命令执行|命令注入|scripts?\/run)/i.test(blob)) {
    return `rce:${host}`;
  }
  if (/(?:auth(?:entication)?\s*bypass|authorization bypass|鉴权绕过|认证绕过|unauthorized|jwt|bearer)/i.test(blob)) {
    return `auth-bypass:${host}`;
  }
  if (/(?:leak|disclosure|version|nginx|uptime|information)/i.test(blob)) {
    return `information-disclosure:${host}`;
  }
  if (/(?:泄露|暴露|明文泄露)/.test(blob)) {
    return `information-disclosure:${host}`;
  }
  if (/(?:信息泄露|版本|health|env\.js|响应头|目录|information\s*disclosure)/i.test(blob)) {
    return `information-disclosure:${host}`;
  }
  if (/(?:rce|命令执行|命令注入|scripts?\/run|任意代码)/i.test(blob)) {
    return `rce:${host}`;
  }
  if (/(?:鉴权|认证|绕过|未授权|jwt|token|authorization)/i.test(blob)) {
    return `auth-bypass:${host}`;
  }
  return `${text(finding?.severity) || 'unknown'}:${blob.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120)}`;
}

export function dedupeFindingPayload(findings, existingFindings, host = '') {
  const seen = new Set((Array.isArray(existingFindings) ? existingFindings : [])
    .filter((finding) => finding && finding.deleted !== true)
    .map((finding) => inferFindingDedupeKey(finding, host)));
  const out = [];
  for (const finding of (Array.isArray(findings) ? findings : [])) {
    const key = inferFindingDedupeKey(finding, host);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...finding, dedupeKey: key });
  }
  return out;
}

function text(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

const ROLE_ALIASES = {
  support: 'supporting', supporting: 'supporting', proof: 'proof', evidence: 'proof',
  verify: 'verification', verification: 'verification', baseline: 'baseline',
  counter: 'counter', negative: 'counter'
};
const KIND_ALIASES = {
  http: 'response', request: 'request', response: 'response', file: 'file',
  log: 'log', screenshot: 'screenshot', image: 'screenshot'
};
const CONFIDENCE_ALIASES = {
  observed: 'observed', certain: 'observed', inferred: 'inferred', likely: 'inferred',
  high: 'high', medium: 'medium', low: 'low'
};
const SEVERITY_ALIASES = {
  critical: 'critical', high: 'high', medium: 'medium', moderate: 'medium',
  low: 'low', info: 'info', informational: 'info'
};
const IMPACT_ALIASES = {
  none: 'none', info: 'info', read: 'read', write: 'write', rce: 'rce', execution: 'rce'
};
const STATE_ALIASES = {
  done: 'done', completed: 'done', exhausted: 'exhausted', no_issue: 'exhausted',
  blocked: 'blocked', empty: 'empty'
};
const RESULT_ALIASES = {
  no_issue_found: 'no_issue_found', no_issue: 'no_issue_found', clean: 'no_issue_found',
  issue_found: 'issue_found', found: 'issue_found',
  not_tested: 'not_tested', skipped: 'not_tested', blocked: 'blocked'
};
const AXIS_ALIASES = {
  authn: 'identity', authentication: 'identity', auth: 'identity', identity: 'identity',
  authz: 'logic', authorization: 'logic', 'access-control': 'logic', access: 'logic',
  'data-exposure': 'evidence', 'data-leak': 'evidence', data: 'evidence', secrets: 'credential',
  api: 'surface', endpoints: 'surface', network: 'infra', cloud: 'infra',
  components: 'component', dependencies: 'component', business: 'logic'
};

function normalizeCoverageAxis(value, note) {
  const raw = Array.isArray(value) ? value : [value];
  const mapped = raw.map((item) => AXIS_ALIASES[text(item).trim().toLowerCase()] || item);
  const axes = normalizeAxes(mapped);
  if (axes.length > 0) return axes;
  const inferred = inferAxes(`${text(note)} ${text(value)}`);
  return inferred.length > 0 ? inferred : ['surface'];
}

/** Worker output is model-authored: fix common vocabulary drift before the
 * strict reducer sees it (support -> supporting, authn -> identity, ...). */
export function normalizeWorkerPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const next = structuredClone(payload);
  next.directionState = STATE_ALIASES[text(next.directionState).trim().toLowerCase()] || next.directionState;
  next.evidence = (Array.isArray(next.evidence) ? next.evidence : []).map((item) => ({
    ...item,
    kind: KIND_ALIASES[text(item?.kind).trim().toLowerCase()] || item?.kind,
    role: ROLE_ALIASES[text(item?.role).trim().toLowerCase()] || item?.role || 'proof'
  }));
  next.facts = (Array.isArray(next.facts) ? next.facts : []).map((item) => ({
    ...item,
    confidence: CONFIDENCE_ALIASES[text(item?.confidence).trim().toLowerCase()] || item?.confidence
  }));
  next.assets = (Array.isArray(next.assets) ? next.assets : []).map((item) => ({
    ...item,
    type: normalizeAssetType(item?.type) || item?.type,
    value: text(item?.value).trim(),
    meta: text(item?.meta).trim()
  }));
  next.findings = (Array.isArray(next.findings) ? next.findings : []).map((item) => {
    const claim = text(item?.claim || item?.title).trim();
    return {
      ...item,
      description: text(item?.description).trim() || claim,
      riskAnalysis: text(item?.riskAnalysis).trim() || '风险分析待补充。',
      remediation: text(item?.remediation).trim() || '修复建议待补充。',
      steps: Array.isArray(item?.steps) && item.steps.length > 0 ? item.steps : ['（待补充原始 HTTP 复现请求）'],
      stepNotes: Array.isArray(item?.stepNotes) ? item.stepNotes : [],
      severity: SEVERITY_ALIASES[text(item?.severity).trim().toLowerCase()] || item?.severity,
      impactProven: IMPACT_ALIASES[text(item?.impactProven).trim().toLowerCase()] || item?.impactProven
    };
  });
  next.coverage = (Array.isArray(next.coverage) ? next.coverage : []).map((item) => ({
    ...item,
    result: RESULT_ALIASES[text(item?.result).trim().toLowerCase()] || item?.result,
    axis: normalizeCoverageAxis(item?.axis, item?.note)
  }));
  return next;
}

/**
 * Workers sometimes record a confirmed issue only in coverage.result=issue_found
 * and leave findings empty. That silently produces a clean report even after an
 * RCE was proven. Promote the strongest coverage issue into a finding so the
 * finding is visible immediately; the lead can still enrich/revalidate it.
 */
export function promoteCoverageFindings(payload, direction = null) {
  if (!payload || !Array.isArray(payload.coverage)) return payload;
  if (direction && direction.stage === 'verify') return payload;
  if (Array.isArray(payload.findings) && payload.findings.length > 0) return payload;
  const issues = payload.coverage
    .filter((item) => item?.result === 'issue_found'
      && text(item.note).trim()
      && Array.isArray(item.evidenceKeys)
      && item.evidenceKeys.length > 0)
    .sort((a, b) => coverageIssueScore(b.note) - coverageIssueScore(a.note));
  if (issues.length === 0) return payload;
  const issue = issues[0];
  const note = text(issue.note).trim();
  const evidenceKeys = issue.evidenceKeys.map((key) => text(key)).filter(Boolean);
  const paths = (Array.isArray(payload.evidence) ? payload.evidence : [])
    .filter((item) => evidenceKeys.includes(text(item?.key)))
    .map((item) => text(item.path))
    .filter(Boolean);
  const critical = /(RCE|远程代码执行|命令执行|command execution|root shell|uid=0|OS command)/i.test(note);
  const high = critical || /(默认口令|管理员|认证绕过|authentication bypass|未授权.*(读取|访问|执行)|admin.*token)/i.test(note);
  payload.findings = [{
    claim: note,
    title: shortLabel(note, 100),
    description: note,
    riskAnalysis: critical
      ? '已确认可执行系统命令并获得服务端权限，影响为服务器/容器完全失陷。'
      : high
        ? '已确认可绕过认证或取得管理员能力，可能导致敏感数据泄露与进一步命令执行。'
        : 'worker 已标记该问题成立，需要按实际影响进一步定级。',
    remediation: '按对应接口的鉴权、输入校验与最小权限原则修复；补充原始 HTTP 复现请求并做独立验证。',
    steps: paths.length > 0 ? paths.map((item) => `证据文件：${item}`) : [`evidence: ${evidenceKeys.join(', ')}`],
    stepNotes: [],
    apiSources: [],
    severity: critical ? 'critical' : high ? 'high' : 'medium',
    impactProven: critical ? 'rce' : high ? 'write' : 'read',
    evidenceKeys
  }];
  return payload;
}

function coverageIssueScore(value) {
  const note = text(value);
  if (/(RCE|远程代码执行|命令执行|command execution|root shell|uid=0|OS command)/i.test(note)) return 100;
  if (/(默认口令|管理员|认证绕过|authentication bypass|未授权.*(读取|访问|执行)|admin.*token)/i.test(note)) return 50;
  return 10;
}

export function buildWorkerPrompt({ direction, target, workdir, maxEvidenceBytes = 2 * 1024 * 1024, authorization = '', maxDurationMs = 0, taskId = '', state = null }) {
  const verify = direction.stage === 'verify';
  const minutes = Math.round(Number(maxDurationMs) > 0 ? Number(maxDurationMs) / 60000 : 0);
  const checkpoint = taskId
    ? `${workdir || '.'}/evidence/worker-checkpoint-${taskId}.json`
    : '';
  const situational = buildSituationalPack(state, direction);
  return [
    '你是授权渗透测试的 worker。只回答一个问题，不写图谱、不 spawn 子代理、不调用 send_message。',
    '',
    `方向问题：${direction.question}`,
    `完成条件：${direction.doneWhen}`,
    `目标：${target || '(unknown)'}`,
    `工作目录：${workdir || '(unknown)'}`,
    taskId ? `任务：${taskId}` : '',
    authorization ? `授权基线：${String(authorization).slice(0, 1800)}` : '',
    situational,
    `用户/Lead 已确认的授权范围内直接做最小必要验证；不要自行追加“未提供工单/加白/测试账号/书面凭证”等停止门槛。${RED_LINE}`,
    '优先验证 RCE、认证绕过、未授权访问、上传、注入、SSRF、模板/反序列化等可复现的攻击假设；不要做报告整理、证据索引、交付收口或宽泛资产清点。',
    minutes > 0 ? `时间预算：${minutes} 分钟。到 80% 时必须停止扩展，先把已确认的 findings/evidence/facts 收口返回；不要整理报告。` : '不要长时间只做侦察或报告整理；拿到可复现结论就立即收口。',
    checkpoint ? `每发现一条 finding 或关键结论，立即把完整最终 JSON（conclusion/directionState/evidence/facts/findings）写到 ${checkpoint}；即使超时也会从这个文件抢救，不要等到最后才写。` : '',
    '',
    '证据规则：',
    `- 每个结论都要有证据文件，放在 workdir/evidence/ 下，单个不超过 ${maxEvidenceBytes} 字节；`,
    '- 证据文件内容必须是原始请求/响应或可复现的命令输出；',
    '- 返回相对路径 + sha256；没有证据的 finding 会被拒绝。',
    '- 复现步骤 steps 每一步必须写「做什么的一句话说明 + 完整请求包 + 实际响应原文」（响应至少含状态行、关键响应头、响应体摘要），不要只写请求包或「预期 …」；stepNotes 写这一步实际观察到了什么，不要写预期。',
    '- 只做回答本问题所需的最小探测；不要扩展到无关端点；doneWhen 满足就立即收口并交结论。',
    '- 开始新探测前先调用 pentest_traffic_search（body_contains 搜密钥/报错/内网 IP/隐藏接口，或 host/url_contains/status 过滤），复用历史响应；不要重复 curl 已记录过的相同 URL。捕获到新的 request/response 后调用 pentest_traffic_record 落盘，供后续 worker 检索。',
    '- 发现可复现的漏洞（尤其是 RCE、认证绕过、默认口令、未授权访问）时，必须在 findings 中立即提交完整 finding；不能只写进 facts、coverage.note 或 conclusion。',
    '- 如果 coverage.result=issue_found，findings 必须至少有一条对应记录；只写 issue_found 而不交 finding 视为未完成。',
    '- 发现的资产必须写入 assets（type/value，必要时 meta）：root-domain、subdomain、ip、service、app、endpoint；接口用 endpoint + "METHOD /path"。目标本身的资产已由 flow_start 预置，不要重复。',
    `- 红线：${RED_LINE} 不要为了“验证”去执行删除/篡改原有数据的请求；其余动作直接做并写清证据。`,
    '- 本方向之外的高价值线索写进 nextDirections（question/doneWhen/axis/reason，最多 3 条），不要自己执行。',
    '',
    ...(verify ? ['本方向是验证方向：只产出 evidence 与 conclusion；禁止新增 finding，禁止重复父 finding 的结论。'] : []),
    '输出要求：严格按给定 JSON schema 返回；conclusion 必须直接回答上面的问题；',
    'directionState 只能取 done/exhausted/blocked/empty；',
    'findings[].evidenceKeys 必须引用 evidence[].key，且至少一条 role=proof。',
    '每个 finding 必须写全：description（漏洞描述）、steps（可复现测试过程，每步含最小 HTTP 请求）、stepNotes（与 steps 等长）、riskAnalysis（风险分析）、remediation（修复建议）；缺任何一项的报告不合格。',
    'steps 不要写落盘、统计、清理、证据路径等内部操作；只写客户可复现的请求与预期响应。',
    '不要把"验证某事实"当成结论；结论要回答"这个问题现在有答案了吗"。'
  ].join('\n');
}

export function validateWorkerPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('worker result is not an object');
  const conclusion = text(payload.conclusion).trim();
  if (!conclusion) throw new Error('worker result has no conclusion');
  const directionState = text(payload.directionState);
  if (!DIRECTION_RESULT_STATES.includes(directionState)) throw new Error(`invalid directionState: ${directionState}`);
  if (!Array.isArray(payload.evidence)) throw new Error('worker result has no evidence array');
  const keys = new Set();
  for (const item of payload.evidence) {
    const key = text(item?.key).trim();
    if (!key) throw new Error('evidence item has no key');
    if (keys.has(key)) throw new Error(`duplicate evidence key: ${key}`);
    keys.add(key);
    if (!text(item.path).trim()) throw new Error(`evidence ${key} has no path`);
  }
  for (const finding of (Array.isArray(payload.findings) ? payload.findings : [])) {
    const refs = Array.isArray(finding.evidenceKeys) ? finding.evidenceKeys : [];
    if (refs.length === 0) throw new Error('finding has no evidenceKeys');
    for (const ref of refs) if (!keys.has(text(ref))) throw new Error(`finding references unknown evidence key: ${ref}`);
    if (!text(finding.description).trim()) throw new Error('finding.description is required for a reportable finding');
    if (!Array.isArray(finding.steps) || finding.steps.length === 0) throw new Error('finding.steps is required: provide replayable HTTP steps');
    if (!text(finding.riskAnalysis).trim()) throw new Error('finding.riskAnalysis is required');
    if (!text(finding.remediation).trim()) throw new Error('finding.remediation is required');
  }
  for (const asset of (Array.isArray(payload.assets) ? payload.assets : [])) {
    if (!normalizeAssetType(asset?.type)) throw new Error(`unknown asset type: ${asset?.type || '(empty)'}`);
    if (!text(asset?.value).trim()) throw new Error('asset.value is required');
  }
  return payload;
}

export class V4Dispatcher {
  constructor({
    session,
    subagents,
    agent,
    cwd,
    provider = 'spawn',
    maxWorkers = 6,
    maxDurationMs = 0,
    onCommit = null,
    onEvidence = null,
    promptBuilder = null,
    retireOnSettle = false,
    now = () => Date.now(),
    fsImpl = fs
  }) {
    if (!session) throw new Error('V4Dispatcher requires a session');
    if (!subagents) throw new Error('V4Dispatcher requires the subagents service');
    if (!agent) throw new Error('V4Dispatcher requires the lead agent');
    if (!cwd) throw new Error('V4Dispatcher requires a workdir');
    this.session = session;
    this.subagents = subagents;
    this.agent = agent;
    this.cwd = cwd;
    this.provider = provider;
    this.maxWorkers = maxWorkers;
    this.maxDurationMs = Number(maxDurationMs) > 0
      ? Math.min(Math.max(Number(maxDurationMs), 60 * 1000), 30 * 60 * 1000)
      : 0;
    this.onCommit = typeof onCommit === 'function' ? onCommit : null;
    this.onEvidence = typeof onEvidence === 'function' ? onEvidence : null;
    // Optional additive hooks for the STCS coordinator. Defaults preserve the
    // original pentest-preset behavior exactly.
    this.promptBuilder = typeof promptBuilder === 'function' ? promptBuilder : buildWorkerPrompt;
    this.retireOnSettle = retireOnSettle === true;
    this.now = now;
    this.fs = fsImpl;
  }

  async assign(directionId, options = {}) {
    const state = await this.session.read();
    if (state.goal?.phase !== 'active') throw new Error(`goal is ${state.goal?.phase}; cannot dispatch`);
    const direction = (state.directions || []).find((item) => item.id === directionId);
    if (!direction) throw new Error(`unknown direction ${directionId}`);
    if (!['open', 'running'].includes(direction.state)) throw new Error(`direction is ${direction.state}`);
    const goal = state.goal || {};
    const scope = { targets: goal.targets || [], excludedTargets: goal.excludedTargets || [], target: goal.target };
    if (!Array.isArray(scope.targets) || scope.targets.length === 0) {
      throw new Error('v4 goal has no structured scope targets; call pentest_flow_start with targets');
    }
    const baseScope = checkNetworkTarget(scope, goal.target);
    if (!baseScope.allowed) throw new Error(`v4 scope invalid: ${baseScope.reason}`);
    for (const candidate of networkCandidatesFrom(direction.question)) {
      const checked = checkNetworkTarget(scope, candidate.value);
      if (!checked.allowed) throw new Error(`direction mentions out-of-scope host ${candidate.id}: ${checked.reason}`);
    }
    const active = (state.tasks || []).filter((task) => ['queued', 'running'].includes(task.state));
    if (active.length >= this.maxWorkers) throw new Error(`worker limit reached (${this.maxWorkers})`);
    if (active.some((task) => task.directionId === directionId)) throw new Error(`direction ${directionId} already has an active task`);

    const provider = options.provider || this.provider;
    try {
      const info = typeof this.subagents?.getProvider === 'function' ? this.subagents.getProvider(provider) : undefined;
      if (info?.capabilities && info.capabilities.outputSchema !== true) {
        throw new Error(`provider ${provider} does not support outputSchema; use spawn or fork`);
      }
    } catch (error) {
      if (/does not support outputSchema/.test(error?.message || '')) throw error;
    }
    let next = await this.session.run({
      type: 'task', op: 'assign', directionId,
      provider, workerLabel: options.workerLabel || '', budget: options.budget || {}, now: this.now()
    });
    const task = next.tasks[next.tasks.length - 1];
    const label = `${task.id} · ${shortLabel(direction.question)}`;
    const controller = new AbortController();
    let activation;
    try {
      const request = {
        cwd: this.cwd,
        prompt: [{ type: 'text', text: this.promptBuilder({
          direction,
          target: state.goal?.target,
          workdir: this.cwd,
          authorization: state.goal?.authorization || '',
          maxDurationMs: this.maxDurationMs,
          taskId: task.id,
          state
        }) }],
        parent: this.agent,
        signal: controller.signal,
        outputSchema: WORKER_SCHEMA,
        ...(options.agentPreset ? { agentPreset: options.agentPreset } : {})
      };
      activation = await this.subagents.startActivation({
        ...request,
        provider,
        label,
        delivery: 'caller',
        signal: controller.signal,
        request
      });
    } catch (error) {
      await this.session.run({ type: 'worker', op: 'fail', taskId: task.id, error: error?.message || String(error), now: this.now() });
      throw error;
    }
    next = await this.session.run({ type: 'task', op: 'start', id: task.id, childId: activation.childId, now: this.now() });
    let settled = false;
    let timer = null;
    if (this.maxDurationMs > 0) {
      timer = setTimeout(async () => {
        if (settled) return;
        const checkpoint = this.readCheckpoint(task.id);
        settled = true;
        controller.abort();
        if (checkpoint) {
          try {
            const committed = await this.commitResult(task.id, { stopReason: 'completed', structured: checkpoint });
            if (committed) return;
          } catch { /* fall through to the normal timeout failure */ }
        }
        try {
          await this.session.run({
            type: 'worker', op: 'fail', taskId: task.id,
            error: `worker exceeded ${Math.round(this.maxDurationMs / 60000)} min budget`,
            now: this.now()
          });
        } catch {}
      }, this.maxDurationMs);
      timer.unref?.();
    }
    Promise.resolve(activation.result)
      .then((result) => {
        if (settled) return;
        settled = true;
        return this.commitResult(task.id, result);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        return this.failTask(task.id, error);
      })
      .finally(() => {
        clearTimeout(timer);
        if (this.retireOnSettle && activation && typeof activation.dispose === 'function') {
          try { void activation.dispose(); } catch { /* best effort */ }
        }
      });
    return { taskId: task.id, childId: activation.childId, directionId };
  }

  async commitResult(taskId, result) {
    try {
      if (!result || result.stopReason !== 'completed') {
        throw new Error(`worker stopped: ${result?.stopReason || 'unknown'}${result?.diagnostic ? ` (${result.diagnostic})` : ''}`);
      }
      const current = await this.session.read();
      const currentTask = (current.tasks || []).find((item) => item.id === taskId);
      const currentDirection = (current.directions || []).find((item) => item.id === currentTask?.directionId);
      const payload = validateWorkerPayload(promoteCoverageFindings(normalizeWorkerPayload(result.structured), currentDirection));
      const findingHostName = findingHost(current.goal?.target || currentDirection?.question);
      payload.findings = dedupeFindingPayload(payload.findings, current.findings, findingHostName);
      const prepared = await this.prepareEvidence(payload.evidence);
      // P0-4: index captured request/response bodies for cross-worker search.
      // Indexing is best-effort and must never fail a committed worker result.
      if (this.onEvidence) {
        try {
          await this.onEvidence(prepared.map((row) => ({
            body: row.__body, role: row.role, kind: row.kind,
            path: row.path, summary: row.summary, sha256: row.sha256
          })), {
            taskId,
            directionId: currentDirection?.id || null,
            findingIds: (payload.findings || []).map((f) => text(f.id)).filter(Boolean)
          });
        } catch { /* best effort */ }
      }
      const evidence = prepared.map(({ __body, ...row }) => row);
      const committed = await this.session.run({
        type: 'worker', op: 'commit', taskId,
        conclusion: payload.conclusion,
        directionState: payload.directionState,
        evidence,
        facts: payload.facts || [],
        assets: payload.assets || [],
        findings: payload.findings || [],
        coverage: payload.coverage || [],
        nextQuestions: payload.nextQuestions || [],
        nextDirections: payload.nextDirections || [],
        now: this.now()
      });
      if (this.onCommit) {
        try {
          const committedTask = (committed.tasks || []).find((item) => item.id === taskId);
          await this.onCommit({
            taskId,
            directionId: currentDirection?.id || null,
            findingIds: committedTask?.result?.findingIds || [],
            state: committed
          });
        } catch { /* role orchestration must not turn a committed task into failed */ }
      }
      return true;
    } catch (error) {
      await this.failTask(taskId, error);
      return false;
    }
  }

  readCheckpoint(taskId) {
    try {
      const file = path.join(this.cwd, 'evidence', `worker-checkpoint-${taskId}.json`);
      if (!this.fs.existsSync(file)) return null;
      const payload = JSON.parse(this.fs.readFileSync(file, 'utf8'));
      return payload && typeof payload === 'object' ? payload : null;
    } catch {
      return null;
    }
  }

  async prepareEvidence(items) {
    const root = path.resolve(this.cwd);
    const out = [];
    for (const item of (Array.isArray(items) ? items : [])) {
      const resolved = path.resolve(root, text(item.path));
      if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        throw new Error(`evidence path escapes workdir: ${item.path}`);
      }
      if (!this.fs.existsSync(resolved)) throw new Error(`evidence file missing: ${item.path}`);
      let bytes = this.fs.readFileSync(resolved);
      let sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      const declared = text(item.sha256).trim().toLowerCase();
      // A worker may still be flushing a large evidence file when the commit
      // starts. Re-read once after a short yield before declaring corruption;
      // task-5's file matched its declared hash after the failed commit.
      if (declared && declared !== sha256) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        bytes = this.fs.readFileSync(resolved);
        sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      }
      if (declared && declared !== sha256) throw new Error(`evidence hash mismatch: ${item.path}`);
      out.push({
        key: text(item.key),
        kind: text(item.kind),
        role: text(item.role),
        path: path.relative(root, resolved).split(path.sep).join('/'),
        sha256,
        summary: text(item.summary) || text(item.path),
        // Transient: consumed by onEvidence indexing, stripped before the
        // worker commit so it never enters canonical v4 state.
        __body: bytes.toString('utf8', 0, Math.min(bytes.length, 64 * 1024))
      });
    }
    return out;
  }

  async failTask(taskId, error) {
    try {
      // P0-6: persist a bounded checkpoint so a transient failure can resume
      // with its trace/evidence instead of losing all context.
      const state = await this.session.read();
      const task = (state.tasks || []).find((item) => item.id === taskId);
      const direction = (state.directions || []).find((item) => item.id === task?.directionId);
      const checkpoint = task
        ? buildCheckpoint({ task, direction, state, error: error?.message || String(error), now: this.now() })
        : null;
      await this.session.run({
        type: 'worker', op: 'fail', taskId,
        error: error?.message || String(error), now: this.now(),
        ...(checkpoint ? { checkpoint } : {})
      });
    } catch { /* task may already be terminal */ }
  }

  /** P0-6: read-only resume candidates for the planner/sidecar. */
  async readResumeCandidates(options = {}) {
    const state = await this.session.read();
    return selectResumeCandidates(state, options);
  }

  async cancel(taskId) {
    const state = await this.session.read();
    const task = (state.tasks || []).find((item) => item.id === taskId);
    if (!task) throw new Error(`unknown task ${taskId}`);
    // Commit the cancellation before interrupting the child. Otherwise the
    // aborted activation can race in with `worker stopped: aborted` and turn
    // a deliberate pause into a failed task.
    await this.session.run({ type: 'task', op: 'cancel', id: taskId, reason: 'cancelled by lead', now: this.now() });
    if (task.childId && this.subagents && typeof this.subagents.interrupt === 'function') {
      try {
        await this.subagents.interrupt(task.childId, { kind: 'ancestor', agent: this.agent });
      } catch { /* best effort */ }
    }
    return true;
  }

  async reconcile() {
    const state = await this.session.read();
    const running = (state.tasks || []).filter((task) => task.state === 'running' && task.childId);
    if (running.length === 0) return { checked: 0, unknown: [] };
    let children = [];
    try {
      children = await this.subagents.listChildren(this.agent.id);
    } catch {
      return { checked: running.length, unknown: [], error: 'listChildren unavailable' };
    }
    const ids = new Set((children || []).map((child) => child.id));
    const unknown = [];
    for (const task of running) {
      if (!ids.has(task.childId)) {
        await this.session.run({ type: 'task', op: 'unknown', id: task.id, reason: 'child missing after restart', now: this.now() });
        unknown.push(task.id);
      }
    }
    return { checked: running.length, unknown };
  }
}



