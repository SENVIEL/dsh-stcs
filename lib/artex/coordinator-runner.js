/**
 * STCS CoordinatorRunner: a persistent host-side state machine.
 *
 * It is NOT a teammate and NOT a prompt. Every tick:
 *   read v4 blackboard -> sync outcomes -> derive hypotheses from the board ->
 *   promote runnable hypotheses to directions -> fill every free worker slot ->
 *   drain pending audits -> persist decisions/debrief.
 *
 * All v4 writes go through the shared V4Session facade, so worker commits,
 * audits and coordinator actions share one store and one transaction chain.
 */
import { V4Dispatcher, inferFindingDedupeKey } from '../v4/dispatch.js';
import { TeamRoleRunner } from '../v4/roles.js';
import { clamp, text } from './util.js';
import { buildStcsWorkerPrompt } from './prompt.js';
import { selectMinimalAttachment } from './attachment.js';
import {
  bumpRound,
  decisionDigest,
  deriveFromBoard,
  emptyBoard,
  makeDecision,
  boardSummary,
  mergeBoards,
  normalizeBoard
} from './coordinator.js';
import { markDirectionOutcome, markRunning, mergeCandidateHypotheses, normalizeHypothesis } from './hypothesis-tree.js';
import { summarizeTiers } from './verdict.js';
import { buildDebrief } from './coordinator.js';

const TERMINAL_DIRECTIONS = new Set(['done', 'exhausted', 'blocked', 'empty']);
const ACTIVE_TASK_STATES = new Set(['queued', 'running']);

function comparable(value) {
  return text(value)
    .toLowerCase()
    .replace(/\/+(?=\s|$)/g, '')
    .replace(/\s+/g, '')
    .slice(0, 400);
}

function doneWhenFor(hypothesis, targetMap) {
  const endpoint = (targetMap?.endpoints || []).find((item) => item.id === hypothesis?.endpointId);
  if (endpoint) {
    return `对 ${endpoint.method} ${endpoint.path} 取到可复现的请求/响应证据并判定成立，或明确排除该假设`;
  }
  return `取到可复现证据并判定成立，或明确排除：${text(hypothesis?.claim).slice(0, 120)}`;
}

function directionStateOfTask(state, taskId) {
  const task = (state?.tasks || []).find((item) => item.id === taskId);
  return text(task?.result?.directionState || task?.directionState || '');
}

function findingIdsForDirection(state, directionId) {
  return (state?.findings || [])
    .filter((item) => item && item.deleted !== true && text(item.directionId) === text(directionId))
    .map((item) => item.id);
}

function evidenceRefsForDirection(state, direction) {
  const refs = [...(direction?.conclusion?.evidenceIds || [])];
  for (const finding of state?.findings || []) {
    if (!finding || text(finding.directionId) !== text(direction?.id)) continue;
    for (const id of finding.evidenceIds || []) if (id && !refs.includes(id)) refs.push(id);
  }
  return refs;
}

export class CoordinatorRunner {
  constructor({
    store,
    runtime = null,
    getSession,
    agents,
    goals,
    subagents,
    auditPendingFor = null,
    indexEvidence = null,
    reproject = null,
    agentTeams = null,
    dispatcherFactory = null,
    plannerRunner = null,
    presetOf = null,
    config = {},
    now = () => Date.now(),
    logger = null
  } = {}) {
    if (!store) throw new Error('CoordinatorRunner requires a coordinator store');
    if (typeof getSession !== 'function') throw new Error('CoordinatorRunner requires getSession');
    if (!agents || typeof agents.list !== 'function') throw new Error('CoordinatorRunner requires an agents service');
    if (!subagents || typeof subagents.startActivation !== 'function') {
      throw new Error('CoordinatorRunner requires the subagents service');
    }
    this.store = store;
    this.runtime = runtime;
    this.getSession = getSession;
    this.agents = agents;
    this.goals = goals;
    this.subagents = subagents;
    this.auditPendingFor = auditPendingFor;
    this.indexEvidence = indexEvidence;
    this.reproject = reproject;
    this.agentTeams = agentTeams;
    this.dispatcherFactory = typeof dispatcherFactory === 'function'
      ? dispatcherFactory
      : (options) => new V4Dispatcher(options);
    this.plannerRunner = typeof plannerRunner === 'function'
      ? plannerRunner
      : (options) => new TeamRoleRunner(options);
    // The committed preset lives in the `agentPreset` session projection; the
    // session header keeps the creation-time value, so a header read would
    // never see a preset selected in the new-session dialog.
    this.presetOf = typeof presetOf === 'function'
      ? presetOf
      : (agent) => text(agent?.session?.header?.agentPreset);
    this.config = {
      enabled: config.enabled !== false,
      scanMs: clamp(config.scanMs ?? 3000, 1000, 300000),
      maxWorkers: clamp(config.maxWorkers ?? 6, 1, 6),
      workerPreset: text(config.workerPreset) || 'artex',
      maxDecisions: clamp(config.maxDecisions ?? 500, 50, 5000),
      maxAttachmentBytes: clamp(config.maxAttachmentBytes ?? 8192, 512, 65536),
      maxDurationMs: Math.max(0, Number(config.maxDurationMs) || 0),
      maxHypotheses: clamp(config.maxHypotheses ?? 240, 20, 1000),
      auditTimeoutMs: clamp(config.auditTimeoutMs ?? 180000, 10000, 600000),
      plannerEnabled: config.plannerEnabled !== false,
      plannerHeartbeatMs: clamp(config.plannerHeartbeatMs ?? 600000, 60000, 3600000),
      plannerMinIntervalMs: clamp(config.plannerMinIntervalMs ?? 60000, 5000, 600000),
      plannerTimeoutMs: clamp(config.plannerTimeoutMs ?? 300000, 10000, 600000),
      plannerMaxAttempts: clamp(config.plannerMaxAttempts ?? 2, 1, 5),
      plannerRetryDelayMs: clamp(config.plannerRetryDelayMs ?? 5000, 1000, 120000),
      plannerSoftTimeoutMs: clamp(config.plannerSoftTimeoutMs ?? 20000, 5000, 120000),
      strictPlanner: config.strictPlanner === true
    };
    this.now = typeof now === 'function' ? now : () => Date.now();
    this.logger = logger;
    this.timer = null;
    this.ticking = false;
    this.inflight = new Set();
    // Planner runs off the tick path: a 3s tick must never wait for a model
    // round. Results land here and are applied by the next tick.
    this.plannerTasks = new Map();
    this.plannerResults = new Map();
    this.plannerRuntime = new Map();
    // One audit run per session at a time: worker commits and ticks used to
    // enqueue the same pending finding with stale snapshots, producing dozens
    // of duplicate validations in minutes.
    this.auditInflight = new Set();
  }

  start() {
    if (this.timer || this.config.enabled !== true) return () => {};
    this.timer = setInterval(() => { void this.tick(); }, this.config.scanMs);
    this.timer.unref?.();
    void this.tick();
    return () => this.stop();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  listRootAgents() {
    const seen = new Set();
    const out = [];
    for (const agent of this.agents.list() || []) {
      const header = agent?.session?.header || {};
      if (text(this.presetOf(agent)) !== 'artex') continue;
      if (text(header.parentSession)) continue;
      if (!agent?.id || seen.has(agent.id)) continue;
      seen.add(agent.id);
      out.push(agent);
    }
    return out;
  }

  /**
   * Cheap change signal for the planner: new knowledge on the board.
   * Task/direction state churn alone must not wake the planner.
   */
  plannerSignature(state) {
    return [
      (state?.facts || []).filter((item) => item && item.deleted !== true).length,
      (state?.findings || []).filter((item) => item && item.deleted !== true).length,
      (state?.assets || []).length,
      (state?.coverage || []).length
    ].join('/');
  }

  plannerRuntimeOf(sessionId) {
    let runtime = this.plannerRuntime.get(sessionId);
    if (!runtime) {
      runtime = { attempts: 0, nextAt: 0, degraded: false, lastError: '', lastDurationMs: 0, lastStartedAt: 0, lastResultAt: 0, fallbackCreated: false };
      this.plannerRuntime.set(sessionId, runtime);
    }
    return runtime;
  }

  plannerDue(state, board, now, sessionId = '') {
    if (!this.config.plannerEnabled) return false;
    if (!this.subagents || typeof this.subagents.startActivation !== 'function') return false;
    const runtime = this.plannerRuntimeOf(sessionId);
    if (runtime.degraded || runtime.attempts >= this.config.plannerMaxAttempts) return false;
    if (this.plannerTasks.has(sessionId) || this.plannerResults.has(sessionId)) return false;
    if (runtime.nextAt > now) return false;
    // A proven goal stops planning. A high/critical finding is not a proof by
    // itself: a confirmed high-impact write can still need a separate RCE or
    // data-impact step, and stopping here made d82's planner go silent with
    // goal.proofs=0.
    if ((state?.goal?.proofs || []).length > 0) return false;
    const since = now - (Number(board.lastPlannerAt) || 0);
    if (board.lastPlannerAt && since < this.config.plannerMinIntervalMs) return false;
    const active = (state?.tasks || []).filter((task) => ACTIVE_TASK_STATES.has(text(task.state))).length;
    const open = (state?.directions || []).filter((item) => ['open', 'running'].includes(text(item?.state))).length;
    if (!board.lastPlannerAt) return true;
    if (since >= this.config.plannerHeartbeatMs) return true;
    if (active === 0 && open === 0) return true;
    return Boolean(board.lastPlannerSignature) && board.lastPlannerSignature !== this.plannerSignature(state);
  }

  plannerDigest(state, board, { strictPlanner = false } = {}) {
    const facts = (state?.facts || []).filter((item) => item && item.deleted !== true);
    const directions = (state?.directions || []).filter((item) => item && item.deleted !== true);
    const goal = state?.goal || null;
    const open = directions.filter((item) => ['open', 'running'].includes(text(item.state)));
    return {
      goal: goal ? {
        id: goal.id,
        target: text(goal.target),
        objective: text(goal.objective).slice(0, 500),
        phase: goal.phase,
        authorization: text(goal.authorization).slice(0, 1200)
      } : null,
      provenance: {
        sessionId: text(state?.sessionId || board?.sessionId),
        goalCreatedAt: Number(goal?.createdAt) || 0,
        workdir: text(goal?.workdir),
        rule: 'Only cite artifacts created by THIS session after goalCreatedAt and inside this workdir. Target-side cron/log/file artifacts older than the goal belong to another engagement.'
      },
      counts: {
        facts: facts.length,
        findings: (state?.findings || []).filter((item) => item && item.deleted !== true).length,
        assets: (state?.assets || []).length,
        directions: directions.length,
        coverage: (state?.coverage || []).length
      },
      targetMap: {
        apps: (board.targetMap.apps || []).map((item) => item.value).slice(0, 8),
        endpoints: (board.targetMap.endpoints || []).slice(0, 25).map((item) => `${item.method} ${item.path}`),
        params: (board.targetMap.params || []).slice(0, 25).map((item) => item.name),
        authFlows: (board.targetMap.authFlows || []).slice(0, 12).map((item) => `${item.kind} ${item.endpoint}`)
      },
      directions: directions.slice(-25).map((item) => ({
        id: item.id,
        state: item.state,
        stage: item.stage,
        origin: text(item.origin),
        question: text(item.question).slice(0, 220),
        doneWhen: text(item.doneWhen).slice(0, 160),
        assets: (item.assets || []).slice(0, 8),
        parents: (item.parents || []).slice(0, 8)
      })),
      frontier: open.slice(0, 12).map((item) => ({
        id: item.id,
        state: item.state,
        priority: Number(item.priority) || 0,
        question: text(item.question).slice(0, 220),
        assets: (item.assets || []).slice(0, 8)
      })),
      recentDone: directions
        .filter((item) => ['done', 'exhausted', 'blocked'].includes(text(item.state)))
        .slice(-12)
        .map((item) => ({
          id: item.id,
          state: item.state,
          question: text(item.question).slice(0, 180),
          conclusion: text(item.conclusion?.answer).slice(0, 180)
        })),
      assets: (state?.assets || []).slice(-40).map((item) => ({
        id: item.id,
        type: item.type,
        value: text(item.value).slice(0, 180)
      })),
      mustGenerate: strictPlanner
        && (goal?.proofs || []).length === 0
        && open.length === 0,
      todos: Array.isArray(board?.plannerTodos) ? board.plannerTodos.slice(-50) : [],
      candidates: strictPlanner ? [] : (board.hypothesisTree || [])
        .filter((item) => text(item.status) === 'candidate')
        .slice(0, 20)
        .map((item) => ({
          id: item.id,
          claim: text(item.claim).slice(0, 180),
          axis: item.axis,
          priority: Number(item.priority) || 0,
          source: text(item.source),
          reason: text(item.reason).slice(0, 120)
        })),
      hypotheses: (board.hypothesisTree || []).slice(-50).map((item) => ({
        id: item.id,
        status: item.status,
        claim: text(item.claim).slice(0, 160),
        directionId: item.directionId || ''
      })),
      facts: facts.slice(-20).map((item) => ({
        id: item.id,
        directionId: text(item.directionId),
        answer: text(item.answer || item.claim).slice(0, 240),
        evidenceIds: (item.evidenceIds || []).slice(0, 5)
      })),
      findings: (state?.findings || [])
        .filter((item) => item && item.deleted !== true)
        .slice(-20)
        .map((item) => ({
          id: item.id,
          directionId: text(item.directionId),
          severity: text(item.severity),
          status: text(item.status),
          impactProven: text(item.impactProven),
          claim: text(item.claim).slice(0, 240),
          evidenceIds: (item.evidenceIds || []).slice(0, 5)
        })),
      coverage: (state?.coverage || []).slice(-15).map((item) => ({ axis: item.axis, result: item.result })),
      decisions: (board.decisions || []).slice(-8).map((item) => ({ action: item.action, reason: text(item.reason).slice(0, 160) }))
    };
  }

  async plannerProbe(sessionId, url, method = 'GET') {
    const session = await this.getSession(sessionId);
    const state = await session.read();
    const target = text(state?.goal?.target);
    if (!target) throw new Error('planner probe requires an active goal target');
    let base;
    let probe;
    try {
      base = new URL(target);
      probe = new URL(text(url));
    } catch {
      throw new Error('planner probe requires a valid http(s) URL');
    }
    if (!['http:', 'https:'].includes(probe.protocol) || !['http:', 'https:'].includes(base.protocol)) {
      throw new Error('planner probe only supports http/https');
    }
    const portOf = (value) => text(value.port) || (value.protocol === 'https:' ? '443' : '80');
    if (probe.hostname !== base.hostname || portOf(probe) !== portOf(base)) {
      throw new Error('planner probe is restricted to the goal target origin');
    }
    const verb = text(method).toUpperCase() === 'HEAD' ? 'HEAD' : 'GET';
    if (this.runtime) await this.runtime.recordProbe(sessionId, probe.toString(), this.now());
    const response = await fetch(probe, {
      method: verb,
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
      headers: { 'user-agent': 'STCS-Planner-Probe/1.0' }
    });
    const body = verb === 'HEAD' ? '' : (await response.text()).slice(0, 65536);
    const headers = {};
    for (const [key, value] of response.headers.entries()) {
      if (['set-cookie', 'authorization'].includes(key.toLowerCase())) continue;
      headers[key] = text(value).slice(0, 500);
    }
    return {
      url: probe.toString(),
      method: verb,
      status: response.status,
      headers,
      body,
      truncated: body.length >= 65536
    };
  }

  /**
   * Start one planner round on a background promise. The tick never awaits a
   * model call; the result is applied by a later tick. A failed attempt is
   * retried with backoff up to plannerMaxAttempts, then the session degrades.
   */
  startPlannerTask(agent, session, state, board, now) {
    const sessionId = text(agent?.id || session?.sessionId);
    if (!sessionId || !this.plannerDue(state, board, now, sessionId)) return false;
    const runtime = this.plannerRuntimeOf(sessionId);
    runtime.attempts += 1;
    const startedAt = this.now();
    runtime.lastStartedAt = startedAt;
    if (this.runtime) void this.runtime.plannerStarted(sessionId, startedAt).catch(() => {});
    let runner;
    try {
      runner = this.plannerRunner({
        session,
        agentTeams: this.agentTeams,
        subagents: this.subagents,
        agent,
        cwd: state?.goal?.workdir || process.cwd(),
        memberName: 'pentest-planner',
        now: this.now
      });
    } catch (error) {
      runtime.lastError = text(error?.message || error);
      runtime.nextAt = this.now() + this.config.plannerRetryDelayMs;
      if (runtime.attempts >= this.config.plannerMaxAttempts) runtime.degraded = true;
      this.warn(`planner ${sessionId}: ${runtime.lastError}`);
      return false;
    }
    const task = runner.run('planner', this.plannerDigest(state, board, { strictPlanner: this.config.strictPlanner }), {
      timeoutMs: this.config.plannerTimeoutMs
    }).then((result) => {
      const durationMs = Math.max(0, this.now() - startedAt);
      runtime.lastDurationMs = durationMs;
      runtime.lastError = '';
      this.plannerResults.set(sessionId, { result, startedAt, durationMs });
      if (this.runtime) void this.runtime.plannerFinished(sessionId, result, this.now()).catch(() => {});
    }).catch((error) => {
      runtime.lastError = text(error?.message || error);
      runtime.nextAt = this.now() + (this.config.plannerRetryDelayMs * Math.max(1, runtime.attempts));
      if (runtime.attempts >= this.config.plannerMaxAttempts) runtime.degraded = true;
      if (this.runtime) void this.runtime.failPlanner(sessionId, runtime.lastError, this.now()).catch(() => {});
      this.warn(`planner ${sessionId}: ${runtime.lastError}`);
    }).finally(() => {
      this.plannerTasks.delete(sessionId);
    });
    this.plannerTasks.set(sessionId, task);
    return true;
  }

  consumePlannerResult(sessionId) {
    const pending = this.plannerResults.get(sessionId);
    if (!pending) return null;
    this.plannerResults.delete(sessionId);
    return pending;
  }

  async applyPlannerDirections(session, state, board, result, now, agent = null) {
    const proposed = Array.isArray(result?.structured?.directions) ? result.structured.directions.slice(0, 4) : [];
    let workingState = state;
    const hypotheses = [];
    const acceptedIds = Array.isArray(result?.structured?.acceptedCandidates)
      ? result.structured.acceptedCandidates.map((id) => text(id)).filter(Boolean).slice(0, 4)
      : [];
    for (const candidateId of acceptedIds) {
      const candidate = (board?.hypothesisTree || []).find((item) =>
        text(item.id) === candidateId && ['candidate', 'pending'].includes(text(item.status)));
      if (!candidate) continue;
      const question = text(candidate.claim).trim();
      if (!question) continue;
      const key = comparable(question);
      if ((workingState.directions || []).some((direction) => direction && direction.deleted !== true && comparable(direction.question) === key)) continue;
      const priority = clamp(70 + (Number(candidate.priorityBase) || Number(candidate.priority) || 0), 1, 100);
      const next = await session.addDirection({
        axis: Array.isArray(candidate.axis) && candidate.axis.length > 0 ? candidate.axis : ['surface'],
        question,
        doneWhen: text(candidate.doneWhen).slice(0, 400) || `用一条可复现请求验证并判定成立或明确排除：${question.slice(0, 120)}`,
        stage: 'probe',
        priority,
        origin: 'planner'
      });
      const direction = (next.directions || []).find((entry) => comparable(entry.question) === key) || (next.directions || []).at(-1);
      workingState = next;
      if (!direction) continue;
      hypotheses.push({
        ...candidate,
        status: 'runnable',
        priorityBase: priority,
        priority,
        directionId: direction.id,
        source: 'planner-accepted',
        reason: 'planner accepted deterministic candidate'
      });
    }
    for (const item of proposed) {
      const question = text(item?.question).trim();
      if (!question) continue;
      const key = comparable(question);
      if ((workingState.directions || []).some((direction) => direction && direction.deleted !== true && comparable(direction.question) === key)) continue;
      const axis = Array.isArray(item?.axis)
        ? item.axis.map((value) => text(value)).filter(Boolean).slice(0, 4)
        : ['surface'];
      const priority = clamp(80 + (Number(item?.priority) || 7), 1, 100);
      const next = await session.addDirection({
        axis: axis.length > 0 ? axis : ['surface'],
        question,
        doneWhen: text(item?.doneWhen).slice(0, 400) || `取到可复现证据并判定成立，或明确排除：${question.slice(0, 120)}`,
        stage: 'probe',
        priority,
        origin: 'planner',
        assets: Array.isArray(item?.assetIds) ? item.assetIds.map((value) => text(value)).filter(Boolean).slice(0, 8) : [],
        parents: Array.isArray(item?.parentIds) ? item.parentIds.map((value) => text(value)).filter(Boolean).slice(0, 8) : []
      });
      const direction = (next.directions || []).find((entry) => comparable(entry.question) === key) || (next.directions || []).at(-1);
      workingState = next;
      if (!direction) continue;
      hypotheses.push({
        claim: question,
        axis: axis.length > 0 ? axis : ['surface'],
        priority,
        priorityBase: priority,
        status: 'runnable',
        directionId: direction.id,
        source: 'planner',
        reason: text(item?.reason) || 'planner round'
      });
    }
    // Planner notes are not a side channel: a note that claims a proof must
    // become a first-class verification direction, otherwise a real RCE can
    // sit in roles.planner.lastNotes forever with goal.proofs=0.
    const notes = text(result?.structured?.notes).trim();
    const positiveProof = /(uid=0(?:\(root\))?|root shell|命令执行成功|rce\s*(?:已确认|confirmed|复现成功|成功|proven|reproduced)|复现成功|已证明|live_state_change)/i;
    const negativeProof = /(?:无新的|没有|无|未|not)\s*(?:新的)?\s*(?:rce\s*)?proof|no\s+proof|未证明|无证明/i;
    const proofLike = notes.length >= 20 && positiveProof.test(notes) && !negativeProof.test(notes);
    const proofKeyMatch = notes.match(/(uid=0(?:\(root\))?|cron\s*(?:id=)?\d+|rce)/i);
    // One proof-book direction per session: the note wording and the extracted
    // token differ between rounds (`uid=0(root)` vs `rce`), and keying the
    // direction by that token produced two priority-100 directions for one proof.
    const proofKey = 'proof';
    const noteQuestion = `复核并记录 planner 报告的证明（${proofKey}）`;
    const noteKey = comparable(noteQuestion);
    if (proofLike && !(workingState.directions || []).some((direction) => direction && direction.deleted !== true && comparable(direction.question) === noteKey)) {
      const next = await session.addDirection({
        axis: ['chain', 'verify'],
        question: noteQuestion,
        doneWhen: `用本会话 workdir 内的原始请求/响应复现：${notes.slice(0, 160)}；若证据早于 goal.createdAt 或来自其他会话 workdir，明确排除并在 conclusion 写 provenance。`,
        stage: 'probe',
        priority: 120,
        origin: 'planner'
      });
      const direction = (next.directions || []).find((entry) => comparable(entry.question) === noteKey) || (next.directions || []).at(-1);
      workingState = next;
      if (direction) {
        hypotheses.push({
          claim: noteQuestion,
          axis: ['chain', 'verify'],
          priority: 120,
          priorityBase: 120,
          status: 'runnable',
          directionId: direction.id,
          source: 'planner-note',
          reason: 'planner note claims a proof; verify and book it in this session'
        });
      }
    }
    const killIntentIds = Array.isArray(result?.structured?.killIntentIds)
      ? result.structured.killIntentIds.map((id) => text(id)).filter(Boolean).slice(0, 8)
      : [];
    for (const intentId of killIntentIds) {
      workingState = await this.killIntent(session, workingState, intentId, agent, now);
    }
    const steers = Array.isArray(result?.structured?.steers) ? result.structured.steers.slice(0, 8) : [];
    const steerResults = [];
    for (const steer of steers) {
      const intentId = text(steer?.intentId);
      const message = text(steer?.message);
      if (!intentId || !message) continue;
      steerResults.push({ intentId, applied: await this.steerIntent(session, workingState, intentId, message, now) });
    }
    const todos = Array.isArray(result?.structured?.todos)
      ? result.structured.todos.map((todo) => ({
        content: text(todo?.content).slice(0, 300),
        status: text(todo?.status).slice(0, 30) || 'pending'
      })).filter((todo) => todo.content).slice(-50)
      : null;
    const goalMet = result?.structured?.goalMet && typeof result.structured.goalMet === 'object'
      ? result.structured.goalMet
      : null;
    if (this.config.strictPlanner && goalMet && typeof session.proveGoal === 'function') {
      try {
        workingState = await session.proveGoal({
          goalId: text(goalMet.goalId) || text(state?.goal?.id),
          evidenceId: text(goalMet.evidenceId),
          reason: text(goalMet.reason) || 'planner proved goal'
        });
      } catch (error) {
        this.warn(`planner goal proof rejected: ${error?.message || error}`);
      }
    }
    return { state: workingState, hypotheses, goalMet, todos, steerResults };
  }

  async tick() {
    if (this.ticking) return { skipped: 'tick-in-flight' };
    this.ticking = true;
    const results = [];
    try {
      for (const agent of this.listRootAgents()) {
        try {
          results.push(await this.runForAgent(agent));
        } catch (error) {
          this.warn(`tick ${agent?.id}: ${error?.message || error}`);
          results.push({ sessionId: agent?.id, error: text(error?.message || error) });
        }
      }
    } finally {
      this.ticking = false;
    }
    return { sessions: results.length, results };
  }

  nativeGoalCheck(agent, board) {
    const seen = board?.nativeGoalSeen === true;
    if (!this.goals || typeof this.goals.get !== 'function') {
      // A composition without the native goal service still runs on the v4
      // goal alone; it never creates a native goal.
      return { ok: true, seen };
    }
    let goal;
    try { goal = this.goals.get(agent); } catch { goal = undefined; }
    if (goal) {
      return { ok: text(goal.phase) === 'active', seen: true, goal };
    }
    // If a native goal existed before and is now gone, the human deleted it:
    // never recreate it and stop dispatching. A session that never had one may
    // run on the v4 goal alone.
    return { ok: seen !== true, seen, missing: true };
  }

  /**
   * A reproduced critical/high RCE is the objective. Attach the proof even for
   * sessions that were audited before this rule existed, so restarting the
   * host heals `goal.proofs=0` instead of waiting for another audit run.
   */
  async maybeAutoProve(session, state) {
    if (!state?.goal || (state.goal.proofs || []).length > 0) return state;
    const finding = (state.findings || []).find((item) =>
      item && item.deleted !== true
      && ['critical', 'high'].includes(text(item.severity).toLowerCase())
      && text(item.impactProven).toLowerCase() === 'rce'
      && (state.validations || []).some((validation) =>
        text(validation.findingId) === text(item.id) && text(validation.verdict) === 'reproduced'));
    if (!finding) return state;
    try {
      return await session.proveGoal({
        goalId: text(state.goal.id) || 'goal-1',
        evidenceId: finding.id,
        reason: 'validated RCE proof auto-attached by Coordinator'
      });
    } catch {
      return state;
    }
  }

  fallbackDue(sessionId, now) {
    // Strict ARTEX has exactly one intent source: the Planner. A deterministic
    // fallback would make the rule engine the planner again.
    if (this.config.strictPlanner) return false;
    if (!this.config.plannerEnabled) return true;
    if (!this.subagents || typeof this.subagents.startActivation !== 'function') return true;
    const runtime = this.plannerRuntimeOf(sessionId);
    if (runtime.degraded) return true;
    return false;
  }

  /**
   * Strict ARTEX: deterministic proposals are candidates until the Planner
   * accepts them. If the Planner is unavailable or has failed, promote one
   * highest-priority candidate as an explicitly labelled fallback direction so
   * the worker pool does not sit idle forever.
   */
  async applyFallbackDirections(session, state, derived, now) {
    const candidates = (derived?.candidates || [])
      .filter((item) => text(item.status) === 'candidate')
      .slice()
      .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0))
      .slice(0, 1);
    let workingState = state;
    const hypotheses = [];
    for (const candidate of candidates) {
      const question = text(candidate.claim).trim();
      if (!question) continue;
      const key = comparable(question);
      if ((workingState.directions || []).some((direction) => direction && direction.deleted !== true && comparable(direction.question) === key)) continue;
      const priority = clamp(Number(candidate.priorityBase) || Number(candidate.priority) || 5, 1, 100);
      const next = await session.addDirection({
        axis: Array.isArray(candidate.axis) && candidate.axis.length > 0 ? candidate.axis : ['surface'],
        question,
        doneWhen: text(candidate.doneWhen).slice(0, 400) || `取得可复现证据并判定成立，或明确排除：${question.slice(0, 120)}`,
        stage: 'probe',
        priority,
        origin: 'fallback'
      });
      const direction = (next.directions || []).find((entry) => comparable(entry.question) === key) || (next.directions || []).at(-1);
      workingState = next;
      if (!direction) continue;
      hypotheses.push({
        ...candidate,
        status: 'runnable',
        priority,
        priorityBase: priority,
        directionId: direction.id,
        source: 'fallback',
        reason: 'planner unavailable; deterministic fallback'
      });
    }
    return { state: workingState, hypotheses };
  }

  /**
   * Merge duplicate findings by semantic dedupe key. Workers often submit the
   * same auth-bypass/credential leak under different titles; leaving all of
   * them unverified makes the board look like 15 vulnerabilities and hides the
   * one RCE that matters.
   */
  async consolidateFindings(session, state, now) {
    const findings = (state.findings || []).filter((item) => item && item.deleted !== true);
    if (findings.length < 2) return state;
    const host = (text(state.goal?.target).match(/https?:\/\/([^/:\s]+)/i) || [])[1] || '';
    const groups = new Map();
    for (const finding of findings) {
      const key = inferFindingDedupeKey(finding, host);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(finding);
    }
    const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
    const impactRank = { rce: 5, write: 4, read: 3, info: 2, none: 1 };
    let changed = false;
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      group.sort((a, b) =>
        (text(b.status) === 'confirmed' ? 1 : 0) - (text(a.status) === 'confirmed' ? 1 : 0)
        || (impactRank[text(b.impactProven)] || 0) - (impactRank[text(a.impactProven)] || 0)
        || (severityRank[text(b.severity)] || 0) - (severityRank[text(a.severity)] || 0)
        || (b.evidenceIds || []).length - (a.evidenceIds || []).length);
      const target = group[0];
      for (const source of group.slice(1)) {
        try {
          await session.run({ type: 'finding', op: 'merge', id: target.id, sourceId: source.id, now });
          changed = true;
        } catch { /* keep both if the merge rule rejects it */ }
      }
      const maxSeverity = group.map((item) => text(item.severity)).sort((a, b) => (severityRank[b] || 0) - (severityRank[a] || 0))[0];
      const maxImpact = group.map((item) => text(item.impactProven)).sort((a, b) => (impactRank[b] || 0) - (impactRank[a] || 0))[0];
      try {
        await session.run({ type: 'finding', op: 'rate', id: target.id, severity: maxSeverity, impactProven: maxImpact, now });
      } catch { /* rating is best-effort */ }
    }
    return changed ? session.read() : state;
  }

  async stopActiveTasks(session, state, agent) {
    const active = (state.tasks || []).filter((task) =>
      ['queued', 'running', 'claimed'].includes(text(task.state)));
    if (active.length === 0) return state;
    for (const task of active) {
      try {
        await session.run({
          type: 'task', op: 'cancel', id: task.id,
          reason: 'objective proven; stop remaining workers', now: this.now()
        });
      } catch { /* task may have completed */ }
    }
    if (this.subagents && typeof this.subagents.interrupt === 'function') {
      for (const task of active) {
        if (!task.childId) continue;
        try { await this.subagents.interrupt(task.childId, { kind: 'ancestor', agent }); } catch { /* best effort */ }
      }
    }
    return session.read();
  }

  async cancelFallbackWork(session, state, agent) {
    const fallbackDirections = new Set((state.directions || [])
      .filter((direction) => text(direction.origin) === 'fallback' && direction.deleted !== true)
      .map((direction) => text(direction.id)));
    if (fallbackDirections.size === 0) return state;
    const active = (state.tasks || []).filter((task) =>
      ['queued', 'running', 'claimed'].includes(text(task.state))
      && fallbackDirections.has(text(task.directionId)));
    for (const task of active) {
      try {
        await session.run({
          type: 'task', op: 'cancel', id: task.id,
          reason: 'planner is available; fallback work stopped', now: this.now()
        });
      } catch { /* task may have completed */ }
    }
    if (this.subagents && typeof this.subagents.interrupt === 'function') {
      for (const task of active) {
        if (!task.childId) continue;
        try { await this.subagents.interrupt(task.childId, { kind: 'ancestor', agent }); } catch { /* best effort */ }
      }
    }
    for (const directionId of fallbackDirections) {
      const direction = (state.directions || []).find((item) => text(item.id) === directionId);
      try {
        await session.run({
          type: 'direction', op: 'update', id: directionId,
          ...(['open', 'running'].includes(text(direction?.state)) ? { state: 'blocked' } : {}),
          deleted: true,
          reason: 'planner is available; fallback direction retired', now: this.now()
        });
      } catch { /* best effort */ }
    }
    return session.read();
  }

  async killIntent(session, state, intentId, agent, now = this.now()) {
    const direction = (state.directions || []).find((item) => text(item.id) === text(intentId));
    if (!direction) return state;
    const task = (state.tasks || []).find((item) =>
      ACTIVE_TASK_STATES.has(text(item.state)) && text(item.directionId) === text(intentId));
    if (task) {
      try {
        await session.run({ type: 'task', op: 'cancel', id: task.id, reason: 'planner kill_work', now });
      } catch { /* task may have settled */ }
      if (task.childId && this.subagents && typeof this.subagents.interrupt === 'function') {
        try { await this.subagents.interrupt(task.childId, { kind: 'ancestor', agent }); } catch { /* best effort */ }
      }
    }
    try {
      await session.run({ type: 'direction', op: 'update', id: direction.id, state: 'blocked', reason: 'planner kill_work', now });
    } catch { /* already terminal */ }
    if (this.runtime) {
      try { await this.runtime.killIntent(state.sessionId || '', direction.id, now); } catch { /* best effort */ }
    }
    return session.read();
  }

  async steerIntent(session, state, intentId, message, now = this.now()) {
    const task = (state.tasks || []).find((item) =>
      ACTIVE_TASK_STATES.has(text(item.state)) && text(item.directionId) === text(intentId));
    if (!task || !task.childId) return false;
    const send = this.subagents?.sendMessage || this.subagents?.steer || this.subagents?.send;
    if (typeof send !== 'function') {
      // DSH may not expose a mid-run message API. Degrade explicitly: stop the
      // current task and requeue the same intent with the steer directive in the
      // fresh worker prompt. This is not mid-run delivery, and the runtime log
      // records that fact.
      try {
        await session.run({ type: 'task', op: 'cancel', id: task.id, reason: 'planner steer fallback: kill+requeue', now });
        if (task.childId && this.subagents && typeof this.subagents.interrupt === 'function') {
          try { await this.subagents.interrupt(task.childId, { kind: 'ancestor', agent }); } catch { /* best effort */ }
        }
        const direction = (state.directions || []).find((item) => text(item.id) === text(intentId));
        if (direction) {
          await session.run({ type: 'direction', op: 'update', id: direction.id, state: 'blocked', reason: 'planner steer fallback', now });
          await session.addDirection({
            axis: direction.axis || ['surface'],
            question: text(direction.question),
            doneWhen: text(direction.doneWhen),
            stage: text(direction.stage) || 'probe',
            priority: Number(direction.priority) || 5,
            origin: 'planner',
            assets: direction.assets || [],
            parents: direction.parents || [],
            directive: message
          });
        }
        if (this.runtime) await this.runtime.steerIntent(state.sessionId || '', intentId, `${message} [fallback: kill+requeue]`, now);
        this.warn(`steer ${intentId}: no subagent message API, degraded to kill+requeue`);
        return true;
      } catch (error) {
        this.warn(`steer fallback ${intentId}: ${error?.message || error}`);
        return false;
      }
    }
    try {
      await send.call(this.subagents, task.childId, { message, kind: 'planner-steer', now });
      if (this.runtime) await this.runtime.steerIntent(state.sessionId || '', intentId, message, now);
      return true;
    } catch (error) {
      this.warn(`steer ${intentId}: ${error?.message || error}`);
      return false;
    }
  }

  async runForAgent(agent) {
    const sessionId = text(agent?.id);
    if (!sessionId || this.inflight.has(sessionId)) return { sessionId, skipped: 'inflight' };
    this.inflight.add(sessionId);
    try {
      const session = await this.getSession(sessionId);
      let state = await session.read();
      if (!state?.goal) return { sessionId, skipped: 'no-v4-goal' };
      if (this.runtime) {
        try { await this.runtime.sync(sessionId, state, this.now()); } catch (error) { this.warn(`runtime sync: ${error?.message || error}`); }
      }
      let runtimePhase = '';
      if (this.runtime) {
        try { runtimePhase = text((await this.runtime.read(sessionId))?.phase); } catch { runtimePhase = ''; }
        if (runtimePhase === 'settling' || runtimePhase === 'done') {
          state = await this.stopActiveTasks(session, state, agent);
        }
      }
      state = await this.ensureSettings(session, state);
      state = await this.consolidateFindings(session, state, this.now());
      if (!this.config.strictPlanner) state = await this.maybeAutoProve(session, state);
      if (text(state.goal.phase) === 'done') state = await this.stopActiveTasks(session, state, agent);
      if (this.config.strictPlanner
        && !this.fallbackDue(sessionId, this.now())
        && (state.directions || []).some((direction) =>
          text(direction.origin) === 'fallback' && ['open', 'running'].includes(text(direction.state)))) {
        state = await this.cancelFallbackWork(session, state, agent);
      }
      const now = this.now();
      const existingBoard = normalizeBoard((await this.store.read(sessionId)) || { ...emptyBoard(sessionId), sessionId });
      const native = this.nativeGoalCheck(agent, existingBoard);
      if (!native.ok) {
        if (!native.missing) await this.drainAudit(session, state, agent);
        if (existingBoard.debrief?.stateRevision === Number(state.revision)
          && existingBoard.debrief?.phase === text(state.goal.phase)) {
          return { sessionId, skipped: native.missing ? 'native-goal-deleted-unchanged' : 'native-goal-not-active-unchanged' };
        }
        await this.persist(sessionId, {
          ...existingBoard,
          nativeGoalSeen: native.seen,
          debrief: buildDebrief({ state, board: existingBoard, now, round: existingBoard.round })
        });
        return { sessionId, skipped: native.missing ? 'native-goal-deleted' : 'native-goal-not-active' };
      }
      if (text(state.goal.phase) !== 'active') {
        // A paused session is a terminal state for scheduling. Persisting a new
        // debrief every 3s kept a 1.5 MB board at revision 1917 for 14 hours;
        // only write when the canonical revision or phase actually changed.
        // Audit debt still drains while paused; the audit run itself is
        // single-flight and never dispatches workers.
        if (text(state.goal.phase) === 'paused') await this.drainAudit(session, state, agent);
        if (existingBoard.debrief?.stateRevision === Number(state.revision)
          && existingBoard.debrief?.phase === text(state.goal.phase)) {
          return { sessionId, skipped: `v4-goal-${text(state.goal.phase) || 'unknown'}-unchanged` };
        }
        await this.persist(sessionId, {
          ...existingBoard,
          nativeGoalSeen: native.seen,
          debrief: buildDebrief({ state, board: existingBoard, now, round: existingBoard.round })
        });
        return { sessionId, skipped: `v4-goal-${text(state.goal.phase) || 'unknown'}` };
      }
      if (!text(state.goal.authorization).trim()) {
        await this.drainAudit(session, state, agent);
        const decisions = this.appendDecision(existingBoard, makeDecision({
          action: 'waiting_authorization',
          reason: 'authorization/red-line is empty; dispatch is blocked',
          stateRevision: state.revision,
          boardRevision: existingBoard.revision,
          now,
          round: existingBoard.round
        }));
        await this.persist(sessionId, {
          ...existingBoard,
          nativeGoalSeen: native.seen,
          decisions,
          debrief: buildDebrief({ state, board: existingBoard, now, round: existingBoard.round })
        });
        return { sessionId, skipped: 'no-authorization' };
      }

      const syncedTree = this.syncOutcomes(existingBoard.hypothesisTree, state, now);
      // Older planner rounds stored `priority` but not `priorityBase`, leaving
      // planner notes at axis weight 24 and letting auth-flow 42 win. Heal the
      // persisted board on the next tick so even pre-fix sessions dispatch
      // planner/proof directions first.
      const boostedTree = syncedTree.map((hypothesis) => {
        const source = text(hypothesis?.source);
        if (source !== 'planner' && source !== 'planner-note') return hypothesis;
        const floor = source === 'planner-note' ? 100 : 80;
        const current = Number(hypothesis.priorityBase) || 0;
        return current >= floor ? hypothesis : { ...hypothesis, priorityBase: floor };
      });
      let board = normalizeBoard({
        ...existingBoard,
        sessionId,
        hypothesisTree: boostedTree,
        nativeGoalSeen: native.seen
      });
      const plannerRuntime = this.plannerRuntimeOf(sessionId);
      board = normalizeBoard({
        ...board,
        plannerAttempts: plannerRuntime.attempts,
        plannerDegraded: plannerRuntime.degraded,
        plannerError: plannerRuntime.lastError,
        plannerLastDurationMs: plannerRuntime.lastDurationMs
      });
      const decisions = [];
      const planned = this.consumePlannerResult(sessionId);
      if (planned) {
        const applied = await this.applyPlannerDirections(session, state, board, planned.result, now, agent);
        state = applied.state;
        if (applied.todos) board = normalizeBoard({ ...board, plannerTodos: applied.todos });
        if (text(state.goal.phase) === 'done') state = await this.stopActiveTasks(session, state, agent);
        if (this.config.strictPlanner) state = await this.cancelFallbackWork(session, state, agent);
        if (applied.hypotheses.length > 0) {
          board = normalizeBoard({
            ...board,
            hypothesisTree: mergeCandidateHypotheses(board.hypothesisTree, applied.hypotheses, now, this.config.maxHypotheses)
          });
        }
        const runtime = this.plannerRuntimeOf(sessionId);
        const stalled = this.config.strictPlanner
          && applied.hypotheses.length === 0
          && !(state.directions || []).some((direction) =>
            direction.deleted !== true && ['open', 'running'].includes(text(direction.state)));
        if (stalled) runtime.nextAt = now + this.config.plannerRetryDelayMs;
        runtime.attempts = 0;
        runtime.degraded = false;
        runtime.lastError = '';
        runtime.lastResultAt = now;
        board = normalizeBoard({
          ...board,
          lastPlannerAt: now,
          lastPlannerSignature: this.plannerSignature(state),
          plannerRound: (board.plannerRound || 0) + 1,
          plannerEmptyRounds: applied.hypotheses.length === 0 ? (board.plannerEmptyRounds || 0) + 1 : 0,
          plannerStalled: stalled,
          plannerError: '',
          plannerAttempts: 0,
          plannerDegraded: false,
          plannerLastDurationMs: planned.durationMs,
          plannerModel: text(planned.result?.structured?.model || '')
        });
        decisions.push(makeDecision({
          action: 'planner_round',
          reason: `planner proposed ${applied.hypotheses.length} direction(s)`,
          stateRevision: state.revision,
          boardRevision: board.revision,
          now,
          round: board.round,
          inputs: {
            directions: applied.hypotheses.map((item) => item.claim),
            durationMs: planned.durationMs,
            model: board.plannerModel
          }
        }));
        if (stalled) {
          decisions.push(makeDecision({
            action: 'planner_stalled',
            reason: 'planner returned 0 while the goal is unmet and the frontier is empty; retrying planner',
            stateRevision: state.revision,
            boardRevision: board.revision,
            now,
            round: board.round,
            inputs: { retryDelayMs: this.config.plannerRetryDelayMs }
          }));
        }
      }
      if (text(state.goal.phase) === 'done') {
        board = normalizeBoard({
          ...board,
          decisions: [...board.decisions, ...decisions].slice(-this.config.maxDecisions),
          debrief: buildDebrief({ state, board, now, round: board.round + 1 })
        });
        const persisted = await this.persist(sessionId, bumpRound(board, now));
        return { sessionId, skipped: 'goal-done', dispatched: 0, boardRevision: persisted?.revision };
      }
      const derived = deriveFromBoard({
        state,
        board,
        now,
        maxHypotheses: this.config.maxHypotheses,
        candidateOnly: this.config.strictPlanner,
        generateCandidates: !this.config.strictPlanner
      });
      board = normalizeBoard({
        ...board,
        targetMap: derived.targetMap,
        hypothesisTree: derived.hypothesisTree,
        priorityQueue: derived.priorityQueue,
        debrief: derived.debrief
      });
      let fallbackHypotheses = [];
      if (this.fallbackDue(sessionId, now)) {
        const fallback = await this.applyFallbackDirections(session, state, derived, now);
        state = fallback.state;
        fallbackHypotheses = fallback.hypotheses;
        if (fallbackHypotheses.length > 0) {
          this.plannerRuntimeOf(sessionId).fallbackCreated = true;
          board = normalizeBoard({
            ...board,
            hypothesisTree: mergeCandidateHypotheses(board.hypothesisTree, fallbackHypotheses, now, this.config.maxHypotheses)
          });
          decisions.push(makeDecision({
            action: 'fallback_created',
            reason: `planner unavailable; created ${fallbackHypotheses.length} fallback direction(s)`,
            stateRevision: state.revision,
            boardRevision: board.revision,
            now,
            round: board.round,
            inputs: { directions: fallbackHypotheses.map((item) => item.claim) }
          }));
        }
      }

      const maxWorkers = Math.min(
        this.config.maxWorkers,
        clamp(state.settings?.workerLimit ?? 6, 1, 6)
      );
      const activeTasks = (state.tasks || []).filter((task) => ACTIVE_TASK_STATES.has(text(task.state)));
      let freeWorkers = Math.max(0, maxWorkers - activeTasks.length);
      const attachments = new Map();
      const dispatcher = this.dispatcherFactory({
        session,
        subagents: this.subagents,
        agent,
        cwd: state.goal.workdir || process.cwd(),
        provider: 'spawn',
        maxWorkers,
        maxDurationMs: this.config.maxDurationMs,
        promptBuilder: (args) => buildStcsWorkerPrompt({
          ...args,
          attachment: attachments.get(text(args?.direction?.id)) || null
        }),
        retireOnSettle: true,
        onEvidence: this.indexEvidence ? this.indexEvidence(sessionId) : undefined,
        onCommit: (info) => { void this.handleCommit(agent, info); }
      });
      let workingState = state;
      if (this.runtime) {
        try { await this.runtime.sync(sessionId, workingState, now); } catch (error) { this.warn(`runtime pre-dispatch sync: ${error?.message || error}`); }
      }
      const dispatchable = this.config.strictPlanner
        ? [
            ...(derived.runnable || []).filter((hypothesis) =>
              ['planner', 'planner-note', 'planner-accepted'].includes(text(hypothesis.source))),
            ...fallbackHypotheses
          ]
        : [...(derived.runnable || []), ...fallbackHypotheses];
      for (const hypothesis of dispatchable) {
        if (freeWorkers <= 0 || runtimePhase === 'settling' || runtimePhase === 'done') break;
        const ensured = await this.ensureDirection({
          session,
          state: workingState,
          hypothesis,
          targetMap: derived.targetMap,
          tree: board.hypothesisTree,
          now,
          origin: ['planner', 'planner-note', 'planner-accepted'].includes(text(hypothesis.source))
            ? 'planner'
            : (text(hypothesis.source) === 'fallback' ? 'fallback' : 'derive')
        });
        workingState = ensured.state;
        if (!ensured.direction) continue;
        const activeForDirection = (workingState.tasks || []).some((task) =>
          ACTIVE_TASK_STATES.has(text(task.state)) && text(task.directionId) === text(ensured.direction.id));
        if (activeForDirection) continue;
        const attachment = selectMinimalAttachment({
          state: workingState,
          hypothesis,
          cwd: workingState.goal.workdir || process.cwd(),
          maxBytes: this.config.maxAttachmentBytes
        });
        attachments.set(text(ensured.direction.id), attachment);
        if (ensured.created) {
          decisions.push(makeDecision({
            action: 'create_hypothesis',
            hypothesisId: hypothesis.id,
            directionId: ensured.direction.id,
            reason: hypothesis.reason || 'runnable hypothesis promoted to direction',
            hypothesis,
            stateRevision: workingState.revision,
            boardRevision: board.revision,
            inputs: {
              endpointId: hypothesis.endpointId || '',
              dependsOn: hypothesis.dependsOn || []
            },
            now,
            round: board.round
          }));
        }
        decisions.push(makeDecision({
          action: 'promote_direction',
          hypothesisId: hypothesis.id,
          directionId: ensured.direction.id,
          reason: 'runnable hypothesis',
          stateRevision: workingState.revision,
          boardRevision: board.revision,
          now,
          round: board.round
        }));
        let runtimeWorker = '';
        if (this.runtime) {
          try {
            await this.runtime.sync(sessionId, workingState, now);
            const claimed = await this.runtime.claim(sessionId, ensured.direction.id, now);
            runtimeWorker = text(Object.values(claimed?.workers || {}).find((worker) =>
              text(worker.intentId) === text(ensured.direction.id) && text(worker.state) === 'claimed')?.id);
          } catch (error) {
            this.warn(`runtime claim ${ensured.direction.id}: ${error?.message || error}`);
          }
          if (!runtimeWorker) continue;
        }
        let assigned;
        try {
          assigned = await dispatcher.assign(ensured.direction.id, { agentPreset: this.config.workerPreset });
        } catch (error) {
          const message = text(error?.message || error);
          if (/Unknown agent preset/i.test(message) && this.config.workerPreset) {
            try {
              assigned = await dispatcher.assign(ensured.direction.id);
            } catch (retryError) {
              decisions.push(makeDecision({
                action: 'dispatch_failed',
                hypothesisId: hypothesis.id,
                directionId: ensured.direction.id,
                reason: text(retryError?.message || retryError),
                stateRevision: workingState.revision,
                boardRevision: board.revision,
                now,
                round: board.round
              }));
              if (runtimeWorker && this.runtime) await this.runtime.release(sessionId, runtimeWorker, now);
              continue;
            }
          } else {
            decisions.push(makeDecision({
              action: 'dispatch_failed',
              hypothesisId: hypothesis.id,
              directionId: ensured.direction.id,
              reason: message,
              stateRevision: workingState.revision,
              boardRevision: board.revision,
              now,
              round: board.round
            }));
            if (runtimeWorker && this.runtime) await this.runtime.release(sessionId, runtimeWorker, now);
            continue;
          }
        }
        freeWorkers -= 1;
        if (this.runtime && runtimeWorker && assigned) {
          try {
            await this.runtime.bind(sessionId, runtimeWorker, assigned.taskId, assigned.childId, now);
          } catch (error) {
            this.warn(`runtime bind ${runtimeWorker}: ${error?.message || error}`);
          }
        }
        board = { ...board, lastDispatchAt: now };
        board = { ...board, hypothesisTree: markRunning(board.hypothesisTree, hypothesis.id, ensured.direction.id, now) };
        decisions.push(makeDecision({
          action: 'dispatch',
          hypothesisId: hypothesis.id,
          directionId: ensured.direction.id,
          taskId: assigned.taskId,
          reason: `worker ${assigned.taskId} started`,
          stateRevision: workingState.revision,
          boardRevision: board.revision,
          inputs: { childId: assigned.childId || '' },
          now,
          round: board.round
        }));
      }

      // Audit debt is drained by this coordinator-owned store/queue; the old
      // pentest tick skips artex sessions. Paused sessions still drain audit
      // debt through the early returns above.
      await this.drainAudit(session, workingState, agent);

      board = normalizeBoard({
        ...board,
        decisions: [...board.decisions, ...decisions].slice(-this.config.maxDecisions),
        debrief: buildDebrief({ state: workingState, board, now, round: board.round + 1 })
      });
      // Start the next planner round only after this tick has dispatched, so
      // the worker pool is never blocked by a model call.
      if (runtimePhase !== 'settling' && runtimePhase !== 'done'
        && this.startPlannerTask(agent, session, workingState, board, now)) {
        const runtime = this.plannerRuntimeOf(sessionId);
        board = normalizeBoard({
          ...board,
          plannerAttempts: runtime.attempts,
          plannerDegraded: runtime.degraded,
          plannerError: runtime.lastError
        });
        decisions.push(makeDecision({
          action: 'planner_started',
          reason: `planner attempt ${runtime.attempts}`,
          stateRevision: workingState.revision,
          boardRevision: board.revision,
          now,
          round: board.round
        }));
        board = normalizeBoard({
          ...board,
          decisions: [...board.decisions, ...decisions].slice(-this.config.maxDecisions)
        });
      }
      const persisted = await this.persist(sessionId, bumpRound(board, now));
      if (this.reproject) {
        try { await this.reproject(sessionId); } catch { /* projection self-heals */ }
      }
      return {
        sessionId,
        skipped: '',
        dispatched: decisions.filter((item) => item.action === 'dispatch').length,
        decisions: decisions.length,
        boardRevision: persisted?.revision
      };
    } finally {
      this.inflight.delete(sessionId);
    }
  }

  async ensureSettings(session, state) {
    const settings = state?.settings || {};
    if (settings.autoAudit === false && settings.autoDispatch === false) return state;
    try {
      return await session.run({ type: 'settings', op: 'set', autoAudit: false, autoDispatch: false });
    } catch (error) {
      this.warn(`settings ${session?.sessionId || ''}: ${error?.message || error}`);
      return state;
    }
  }

  async ensureDirection({ session, state, hypothesis, targetMap, tree = [], now, origin = '' }) {
    const existingId = text(hypothesis.directionId);
    if (existingId) {
      const existing = (state.directions || []).find((item) => text(item.id) === existingId);
      if (existing && existing.deleted !== true) return { state, direction: existing, created: false };
    }
    const key = comparable(hypothesis.claim);
    const duplicate = (state.directions || []).find((item) =>
      item.deleted !== true && ['open', 'running'].includes(text(item.state)) && comparable(item.question) === key);
    if (duplicate) return { state, direction: duplicate, created: false };
    try {
      const next = await session.addDirection({
        axis: hypothesis.axis.length > 0 ? hypothesis.axis : ['surface'],
        question: hypothesis.claim,
        doneWhen: doneWhenFor(hypothesis, targetMap),
        stage: 'probe',
        priority: Number(hypothesis.priority) || 5,
        origin: text(origin) || 'derive',
        parents: (hypothesis.dependsOn || [])
          .map((id) => (tree || []).find((node) => node.id === id)?.directionId)
          .filter(Boolean)
      });
      const direction = (next.directions || []).find((item) => comparable(item.question) === key)
        || (next.directions || []).at(-1);
      return { state: next, direction, created: true };
    } catch (error) {
      if (/duplicate direction/i.test(text(error?.message || error))) {
        const next = await session.read();
        const existing = (next.directions || []).find((item) => item.deleted !== true && comparable(item.question) === key);
        if (existing) return { state: next, direction: existing, created: false };
      }
      this.warn(`direction for ${hypothesis.id}: ${error?.message || error}`);
      return { state, direction: null, created: false };
    }
  }

  syncOutcomes(tree, state, now) {
    let next = (tree || []).map((item) => normalizeHypothesis(item, now));
    for (const original of [...next]) {
      const node = next.find((item) => item.id === original.id);
      if (!node) continue;
      if (!node.directionId) {
        if (node.status === 'running') {
          node.status = 'runnable';
          node.updatedAt = now;
        }
        continue;
      }
      const direction = (state.directions || []).find((item) => text(item.id) === node.directionId);
      if (!direction) {
        node.directionId = '';
        node.status = 'runnable';
        node.updatedAt = now;
        continue;
      }
      if (TERMINAL_DIRECTIONS.has(text(direction.state))) {
        next = markDirectionOutcome(next, direction.id, direction.state, {
          now,
          evidenceRefs: evidenceRefsForDirection(state, direction),
          findingIds: findingIdsForDirection(state, direction.id)
        });
        continue;
      }
      const tasks = (state.tasks || []).filter((task) => text(task.directionId) === text(direction.id));
      const active = tasks.some((task) => ACTIVE_TASK_STATES.has(text(task.state)));
      if (!active && node.status === 'running') {
        node.status = 'runnable';
        node.updatedAt = now;
      }
    }
    return next;
  }

  async handleCommit(agent, info = {}) {
    try {
      const sessionId = text(agent?.id);
      if (!sessionId) return;
      const session = await this.getSession(sessionId);
      const state = await session.read();
      if (!state?.goal) return;
      const board = normalizeBoard((await this.store.read(sessionId)) || emptyBoard(sessionId));
      const direction = (state.directions || []).find((item) => text(item.id) === text(info.directionId));
      const directionState = directionStateOfTask(state, info.taskId) || text(direction?.state);
      const tree = markDirectionOutcome(board.hypothesisTree, info.directionId, directionState, {
        now: this.now(),
        evidenceRefs: evidenceRefsForDirection(state, direction),
        findingIds: info.findingIds || findingIdsForDirection(state, info.directionId)
      });
      const decision = makeDecision({
        action: 'complete_hypothesis',
        hypothesisId: board.hypothesisTree.find((item) => text(item.directionId) === text(info.directionId))?.id || '',
        directionId: info.directionId,
        taskId: info.taskId,
        status: directionState === 'blocked' ? 'blocked' : 'done',
        reason: text(direction?.conclusion?.answer || directionState).slice(0, 400),
        evidenceRefs: evidenceRefsForDirection(state, direction),
        stateRevision: state.revision,
        boardRevision: board.revision,
        now: this.now(),
        round: board.round
      });
      const next = normalizeBoard({
        ...board,
        hypothesisTree: tree,
        decisions: [...board.decisions, decision].slice(-this.config.maxDecisions),
        debrief: buildDebrief({ state, board: { ...board, hypothesisTree: tree }, now: this.now(), round: board.round + 1 })
      });
      await this.persist(sessionId, bumpRound(next, this.now()));
      await this.drainAudit(session, state, agent);
    } catch (error) {
      this.warn(`commit ${agent?.id}: ${error?.message || error}`);
    } finally {
      queueMicrotask(() => { void this.tick(); });
    }
  }

  appendDecision(board, decision) {
    return [...(board?.decisions || []), decision].slice(-this.config.maxDecisions);
  }

  async persist(sessionId, board) {
    const next = normalizeBoard(board);
    return this.store.update(sessionId, (current) => mergeBoards(current, next));
  }

  async describe(sessionId) {
    const session = await this.getSession(sessionId);
    const state = await session.read();
    const board = normalizeBoard((await this.store.read(sessionId)) || emptyBoard(sessionId));
    const tiers = summarizeTiers(state);
    const active = (state?.tasks || []).filter((task) => ACTIVE_TASK_STATES.has(text(task.state)));
    const maxWorkers = Math.min(this.config.maxWorkers, clamp(state?.settings?.workerLimit ?? 6, 1, 6));
    const runtime = this.runtime ? await this.runtime.snapshot(sessionId).catch(() => null) : null;
    return {
      sessionId,
      exists: Boolean(state?.goal),
      goal: state?.goal || null,
      phase: text(state?.goal?.phase),
      counts: {
        facts: (state?.facts || []).filter((item) => item && item.deleted !== true).length,
        findings: (state?.findings || []).filter((item) => item && item.deleted !== true && item.severity !== 'info').length,
        assets: (state?.assets || []).length,
        evidence: (state?.evidence || []).length,
        directions: (state?.directions || []).length,
        coverage: (state?.coverage || []).length
      },
      verdicts: tiers,
      directions: (state?.directions || []).slice(-30).map((item) => ({
        id: item.id,
        state: item.state,
        stage: item.stage,
        origin: text(item.origin) || 'unknown',
        priority: item.priority,
        question: text(item.question).slice(0, 200)
      })),
      pendingAudit: (state?.findings || []).filter((item) =>
        item && item.deleted !== true && text(item.approvalStatus) === 'pending').length,
      workers: {
        limit: maxWorkers,
        active: active.length,
        free: Math.max(0, maxWorkers - active.length),
        tasks: active.slice(-10).map((task) => ({
          id: task.id,
          directionId: task.directionId,
          state: task.state,
          childId: task.childId
        }))
      },
      board: boardSummary(board),
      runtime: runtime ? {
        taskId: runtime.taskId,
        phase: runtime.phase,
        planner: runtime.planner,
        intents: Object.values(runtime.intents || {}).slice(-40),
        workers: Object.values(runtime.workers || {}),
        digest: runtime.digest
      } : null,
      roles: {
        planner: {
          transport: 'visible-teammate',
          round: board.plannerRound,
          lastAt: board.lastPlannerAt,
          error: board.plannerError || '',
          attempts: board.plannerAttempts,
          degraded: board.plannerDegraded,
          lastDurationMs: board.plannerLastDurationMs,
          model: board.plannerModel || ''
        },
        workers: {
          transport: 'fresh-subagent',
          active: active.length,
          dispatchedBy: 'coordinator'
        },
        auditor: state?.roles?.auditor || null,
        reporter: state?.roles?.reporter || null
      },
      decisions: board.decisions.slice(-20),
      decisionDigest: board.decisions.length > 0 ? decisionDigest(board.decisions) : '',
      report: state?.report || null,
      policy: {
        mainSessionReadOnly: true,
        targetOwner: 'user',
        reportOnDemand: true,
        plannerTransport: 'visible-teammate',
        auditorTransport: 'visible-teammate'
      }
    };
  }

  async drainAudit(session, state, agent) {
    if (!this.auditPendingFor) return;
    const sessionId = text(session?.sessionId || agent?.id);
    if (!sessionId || this.auditInflight.has(sessionId)) return;
    this.auditInflight.add(sessionId);
    const release = () => { this.auditInflight.delete(sessionId); };
    try {
      // Re-read so a validation written by the previous auditor run is visible
      // before selecting candidates again.
      const fresh = typeof session?.read === 'function' ? await session.read() : state;
      const result = this.auditPendingFor({
        session,
        state: fresh || state,
        agent,
        force: true,
        clearCooldown: false,
        timeoutMs: this.config.auditTimeoutMs
      });
      if (result?.run && typeof result.run.finally === 'function') {
        void result.run.finally(release);
        return;
      }
      release();
    } catch (error) {
      release();
      this.warn(`audit ${agent?.id}: ${error?.message || error}`);
    }
  }

  warn(message) {
    try { this.logger?.warn?.(`stcs: ${message}`); } catch { /* logger is optional */ }
  }
}
