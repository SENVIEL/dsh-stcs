/**
 * Named role subagents for v4.
 *
 * These are not workers and not agentTeams teammates: each role runs once via
 * ctx.subagents.startActivation with its own preset, prompt, output schema and
 * maxDepth=1. The Lead remains the only writer of canonical v4 state.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { assertSeverityConsistency, SEVERITY_RUBRIC } from './severity.js';
import { RED_LINE } from './policy.js';

export const ROLE_NAMES = ['planner', 'validator', 'reporter', 'reviewer', 'librarian', 'critic', 'auditor'];
export const CORE_ROLE_NAMES = ['auditor', 'reporter'];
export const ROLE_PRESETS = {
  // The planner is a visible teammate spawned by the STCS Coordinator; the
  // hidden RoleRunner path (pentest_flow_role) is not used for it.
  planner: 'artex',
  validator: 'pentest-validator',
  reporter: 'pentest-reporter',
  reviewer: 'pentest-reviewer',
  librarian: 'pentest-librarian',
  critic: 'pentest-critic',
  // The auditor uses the existing validator preset: the output schema and
  // role instructions below add severity, dedupe and safety responsibility.
  auditor: 'pentest-validator'
};

const ROLE_LABELS = {
  planner: '规划员',
  validator: '验证员',
  reporter: '报告员',
  reviewer: '审查员',
  librarian: '资料员',
  critic: '评审员',
  auditor: '漏洞审核员'
};

function shortLabel(value, max = 72) {
  const textValue = text(value).replace(/\s+/g, ' ').trim();
  return textValue.length > max ? `${textValue.slice(0, max - 1)}…` : textValue;
}

function roleDescription(role, payload, target) {
  const label = ROLE_LABELS[role] || role;
  const focus = text(payload?.findingId)
    ? `复现 ${text(payload.findingId)}`
    : text(payload?.directionId)
      ? `方向 ${text(payload.directionId)}`
      : role === 'reporter' ? '生成报告' : role === 'reviewer' ? '交付前审查' : '执行角色任务';
  return `${label} · ${shortLabel(focus)} · ${shortLabel(target || '当前目标', 60)}`;
}

const ROLE_INSTRUCTIONS = {
  planner: [
    'You are the planner for an authorized penetration test. You decide WHAT to test next; workers execute and the Host Coordinator is the only state writer.',
    'Read the digest: goal, target map (apps/endpoints/params/authFlows), hypothesis tree, recent facts, coverage gaps, recent decisions and active tasks.',
    'Produce 0 to 4 NEW directions, highest value first. Every direction must name a concrete endpoint/parameter or a concrete surface, and doneWhen must state a pass/fail condition that a worker can check with one reproducible request.',
    'If digest.mustGenerate is true, you MUST return at least one direction. Returning 0 directions while the goal is unmet and there is no open/running direction is task stall, not a valid planning result.',
    'digest.candidates are deterministic candidate proposals. Accept only the ones worth executing by putting their exact IDs in acceptedCandidates (0 to 4). Never accept a red-line candidate; never accept a candidate that duplicates a direction you already proposed.',
    'When the goal is truly met, set goalMet {goalId, evidenceId, reason}. evidenceId must be an existing finding or fact from digest; do not create a “proof” direction for it.',
    'Keep a persistent todos plan in the result (content + status). Use killIntentIds to terminate a running intent that is provably a dead end, and steers [{intentId,message}] to correct a worker mid-run.',
    'Never repeat an existing direction: compare by question text AND by target + axis. Do not produce two directions that differ only by a URL trailing slash, path casing, or wording.',
    'Do not repeat any question already present in digest.directions; if the board already covers the hypothesis, return directions: [].',
    'Keep the whole JSON result under 8 KB; the digest is already capped.',
    'Prefer chaining from new facts: token/cookie -> authorization read; upload/write endpoint -> write path; confirmed read impact -> privilege escalation; exposed version -> version-bound CVE verification.',
    'If the goal is already proven or the board is saturated, return an empty directions array and explain in notes.',
    'Do not run exploitation yourself: do not call pwsh/bash/browser/web_fetch/web_search, do not open other sessions\' workdirs, and do not send_message to the Lead. Only write the JSON result file. If a worker/planner note claims a proof, put the exact claim and request/response reference in notes; the Coordinator will create a verification direction.',
    'Evidence provenance: only cite artifacts created by THIS session after digest.provenance.goalCreatedAt. Target-side cron ids, logs or files older than the goal are out of scope and must never be attributed to this session.',
    'Do not run exploitation yourself, do not call any pentest_flow_* tool, and do not modify v4 state. Only write the JSON result file.'
  ].join('\n'),
  validator: [
    'You are an independent penetration-test validator, not the worker that produced the finding.',
    'Validate only the supplied finding. Do not trust the worker conclusion.',
    'Reproduce it yourself and create at least one NEW evidence file under the workdir. Do not reuse only the finding\'s existing evidence.',
    'Do not modify v4 state, do not call pentest_flow_* write tools, do not delegate, do not brute force, do not expand scope.',
    'Return inconclusive when you cannot reproduce it safely.'
  ].join('\n'),
  auditor: [
    'You are the single vulnerability auditor for an authorized penetration test.',
    'Own the finding from intake to approval: judge fact versus finding, reject junk/unsupported items, detect duplicates, reproduce independently, assess real impact and severity, and check that the proposed verification cannot crash or damage the target.',
    'Do not trust the worker conclusion and do not reuse only the finding\'s existing evidence. Reproduce it yourself and create at least one NEW evidence file under the workdir.',
    'A finding may be approved only when it is independently reproduced, evidence-backed, in scope, non-duplicate and safe. Use inconclusive when reproduction or impact cannot be established. A theoretical issue without a working reproduction is not a finding.',
    'A route-level 200 is NOT proof of a write. For PUT/POST init/update endpoints, check the response body code, a subsequent GET of the same object, and the pre-fix source branch. In QingLong 2.20.1, password=admin is rejected before persistence; never turn that into a critical credential-reset finding.',
    'Timebox each audit to about two minutes. If reproduction cannot be completed safely in that window, return inconclusive with the exact blocker; do not run long workflows or wait on unrelated tasks.',
    `Red-line policy (the ONLY user red line): ${RED_LINE} Only when independent reproduction itself would have to call an interface that deletes or tampers with EXISTING production data, return decision=needs_review and safetyDecision=requires_user_approval. Everything else — reading, obtaining tokens, probing upload surfaces, command echo, read-only reproduction — is in scope; reproduce it normally. Do NOT flag DoS/persistence/restart/overwrite/crash or prose keywords as red lines; do NOT ask for approval for those.`,
    'Severity policy (mandatory, do not inflate):',
    `critical = ${SEVERITY_RUBRIC.critical}`,
    `high = ${SEVERITY_RUBRIC.high}`,
    `medium = ${SEVERITY_RUBRIC.medium}`,
    `low = ${SEVERITY_RUBRIC.low}`,
    'If impactProven=rce the severity must be critical. If impactProven=info the severity cannot be high/critical. If no impact is proven, do not approve.',
    'Dedupe is semantic vulnerability-level identity, not endpoint/evidence-level and not exact wording: name the final vulnerabilityType (e.g. rce, default_credentials, auth_bypass, file_upload) and the rootCause (vulnerable component + mechanism, e.g. DataEase previewSql derived-table SQL injection into H2 CREATE ALIAS).',
    'dedupeKey = vulnerabilityType:rootCause. Never put endpoint, host, port, parameter, evidence path or request path in dedupeKey.',
    'If two findings describe the SAME vulnerability in different words, or reach it through different interfaces, endpoints, hosts, ports or evidence, they are duplicates. Merge all affected assets into the existing finding; do not create a second finding.',
    'If the rootCause is genuinely different (different vulnerable component/mechanism), it is not a duplicate even when the final category or endpoint is the same.',
    'Do not modify v4 state, do not call pentest_flow_* write tools, do not delegate, do not brute force, and do not expand scope.',
    'Return one structured audit result. The Lead/orchestrator imports evidence and writes state.'
  ].join('\n'),
  reviewer: [
    'You are an independent pre-delivery reviewer.',
    'Read the supplied state/report snapshot and check revision consistency, evidence files/hashes, high-severity confirmations, direction conclusions, coverage gaps, duplicate/conflicting findings and severity inflation.',
    'Do not modify reports or v4 state. Return concrete problems with code, severity and detail.'
  ].join('\n'),
  reporter: [
    'You are the report writer for an authorized penetration-test engagement.',
    'Read the supplied payload or payloadPath and evidence files. Write a complete Markdown report to the exact reportPath supplied by the Lead.',
    'Every confirmed finding MUST contain these four sections: 漏洞描述, 测试过程（可复现 HTTP 步骤）, 风险分析, 修复建议. Do not collapse them into one paragraph.',
    'Also include an executive summary, scope and authorization, unverified observations, coverage gaps and an evidence index.',
    'The report must separate confirmed findings from unverified observations, cite evidence paths for every claim, and never invent a finding, impact or remediation.',
    'Write Markdown only. Do not generate DOCX; DOCX generation is a separate opt-in feature and is not part of the reporter role.',
    'Do not probe, scan, browse, call pentest_flow_* tools or modify v4 state. You may read files and write only reports/.'
  ].join('\n'),
  librarian: [
    'You are a scope and asset librarian.',
    'Classify only the supplied candidate assets as in_scope, out_of_scope or unknown. Do not probe, scan or browse anything.',
    'Return assets with value, scope and reason. The Lead decides what to import.'
  ].join('\n'),
  critic: [
    'You are a planning critic.',
    'Challenge the supplied directions and candidates for duplication, unbounded doneWhen, weak scope or missing coverage.',
    'Return candidate directions only; do not create or modify v4 state.'
  ].join('\n')
};

export const ROLE_SCHEMAS = {
  planner: {
    type: 'object',
    additionalProperties: false,
    required: ['directions', 'notes'],
    properties: {
      directions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'doneWhen', 'axis', 'priority', 'reason'],
          properties: {
            question: { type: 'string' },
            doneWhen: { type: 'string' },
            axis: { type: 'array', items: { type: 'string' } },
            priority: { type: 'number' },
            reason: { type: 'string' },
            endpoint: { type: 'string' },
            assetIds: { type: 'array', items: { type: 'string' } },
            parentIds: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      goalMet: {
        type: 'object',
        additionalProperties: false,
        required: ['goalId', 'evidenceId', 'reason'],
        properties: {
          goalId: { type: 'string' },
          evidenceId: { type: 'string' },
          reason: { type: 'string' }
        }
      },
      todos: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['content', 'status'],
          properties: {
            content: { type: 'string' },
            status: { type: 'string' }
          }
        }
      },
      killIntentIds: { type: 'array', items: { type: 'string' } },
      steers: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['intentId', 'message'],
          properties: {
            intentId: { type: 'string' },
            message: { type: 'string' }
          }
        }
      },
      notes: { type: 'string' },
      acceptedCandidates: { type: 'array', items: { type: 'string' } },
      stopReason: { type: 'string' }
    }
  },
  validator: {
    type: 'object',
    additionalProperties: false,
    required: ['findingId', 'verdict', 'evidence', 'notes'],
    properties: {
      findingId: { type: 'string' },
      verdict: { type: 'string', enum: ['reproduced', 'not_reproduced', 'inconclusive'] },
      evidence: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['kind', 'path', 'sha256', 'summary'],
          properties: {
            kind: { type: 'string', enum: ['request', 'response', 'file', 'log', 'screenshot'] },
            path: { type: 'string' },
            sha256: { type: 'string' },
            summary: { type: 'string' }
          }
        }
      },
      notes: { type: 'string' },
      scopeObserved: { type: 'array', items: { type: 'string' } }
    }
  },
  auditor: {
    type: 'object',
    additionalProperties: false,
    required: ['findingId', 'verdict', 'decision', 'severity', 'severityRationale', 'impactProven', 'vulnType', 'rootCause', 'dedupeKey', 'evidence', 'safetyDecision', 'notes'],
    properties: {
      findingId: { type: 'string' },
      verdict: { type: 'string', enum: ['reproduced', 'not_reproduced', 'inconclusive'] },
      decision: { type: 'string', enum: ['approved', 'rejected', 'duplicate', 'inconclusive', 'needs_review'] },
      severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      severityRationale: { type: 'string' },
      impactProven: { type: 'string', enum: ['none', 'info', 'read', 'write', 'rce'] },
      vulnType: { type: 'string' },
      rootCause: { type: 'string' },
      exploitTechnique: { type: 'string' },
      dedupeKey: { type: 'string' },
      affectedAssets: { type: 'array', items: { type: 'string' } },
      duplicateOf: { type: 'string' },
      safetyDecision: { type: 'string', enum: ['allow', 'allow_readonly', 'deny', 'requires_user_approval'] },
      proposedAction: { type: 'string' },
      reason: { type: 'string' },
      evidence: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['kind', 'path', 'sha256', 'summary'],
          properties: {
            kind: { type: 'string', enum: ['request', 'response', 'file', 'log', 'screenshot'] },
            path: { type: 'string' },
            sha256: { type: 'string' },
            summary: { type: 'string' }
          }
        }
      },
      notes: { type: 'string' }
    }
  },
  reporter: {
    type: 'object',
    additionalProperties: false,
    required: ['ok', 'reportPath', 'sections', 'gaps', 'notes'],
    properties: {
      ok: { type: 'boolean' },
      reportPath: { type: 'string' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'summary'],
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' }
          }
        }
      },
      gaps: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['code', 'severity', 'detail'],
          properties: {
            code: { type: 'string' },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
            detail: { type: 'string' }
          }
        }
      },
      notes: { type: 'string' }
    }
  },
  reviewer: {
    type: 'object',
    additionalProperties: false,
    required: ['ok', 'checkedRevision', 'problems'],
    properties: {
      ok: { type: 'boolean' },
      checkedRevision: { type: 'number' },
      problems: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['code', 'severity', 'detail'],
          properties: {
            code: { type: 'string' },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
            detail: { type: 'string' }
          }
        }
      },
      notes: { type: 'string' }
    }
  },
  librarian: {
    type: 'object',
    additionalProperties: false,
    required: ['assets', 'notes'],
    properties: {
      assets: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'value', 'scope', 'reason'],
          properties: {
            type: { type: 'string', enum: ['host', 'url', 'api', 'account'] },
            value: { type: 'string' },
            scope: { type: 'string', enum: ['in_scope', 'out_of_scope', 'unknown'] },
            reason: { type: 'string' }
          }
        }
      },
      notes: { type: 'string' }
    }
  },
  critic: {
    type: 'object',
    additionalProperties: false,
    required: ['repeats', 'tooBroad', 'candidates'],
    properties: {
      repeats: { type: 'array', items: { type: 'string' } },
      tooBroad: { type: 'array', items: { type: 'string' } },
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['axis', 'question', 'doneWhen', 'reason'],
          properties: {
            axis: { type: 'array', items: { type: 'string' } },
            question: { type: 'string' },
            doneWhen: { type: 'string' },
            reason: { type: 'string' }
          }
        }
      }
    }
  }
};

const ROLE_REQUIRED = {
  planner: ['directions', 'notes'],
  auditor: ['findingId', 'verdict', 'decision', 'severity', 'severityRationale', 'impactProven', 'vulnType', 'rootCause', 'dedupeKey', 'evidence', 'safetyDecision', 'notes'],
  validator: ['findingId', 'verdict', 'evidence', 'notes'],
  reporter: ['ok', 'reportPath', 'sections', 'gaps', 'notes'],
  reviewer: ['ok', 'checkedRevision', 'problems'],
  librarian: ['assets', 'notes'],
  critic: ['repeats', 'tooBroad', 'candidates']
};

function text(value) {
  return value == null ? '' : String(value);
}

/**
 * Auditor severity consistency is a hard policy, but a model can legitimately
 * describe a high-impact hypothesis while proving only information/no impact.
 * Normalize impossible combinations conservatively instead of crashing the
 * entire audit run. The original decision is retained in notes and metadata so
 * the validation row remains auditable.
 */
export function normalizeAuditorOutput(structured) {
  if (!structured || typeof structured !== 'object' || Array.isArray(structured)) return structured;
  const out = { ...structured };
  const impact = out.impactProven;
  const originalSeverity = out.severity;
  let severity = out.severity;
  let reason = '';
  let downgrade = false;

  if (impact === 'rce' && severity !== 'critical') {
    severity = 'critical';
    reason = 'proven RCE must be critical';
  } else if (impact === 'none' && severity !== 'low') {
    severity = 'low';
    reason = 'no proven impact must be low';
    downgrade = true;
  } else if (impact === 'info' && ['high', 'critical'].includes(severity)) {
    severity = 'low';
    reason = 'information-only impact cannot be high/critical';
    downgrade = true;
  }

  if (!reason) return out;

  out.severity = severity;
  // An approval cannot survive a severity downgrade. Keep duplicate/rejected
  // decisions as-is; turn a reproduced/approved claim into an inconclusive
  // observation that requires more evidence. An RCE upgrade is not a
  // downgrade and must not erase a valid approval.
  if (downgrade && (out.decision === 'approved' || (out.verdict === 'reproduced' && out.decision !== 'rejected' && out.decision !== 'duplicate'))) {
    out.decision = 'inconclusive';
    out.verdict = 'inconclusive';
  }
  out.auditorNormalization = {
    fromSeverity: originalSeverity,
    toSeverity: severity,
    reason
  };
  const suffix = `[auditor normalization] ${originalSeverity}/${impact} -> ${severity}/${out.decision}: ${reason}`;
  out.severityRationale = [text(out.severityRationale).trim(), suffix].filter(Boolean).join('\n');
  out.notes = [text(out.notes).trim(), suffix].filter(Boolean).join('\n');
  return out;
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function buildRolePrompt(role, payload, target, workdir) {
  return [
    ROLE_INSTRUCTIONS[role],
    '',
    `Target: ${text(target) || '(not supplied)'}`,
    `Workdir: ${workdir}`,
    'Payload:',
    JSON.stringify(payload == null ? {} : payload, null, 2),
    '',
    'Return only the structured object required by the output schema.'
  ].join('\n');
}

export function validateRoleOutput(role, structured) {
  if (!ROLE_NAMES.includes(role)) throw new Error(`unknown role: ${role}`);
  if (!structured || typeof structured !== 'object' || Array.isArray(structured)) {
    throw new Error(`${role} returned no structured object`);
  }
  for (const key of ROLE_REQUIRED[role]) {
    if (!(key in structured)) throw new Error(`${role} output is missing ${key}`);
  }
  if (role === 'auditor') structured = normalizeAuditorOutput(structured);
  if (role === 'validator' || role === 'auditor') {
    if (!['reproduced', 'not_reproduced', 'inconclusive'].includes(structured.verdict)) {
      throw new Error(`${role} returned invalid verdict: ${structured.verdict}`);
    }
    if (!Array.isArray(structured.evidence)) throw new Error(`${role} evidence must be an array`);
  }
  if (role === 'planner') {
    if (!Array.isArray(structured.directions)) throw new Error('planner directions must be an array');
    for (const item of structured.directions) {
      if (!item || typeof item !== 'object') throw new Error('planner direction must be an object');
      if (!String(item.question || '').trim()) throw new Error('planner direction.question is required');
      if (!String(item.doneWhen || '').trim()) throw new Error('planner direction.doneWhen is required');
    }
    if (structured.acceptedCandidates !== undefined) {
      if (!Array.isArray(structured.acceptedCandidates)) throw new Error('planner acceptedCandidates must be an array');
      for (const id of structured.acceptedCandidates) {
        if (!String(id || '').trim()) throw new Error('planner acceptedCandidates entries must be strings');
      }
    }
    if (structured.goalMet !== undefined) {
      if (!structured.goalMet || typeof structured.goalMet !== 'object') throw new Error('planner goalMet must be an object');
      for (const key of ['goalId', 'evidenceId', 'reason']) {
        if (!String(structured.goalMet[key] || '').trim()) throw new Error(`planner goalMet.${key} is required`);
      }
    }
    if (structured.todos !== undefined && !Array.isArray(structured.todos)) throw new Error('planner todos must be an array');
    if (structured.killIntentIds !== undefined && !Array.isArray(structured.killIntentIds)) throw new Error('planner killIntentIds must be an array');
    if (structured.steers !== undefined && !Array.isArray(structured.steers)) throw new Error('planner steers must be an array');
  }
  if (role === 'auditor') {
    if (!['approved', 'rejected', 'duplicate', 'inconclusive', 'needs_review'].includes(structured.decision)) {
      throw new Error(`auditor returned invalid decision: ${structured.decision}`);
    }
    if (!['critical', 'high', 'medium', 'low'].includes(structured.severity)) {
      throw new Error(`auditor returned invalid severity: ${structured.severity}`);
    }
    if (!['none', 'info', 'read', 'write', 'rce'].includes(structured.impactProven)) {
      throw new Error(`auditor returned invalid impactProven: ${structured.impactProven}`);
    }
    if (!['allow', 'allow_readonly', 'deny', 'requires_user_approval'].includes(structured.safetyDecision)) {
      throw new Error(`auditor returned invalid safetyDecision: ${structured.safetyDecision}`);
    }
    if (structured.decision === 'needs_review' && structured.safetyDecision !== 'requires_user_approval') {
      throw new Error('auditor needs_review requires requires_user_approval');
    }
    if (!String(structured.severityRationale || '').trim()) {
      throw new Error('auditor severityRationale is required');
    }
    if (!String(structured.vulnType || '').trim()) throw new Error('auditor vulnType is required');
    if (!String(structured.rootCause || '').trim()) throw new Error('auditor rootCause is required');
    if (!String(structured.dedupeKey || '').trim()) {
      throw new Error('auditor dedupeKey is required');
    }
    assertSeverityConsistency(structured.severity, structured.impactProven);
    if (structured.decision === 'duplicate' && !String(structured.duplicateOf || '').trim()) {
      throw new Error('auditor duplicate decision requires duplicateOf');
    }
    if (structured.decision === 'approved' && structured.verdict !== 'reproduced') {
      throw new Error('auditor cannot approve a finding that was not reproduced');
    }
    if (structured.decision === 'approved' && ['deny', 'requires_user_approval'].includes(structured.safetyDecision)) {
      throw new Error('auditor cannot approve a finding blocked by the safety gate');
    }
  }
  if (role === 'reporter' && (!Array.isArray(structured.sections) || !Array.isArray(structured.gaps) || typeof structured.ok !== 'boolean')) {
    throw new Error('reporter output is invalid');
  }
  if (role === 'reviewer' && (!Array.isArray(structured.problems) || typeof structured.ok !== 'boolean')) {
    throw new Error('reviewer output is invalid');
  }
  if (role === 'librarian' && !Array.isArray(structured.assets)) throw new Error('librarian assets must be an array');
  if (role === 'critic' && (!Array.isArray(structured.candidates) || !Array.isArray(structured.repeats) || !Array.isArray(structured.tooBroad))) {
    throw new Error('critic output is invalid');
  }
  return structured;
}

export class RoleRunner {
  constructor({ session, subagents, agent, cwd, provider = 'spawn', now = Date.now, fsImpl = fs }) {
    this.session = session;
    this.subagents = subagents;
    this.agent = agent;
    this.cwd = cwd;
    this.provider = provider;
    this.now = now;
    this.fs = fsImpl;
  }

  async run(role, payload = {}, options = {}) {
    if (!ROLE_NAMES.includes(role)) throw new Error(`unknown role: ${role}`);
    if (!this.subagents || typeof this.subagents.startActivation !== 'function') {
      throw new Error('role subagents are unavailable in this harness');
    }
    const state = await this.session.read();
    if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
    const preset = text(options.agentPreset) || ROLE_PRESETS[role];
    const timeoutMs = Math.min(Math.max(Number(options.timeoutMs) || 600000, 1000), 600000);
    const maxDepth = Math.min(Math.max(Number(options.maxDepth) || 1, 1), 3);
    const startedAt = this.now();
    const runId = `role-${role}-${startedAt}`;
    const controller = new AbortController();
    let activation = null;
    try {
      const request = {
        cwd: this.cwd,
        prompt: [{ type: 'text', text: buildRolePrompt(role, payload, state.goal?.target, this.cwd) }],
        parent: this.agent,
        signal: controller.signal,
        outputSchema: ROLE_SCHEMAS[role],
        maxDepth
      };
      // Role-specific presets are optional. A profile that only installs the
      // `pentest` preset rejects pentest-validator/reporter before the role
      // starts. Retry once without agentPreset so the host uses its default.
      if (text(options.agentPreset) || ROLE_PRESETS[role]) request.agentPreset = preset;
      try {
        activation = await this.subagents.startActivation({
          provider: this.provider,
          label: `pentest-${role}`,
          request,
          delivery: 'caller',
          signal: controller.signal
        });
      } catch (error) {
        if (!/Unknown agent preset/i.test(text(error?.message || error)) || !request.agentPreset) throw error;
        // Clone before dropping the field: the provider may retain the first
        // spec, and mutating it would make both attempts look preset-less.
        const fallbackRequest = { ...request };
        delete fallbackRequest.agentPreset;
        activation = await this.subagents.startActivation({
          provider: this.provider,
          label: `pentest-${role}`,
          request: fallbackRequest,
          delivery: 'caller',
          signal: controller.signal
        });
      }
    } catch (error) {
      await this.record(role, {
        runId, startedAt, status: 'failed', error: text(error?.message || error), preset,
        revision: state.revision
      });
      throw new Error(`role ${role} could not start (preset ${preset}): ${text(error?.message || error)}`);
    }

    let timer = null;
    let result;
    try {
      result = await Promise.race([
        Promise.resolve(activation.result),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error(`role ${role} exceeded ${Math.round(timeoutMs / 1000)}s budget`));
          }, timeoutMs);
          timer.unref?.();
        })
      ]);
    } catch (error) {
      controller.abort();
      await this.record(role, {
        runId, startedAt, childId: activation.childId, status: 'failed', preset,
        error: text(error?.message || error), revision: state.revision
      });
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (!result || result.stopReason !== 'completed') {
      await this.record(role, {
        runId, startedAt, childId: activation.childId, status: 'incomplete', preset,
        diagnostic: text(result?.diagnostic || result?.stopReason || 'unknown'),
        revision: state.revision
      });
      const error = new Error(`role ${role} stopped: ${text(result?.stopReason || 'unknown')}${result?.diagnostic ? ` (${result.diagnostic})` : ''}`);
      error.stopReason = text(result?.stopReason || 'unknown');
      error.childId = activation.childId;
      throw error;
    }

    let structured;
    try {
      structured = validateRoleOutput(role, result.structured);
    } catch (error) {
      await this.record(role, {
        runId, startedAt, childId: activation.childId, status: 'failed', preset,
        error: text(error?.message || error), revision: state.revision
      });
      throw error;
    }
    await this.record(role, {
      runId, startedAt, childId: activation.childId, status: 'completed', preset,
      revision: state.revision,
      verdict: role === 'validator' || role === 'auditor' ? structured.verdict : undefined,
      decision: role === 'auditor' ? structured.decision : undefined,
      severity: role === 'auditor' ? structured.severity : undefined,
      impactProven: role === 'auditor' ? structured.impactProven : undefined,
      ok: role === 'reviewer' ? structured.ok : undefined,
      problems: role === 'reviewer' ? structured.problems.length : undefined,
      assets: role === 'librarian' ? structured.assets.length : undefined,
      candidates: role === 'critic' ? structured.candidates.length : undefined,
      notes: text(structured.notes)
    });
    return { role, runId, childId: activation.childId, preset, structured };
  }

  prepareEvidence(items) {
    const root = path.resolve(this.cwd);
    return (Array.isArray(items) ? items : []).map((item) => {
      const resolved = path.resolve(root, text(item.path));
      if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        throw new Error(`role evidence path escapes workdir: ${item.path}`);
      }
      if (!this.fs.existsSync(resolved)) throw new Error(`role evidence file missing: ${item.path}`);
      const sha256 = hashFile(resolved);
      const declared = text(item.sha256).trim().toLowerCase();
      if (declared && declared !== sha256) throw new Error(`role evidence hash mismatch: ${item.path}`);
      return {
        kind: text(item.kind),
        role: 'verification',
        path: path.relative(root, resolved).split(path.sep).join('/'),
        sha256,
        summary: text(item.summary) || text(item.path)
      };
    });
  }

  async record(role, fields) {
    try {
      await this.session.run({
        type: 'role', op: 'record', role,
        runId: fields.runId,
        childId: text(fields.childId),
        status: text(fields.status),
        preset: text(fields.preset),
        verdict: fields.verdict == null ? '' : text(fields.verdict),
        decision: fields.decision == null ? '' : text(fields.decision),
        severity: fields.severity == null ? '' : text(fields.severity),
        impactProven: fields.impactProven == null ? '' : text(fields.impactProven),
        ok: fields.ok == null ? null : Boolean(fields.ok),
        problems: Number(fields.problems) || 0,
        assets: Number(fields.assets) || 0,
        candidates: Number(fields.candidates) || 0,
        notes: text(fields.notes),
        error: text(fields.error),
        diagnostic: text(fields.diagnostic),
        revision: Number(fields.revision) || 0,
        startedAt: Number(fields.startedAt) || 0,
        ranAt: this.now()
      });
    } catch { /* role bookkeeping must not hide the role result */ }
  }
}

function parseRoleFile(file) {
  if (!fs.existsSync(file)) return undefined;
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return undefined;
  const candidates = [raw];
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) candidates.push(raw.slice(start, end + 1));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch { /* try next */ }
  }
  throw new Error(`role result is not valid JSON: ${file}`);
}

function teammateName(role, runId = '') {
  const suffix = String(runId).trim().split('-').pop().replace(/[^a-z0-9]/gi, '').toLowerCase();
  return suffix ? `pentest-${role}-${suffix}` : `pentest-${role}`;
}

function buildTeamRolePrompt(role, payload, target, workdir, resultPath) {
  return [
    buildRolePrompt(role, payload, target, workdir),
    '',
    `You are running as the visible teammate "${role}". You may use shell, read/write and web tools.`,
    'Do NOT call any pentest_flow_* tool and do not modify v4 state; the Lead is the only state writer.',
    `When finished, write ONLY the JSON object described by this schema to: ${resultPath}`,
    JSON.stringify(ROLE_SCHEMAS[role], null, 2),
    'Then reply DONE. Do not put the JSON in your final message instead of the file.'
  ].join('\n');
}

/**
 * Visible role teammate (agentTeams). The teammate is a real Team member, but
 * it is still a one-shot role: it writes a structured result file and the Lead
 * validates and commits it. No role writes v4 state directly.
 */
export class TeamRoleRunner {
  constructor({ session, subagents = null, agentTeams = null, agent, cwd, memberName = '', now = Date.now, fsImpl = fs }) {
    this.session = session;
    this.subagents = subagents;
    this.agentTeams = agentTeams;
    this.agent = agent;
    this.cwd = cwd;
    this.memberName = text(memberName).trim();
    this.now = now;
    this.fs = fsImpl;
  }

  async run(role, payload = {}, options = {}) {
    if (!ROLE_NAMES.includes(role)) throw new Error(`unknown role: ${role}`);
    // DSH 0.2.2-rc.3 removed agentTeams.spawnTeammate: teammates are ordinary
    // named subagents now. Use the same startActivation transport as RoleRunner
    // and keep TeamRoleRunner as the visible-role marker for callers/guards.
    if (this.subagents && typeof this.subagents.startActivation === 'function') {
      const runner = new RoleRunner({
        session: this.session,
        subagents: this.subagents,
        agent: this.agent,
        cwd: this.cwd,
        provider: 'spawn',
        now: this.now,
        fsImpl: this.fs
      });
      const outcome = await runner.run(role, payload, options);
      return { ...outcome, memberName: outcome.childId, transport: 'subagent' };
    }
    if (!this.agentTeams || typeof this.agentTeams.spawnTeammate !== 'function') {
      throw new Error('role teammates are unavailable: agentTeams service is not mounted and subagents.startActivation is missing');
    }
    const state = await this.session.read();
    if (!state) throw new Error('no v4 goal: call pentest_flow_start first');
    const timeoutMs = Math.min(Math.max(Number(options.timeoutMs) || 600000, 1000), 600000);
    const startedAt = this.now();
    const runId = `role-${role}-${startedAt}`;
    const resultPath = path.join(path.resolve(this.cwd), 'reports', 'roles', `${role}-${runId}.json`);
    fs.mkdirSync(path.dirname(resultPath), { recursive: true });
    const serialized = JSON.stringify(payload == null ? {} : payload, null, 2);
    let promptPayload = payload;
    if (serialized.length > 24000) {
      const inputPath = path.join(path.dirname(resultPath), `${role}-input-${runId}.json`);
      fs.writeFileSync(inputPath, serialized, 'utf8');
      promptPayload = {
        payloadPath: inputPath,
        payloadBytes: Buffer.byteLength(serialized),
        note: 'The full payload is too large for a team message. Read payloadPath from disk before producing the result.'
      };
    }
    const prompt = buildTeamRolePrompt(role, promptPayload, state.goal?.target, this.cwd, resultPath);
    // A fixed memberName lets one visible teammate be reused across every
    // engagement audited by the global drain (no duplicate auditor members).
    const preferredName = this.memberName || teammateName(role);
    const members = typeof this.agentTeams.listMembers === 'function'
      ? this.agentTeams.listMembers(this.agent) : [];
    const storedName = text(state.roles?.[role]?.lastMemberName);
    const usable = members.filter((item) => item.status !== 'failed');
    const reusable = usable.find((item) => item.name === storedName)
      || usable.find((item) => item.name === preferredName)
      || usable.find((item) => item.name.startsWith(`pentest-${role}-`));
    let member;
    try {
      if (reusable) {
        member = reusable;
        await this.agentTeams.sendMessage(this.agent, {
          target: reusable.name,
          content: [{ type: 'text', text: prompt }],
          signal: options.signal || new AbortController().signal
        });
      } else {
        const name = members.some((item) => item.name === preferredName)
          ? teammateName(role, runId) : preferredName;
        const spawned = await this.agentTeams.spawnTeammate(this.agent, {
          name,
          description: roleDescription(role, payload, state.goal?.target),
          prompt: [{ type: 'text', text: prompt }],
          context: 'fresh',
          provider: 'spawn',
          signal: options.signal || new AbortController().signal
        });
        member = spawned.member;
      }
    } catch (error) {
      await this.record(role, { runId, startedAt, status: 'failed', error: text(error?.message || error), revision: state.revision });
      throw new Error(`role teammate ${role} could not start: ${text(error?.message || error)}`);
    }

    const deadline = Date.now() + timeoutMs;
    let inactiveSince = 0;
    try {
      for (;;) {
        const structured = parseRoleFile(resultPath);
        if (structured) {
          validateRoleOutput(role, structured);
          await this.record(role, {
            runId, startedAt, childId: member?.id, memberName: member?.name, status: 'completed',
            revision: state.revision,
            verdict: role === 'validator' ? structured.verdict : undefined,
            ok: ['reviewer', 'reporter'].includes(role) ? structured.ok : undefined,
            problems: role === 'reviewer' ? structured.problems.length : undefined,
            assets: role === 'librarian' ? structured.assets.length : undefined,
            candidates: role === 'critic' ? structured.candidates.length : undefined,
            notes: text(structured.notes)
          });
          return { role, runId, childId: member?.id, memberName: member?.name, member, transport: 'teammate', structured };
        }
        const members = typeof this.agentTeams.listMembers === 'function'
          ? this.agentTeams.listMembers(this.agent) : [];
        const current = members.find((item) => item.id === member?.id);
        if (current?.status === 'failed') {
          throw new Error(`role teammate ${role} failed: ${(current.diagnostics || []).join('; ') || 'unknown error'}`);
        }
        if (current?.status === 'inactive') {
          if (inactiveSince === 0) inactiveSince = Date.now();
          if (Date.now() - inactiveSince > 15000) throw new Error(`role teammate ${role} finished without writing ${path.relative(this.cwd, resultPath)}`);
        } else {
          inactiveSince = 0;
        }
        if (Date.now() >= deadline) throw new Error(`role teammate ${role} exceeded ${Math.round(timeoutMs / 1000)}s budget`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      await this.record(role, { runId, startedAt, childId: member?.id, status: 'failed', error: text(error?.message || error), revision: state.revision });
      throw error;
    }
  }

  prepareEvidence(items) {
    const root = path.resolve(this.cwd);
    return (Array.isArray(items) ? items : []).map((item) => {
      const resolved = path.resolve(root, text(item.path));
      if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        throw new Error(`role evidence path escapes workdir: ${item.path}`);
      }
      if (!this.fs.existsSync(resolved)) throw new Error(`role evidence file missing: ${item.path}`);
      const sha256 = hashFile(resolved);
      const declared = text(item.sha256).trim().toLowerCase();
      if (declared && declared !== sha256) throw new Error(`role evidence hash mismatch: ${item.path}`);
      return {
        kind: text(item.kind), role: 'verification',
        path: path.relative(root, resolved).split(path.sep).join('/'),
        sha256, summary: text(item.summary) || text(item.path)
      };
    });
  }

  async record(role, fields) {
    try {
      await this.session.run({
        type: 'role', op: 'record', role,
        runId: fields.runId, childId: text(fields.childId),
        memberName: text(fields.memberName),
        status: text(fields.status), preset: 'teammate',
        verdict: fields.verdict == null ? '' : text(fields.verdict),
        decision: fields.decision == null ? '' : text(fields.decision),
        severity: fields.severity == null ? '' : text(fields.severity),
        impactProven: fields.impactProven == null ? '' : text(fields.impactProven),
        ok: fields.ok == null ? null : Boolean(fields.ok),
        problems: Number(fields.problems) || 0,
        assets: Number(fields.assets) || 0,
        candidates: Number(fields.candidates) || 0,
        notes: text(fields.notes), error: text(fields.error),
        diagnostic: text(fields.diagnostic),
        revision: Number(fields.revision) || 0,
        startedAt: Number(fields.startedAt) || 0,
        ranAt: this.now()
      });
    } catch { /* role bookkeeping must not hide the role result */ }
  }
}
