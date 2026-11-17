/**
 * P0-6 failed-worker checkpoints (失败带 checkpoint 续跑).
 *
 * A v4 worker failure currently only reopens its direction, losing the trace,
 * the evidence ids the worker already produced and the reason to continue.
 * This module builds a bounded, JSON-serializable checkpoint for any failed
 * task and selects bounded "continue-from" candidates for the dispatcher.
 *
 * Pure: no I/O, no wall-clock reads, no DSH imports, no state mutation. All
 * inputs are read-only projections; every returned value is a fresh object.
 *
 * Two rules from the P0-6 spec are enforced here:
 * - 同方向至多复核一次: a direction gets one recheck at most. Once a resume
 *   task (or any later task) exists in state.tasks, no new candidate is
 *   offered for that direction.
 * - 否定结论 observed 才封路: only an *observed* negative conclusion seals a
 *   direction. An inferred/unverified negative, or a negative with no
 *   content-addressed evidence, stays resumable (exhausted 能接着探).
 */

export const MAX_TRACE_ITEMS = 20;
export const MAX_EVIDENCE_IDS = 30;
export const MAX_CANDIDATES = 10;

const MAX_SCAN = 200;          // rows examined per collection, from the tail
const MAX_TEXT = 220;          // per-string budget
const MAX_REASON = 240;
const MAX_ERROR = 240;
const MAX_ID = 80;

const ACTIVE_TASK_STATES = new Set(['queued', 'running']);
const OBSERVED_CONFIDENCES = new Set(['observed', 'high', 'certain', 'confirmed']);
const WEAK_CONFIDENCES = new Set(['inferred', 'low', 'medium', 'likely', 'unverified', 'unknown']);
const NEGATIVE_VERDICTS = new Set([
  'negative', 'no_issue', 'no_issue_found', 'not_reproduced', 'ruled_out', 'excluded', 'clean', 'safe'
]);
const NEGATIVE_RE = new RegExp([
  '未发现', '未找到', '没有发现', '不存在', '已排除', '明确排除', '无漏洞', '无风险',
  '无问题', '无异常', '不可利用', '无法利用', '无法复现', '无法绕过', '无法触发',
  '鉴权有效', '鉴权正常', '已修复', '无越权',
  'no[ _-]?(issue|vulnerability|risk|bypass)', 'no[ _-]?issue[ _-]?found',
  'not[ _-]?vulnerable', 'not[ _-]?(exploitable|affected|reproducible)',
  'ruled[ _-]?out', 'confirmed[ _-]?safe'
].join('|'), 'i');

function text(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (value instanceof Error) return value.message || value.name;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  return '';
}

function firstText(...values) {
  for (const value of values) {
    const out = text(value);
    if (out.trim()) return out;
  }
  return '';
}

function line(value, max = MAX_TEXT) {
  const flat = text(value).replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function number(value) {
  const out = Number(value);
  return Number.isFinite(out) ? out : 0;
}

function clamp(value, min, max) {
  const out = Math.floor(number(value));
  return out < min ? min : Math.min(out, max);
}

/** Deterministic bounded set of id-like strings; never mutates the input. */
function uniqueIds(values, max = MAX_EVIDENCE_IDS) {
  const out = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const id = line(value, MAX_ID);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

function tail(list, max = MAX_SCAN) {
  return Array.isArray(list) ? list.slice(-max) : [];
}

function errorText(value) {
  return line(firstText(value?.message, value) || 'worker failed', MAX_ERROR);
}

function observed(confidence) {
  return OBSERVED_CONFIDENCES.has(text(confidence).trim().toLowerCase());
}

function factsFor(state, direction) {
  const directionId = text(direction?.id);
  return tail(state?.facts).filter((fact) => text(fact?.directionId) === directionId);
}

/**
 * Evidence already produced for this direction. v4 evidence rows carry no
 * directionId, so ids come from the direction's conclusion, its facts and
 * findings, and its tasks' results/checkpoints. When nothing is linked we fall
 * back to the most recent canonical evidence rows rather than losing them.
 */
function evidenceIdsFor(state, direction, task) {
  const directionId = text(direction?.id);
  const linked = [];
  const push = (ids) => {
    for (const id of Array.isArray(ids) ? ids : []) linked.push(id);
  };
  push(direction?.conclusion?.evidenceIds);
  for (const fact of tail(state?.facts)) {
    if (text(fact?.directionId) === directionId) push(fact?.evidenceIds);
  }
  for (const finding of tail(state?.findings)) {
    if (text(finding?.directionId) === directionId) push(finding?.evidenceIds);
  }
  for (const row of tail(state?.tasks)) {
    if (text(row?.directionId) !== directionId) continue;
    push(row?.result?.evidenceIds);
    push(row?.checkpoint?.evidenceIds);
    push(row?.checkpoint?.continueFrom?.evidenceIds);
  }
  push(task?.result?.evidenceIds);
  push(task?.evidenceIds);
  push(task?.checkpoint?.evidenceIds);
  push(task?.checkpoint?.continueFrom?.evidenceIds);
  const ids = uniqueIds(linked);
  if (ids.length > 0) return ids;
  return uniqueIds(tail(state?.evidence).map((row) => row?.id));
}

/** Recent trace rows from tasks, facts and evidence summaries (bounded). */
function recentTrace(state, direction) {
  const directionId = text(direction?.id);
  const rows = [];
  let index = 0;
  const add = (row, scoped) => rows.push({ ...row, scoped, index: index++ });
  for (const task of tail(state?.tasks)) {
    add({
      kind: 'task',
      id: line(task?.id, MAX_ID),
      state: line(task?.state, 24),
      text: line(firstText(task?.result?.conclusion, task?.error, task?.workerLabel), MAX_TEXT),
      at: number(task?.finishedAt) || number(task?.startedAt) || number(task?.createdAt)
    }, text(task?.directionId) === directionId);
  }
  for (const fact of tail(state?.facts)) {
    add({
      kind: 'fact',
      id: line(fact?.id, MAX_ID),
      confidence: line(fact?.confidence, 24),
      text: line(firstText(fact?.answer, fact?.detail), MAX_TEXT),
      at: number(fact?.createdAt)
    }, text(fact?.directionId) === directionId);
  }
  for (const evidence of tail(state?.evidence)) {
    add({
      kind: 'evidence',
      id: line(evidence?.id, MAX_ID),
      role: line(evidence?.role, 24),
      text: line(firstText(evidence?.summary, evidence?.path), MAX_TEXT),
      at: number(evidence?.createdAt)
    }, false);
  }
  rows.sort((a, b) => b.at - a.at
    || Number(b.scoped) - Number(a.scoped)
    || b.index - a.index);
  return rows.slice(0, MAX_TRACE_ITEMS).map(({ scoped, index: _index, ...row }) => row);
}

function buildContinueFrom({ task, direction, state, error, evidenceIds }) {
  const question = line(firstText(direction?.question, task?.question), MAX_TEXT);
  const doneWhen = line(firstText(direction?.doneWhen, task?.doneWhen), MAX_TEXT)
    || '得到可复现证据或明确排除该方向';
  const facts = factsFor(state, direction);
  const digest = facts.slice(-3)
    .map((fact) => line(fact?.answer, 60)).filter(Boolean).join('；');
  const reason = line([
    `failed ${line(task?.id, MAX_ID) || 'task'}: ${line(error, 80)}`,
    `${line(direction?.id, MAX_ID) || 'direction'} 仍待满足：${line(doneWhen, 80)}`,
    `已有 ${evidenceIds.length} 条 evidence / ${facts.length} 条 fact`
      + `${digest ? `（最近：${digest}）` : ''}，从断点继续，不重复已测步骤`
  ].join('；'), MAX_REASON);
  return {
    question,
    doneWhen,
    reason,
    evidenceIds: evidenceIds.slice(0, MAX_EVIDENCE_IDS)
  };
}

/**
 * Build one bounded checkpoint for a failed task.
 *
 * @param {{task?: object, direction?: object, state?: object, error?: unknown, now?: number}} input
 * @returns {{taskId: string, directionId: string, error: string, at: number,
 *   recentTrace: object[], evidenceIds: string[], continueFrom: {
 *     question: string, doneWhen: string, reason: string, evidenceIds: string[]}}}
 */
export function buildCheckpoint({ task = null, direction = null, state = null, error = '', now = 0 } = {}) {
  const message = errorText(error || task?.error);
  const evidenceIds = evidenceIdsFor(state, direction, task);
  return {
    taskId: line(firstText(task?.id), MAX_ID),
    directionId: line(firstText(direction?.id, task?.directionId), MAX_ID),
    error: message,
    at: number(now) || number(task?.finishedAt) || number(task?.updatedAt) || number(direction?.updatedAt),
    recentTrace: recentTrace(state, direction),
    evidenceIds: evidenceIds.slice(),
    continueFrom: buildContinueFrom({ task, direction, state, error: message, evidenceIds })
  };
}

function conclusionAnswer(conclusion) {
  if (typeof conclusion === 'string') return conclusion;
  if (!conclusion || typeof conclusion !== 'object') return '';
  return firstText(conclusion.answer, conclusion.summary, conclusion.text);
}

function conclusionObservedByEvidence(state, conclusion) {
  const ids = uniqueIds(conclusion?.evidenceIds);
  if (ids.length === 0) return false;
  const rows = new Map(tail(state?.evidence)
    .filter((row) => text(row?.id).trim())
    .map((row) => [text(row.id), row]));
  return ids.some((id) => text(rows.get(id)?.sha256).trim() !== '');
}

/** 否定结论 observed 才封路: weak or unobserved negatives stay resumable. */
export function isObservedNegative(state, direction) {
  const conclusion = direction?.conclusion;
  const answer = conclusionAnswer(conclusion);
  const observedNegativeFacts = () => factsFor(state, direction)
    .some((fact) => observed(fact?.confidence) && NEGATIVE_RE.test(text(fact?.answer)));
  if (!conclusion) return observedNegativeFacts();
  const verdict = firstText(conclusion.verdict, conclusion.kind, conclusion.result).trim().toLowerCase();
  const negative = conclusion.negative === true
    || NEGATIVE_VERDICTS.has(verdict)
    || NEGATIVE_RE.test(answer);
  if (!negative) return false;
  const confidence = text(conclusion.confidence).trim().toLowerCase();
  if (WEAK_CONFIDENCES.has(confidence)) return false;
  if (OBSERVED_CONFIDENCES.has(confidence)) return true;
  if (conclusionObservedByEvidence(state, conclusion)) return true;
  return observedNegativeFacts();
}

/**
 * A resume task is marked by the dispatcher/reducer. `task.checkpoint` is
 * deliberately NOT a marker: failed tasks carry their own checkpoint.
 */
function isResumeTask(task) {
  if (!task || typeof task !== 'object') return false;
  return task.resumeFrom != null
    || task.continueFrom != null
    || task.checkpointFrom != null
    || text(task.origin) === 'checkpoint'
    || /^resume/i.test(text(task.workerLabel))
    || number(task.attempt) > 1;
}

/**
 * Select bounded continue-from candidates for failed tasks.
 *
 * @param {object} state canonical v4 state
 * @param {{maxPerDirection?: number, limit?: number, n?: number,
 *   maxCandidates?: number, now?: number}} options
 *   `maxPerDirection` (alias `limit`/`n`) defaults to 1; total is capped at
 *   MAX_CANDIDATES (10).
 * @returns {object[]} candidates: {taskId, directionId, at, error, question,
 *   doneWhen, reason, evidenceIds, continueFrom}
 */
export function selectResumeCandidates(state, options = {}) {
  const opts = options && typeof options === 'object' ? options : {};
  const maxPerDirection = clamp(opts.maxPerDirection ?? opts.perDirection ?? opts.limit ?? opts.n ?? 1, 1, MAX_CANDIDATES);
  const maxCandidates = clamp(opts.maxCandidates ?? opts.max ?? MAX_CANDIDATES, 1, MAX_CANDIDATES);
  const now = number(opts.now);
  const tasks = tail(state?.tasks);
  const directions = new Map(tail(state?.directions)
    .filter((direction) => text(direction?.id).trim())
    .map((direction) => [text(direction.id), direction]));
  const groups = new Map();
  tasks.forEach((task, index) => {
    const directionId = text(task?.directionId);
    if (!directionId) return;
    let group = groups.get(directionId);
    if (!group) {
      group = { tasks: [], failed: [] };
      groups.set(directionId, group);
    }
    group.tasks.push({ task, index });
    if (task?.state === 'failed') group.failed.push({ task, index });
  });

  const out = [];
  for (const [directionId, group] of groups) {
    if (out.length >= maxCandidates) break;
    if (group.failed.length === 0) continue;
    const direction = directions.get(directionId);
    if (!direction || !text(direction.question).trim()) continue;
    if (isObservedNegative(state, direction)) continue;
    if (group.tasks.some(({ task }) => ACTIVE_TASK_STATES.has(task?.state))) continue;
    // 同方向至多复核一次: a resume marker, or any *dispatched* task (a commit,
    // a cancel, an unknown state) after the first failure, consumes the single
    // allowed recheck. Repeated failures before any resume are still one
    // direction-level candidate, not one per failed task.
    if (group.tasks.some(({ task }) => isResumeTask(task))) continue;
    const firstFailed = Math.min(...group.failed.map(({ index }) => index));
    if (group.tasks.some(({ index, task }) => index > firstFailed && task?.state !== 'failed')) continue;
    const eligible = group.failed.slice()
      .sort((a, b) => b.index - a.index)
      .slice(0, maxPerDirection);
    for (const { task } of eligible) {
      if (out.length >= maxCandidates) break;
      const checkpoint = buildCheckpoint({ task, direction, state, error: task?.error, now });
      const continueFrom = {
        ...checkpoint.continueFrom,
        evidenceIds: checkpoint.continueFrom.evidenceIds.slice()
      };
      out.push({
        taskId: checkpoint.taskId,
        directionId: checkpoint.directionId,
        at: checkpoint.at,
        error: checkpoint.error,
        question: continueFrom.question,
        doneWhen: continueFrom.doneWhen,
        reason: continueFrom.reason,
        evidenceIds: checkpoint.evidenceIds.slice(),
        continueFrom
      });
    }
  }
  return out;
}
