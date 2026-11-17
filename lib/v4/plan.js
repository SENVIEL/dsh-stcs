/**
 * v4 确定性 planner：只回答"下一步做什么"，不改状态。
 *
 * 对齐 ARTEX 的三个不变量：
 * - goal 未证明 + frontier 为空 => mustGenerate；
 * - planner 只消费候选/缺口，不凭空造方向；
 * - 方向是 frontier 的唯一来源，调度不再靠 Lead 手写清单。
 */
import { AXES, coverageIsComplete } from './axes.js';

const OPEN_STATES = new Set(['open', 'running']);
const TERMINAL = new Set(['done', 'exhausted', 'blocked', 'empty']);
const DEFAULT_WORKER_LIMIT = 6;
const SECURITY_AXES = new Set(['surface', 'identity', 'config', 'component', 'input', 'logic', 'chain', 'credential', 'infra']);

// Report indexing, delivery and cleanup are Lead tasks. They must never take a
// worker slot from an attack-surface hypothesis; otherwise a long engagement
// spends every worker writing closure documents instead of finding issues.
export function isLeadOnlyDirection(direction) {
  const axes = Array.isArray(direction?.axis) ? direction.axis.map(String) : [];
  if (axes.some((axis) => SECURITY_AXES.has(axis))) return false;
  return axes.some((axis) => axis === 'deliver' || axis === 'cleanup')
    || isLeadOnlyQuestion(direction?.question);
}

export function isLeadOnlyQuestion(text) {
  return /(整理|汇总|收口|报告骨架|证据索引|一致性校验|交付校验|交付物|closeout|report-only|index)/i.test(String(text || ''));
}

const FALLBACK_QUESTIONS = {
  surface: (target) => `${target} 还有哪些未枚举的入口、路由和参数面？`,
  identity: (target) => `${target} 的认证、会话和权限边界是否存在绕过或越权？`,
  config: (target) => `${target} 是否存在暴露的默认配置、调试接口或敏感文件？`,
  component: (target) => `${target} 使用的组件和版本是否存在可利用的已知缺陷？`,
  input: (target) => `${target} 的可写参数是否存在注入、上传或越界处理问题？`,
  logic: (target) => `${target} 的业务流程是否存在可重放、跳过或篡改的状态？`,
  chain: (target) => `已发现的线索能否在 ${target} 上串联成从入口到敏感操作的利用链？`,
  credential: (target) => `${target} 是否存在弱凭据、泄露凭据或可爆破的认证入口？`,
  infra: (target) => `${target} 的基础设施、端口和服务是否存在暴露面？`,
  evidence: () => '当前结论是否有可复现证据和阴性对照？',
  cleanup: (target) => `测试在 ${target} 上产生的账号、文件或状态是否需要清理？`,
  deliver: () => '目标成果是否已达到可交付的证明标准？'
};

function fallbackDirection(goal, axis) {
  const target = goal.target || (Array.isArray(goal.targets) ? goal.targets[0] : '') || '目标';
  const question = (FALLBACK_QUESTIONS[axis] || ((name) => `${name} 的 ${axis} 轴还有哪些未覆盖的问题？`))(target);
  return {
    axis,
    question,
    doneWhen: '得到可复现证据或明确排除该轴',
    fallback: true
  };
}

export function planV4(state) {
  const goal = state.goal || {};
  const directions = state.directions || [];
  const findings = state.findings || [];
  const validations = state.validations || [];
  const coverage = state.coverage || [];
  const goals = state.goals || [];
  const planner = state.planner || {};
  const tasks = state.tasks || [];
  const activeTasks = tasks.filter((task) => ['queued', 'running'].includes(task.state));
  const configuredLimit = Number(state.settings?.workerLimit);
  const workerLimit = Number.isFinite(configuredLimit) ? Math.min(Math.max(Math.round(configuredLimit), 1), 6) : DEFAULT_WORKER_LIMIT;

  if (goal.phase === 'paused' || goal.phase === 'blocked') {
    return {
      paused: true,
      actions: [],
      frontier: [],
      leadOnlyDirections: [],
      candidates: [],
      unvalidated: [],
      coverageGaps: [],
      goals,
      mustGenerate: false
    };
  }

  const frontier = directions
    .filter((direction) => OPEN_STATES.has(direction.state))
    .slice()
    .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
  const workFrontier = frontier.filter((direction) => !isLeadOnlyDirection(direction));
  const leadOnlyDirections = frontier.filter((direction) => !workFrontier.includes(direction));

  const goalsOpen = goals.filter((item) => item.state !== 'met');

  const reproduced = new Set(
    validations
      .filter((item) => item.verdict === 'reproduced'
        && item.validator === 'agent:pentest-auditor'
        && item.superseded !== true)
      .map((item) => item.findingId)
  );
  const unvalidated = findings
    .filter((finding) => finding.severity !== 'info' && finding.deleted !== true && !reproduced.has(finding.id))
    .map((finding) => ({ id: finding.id, claim: finding.claim, severity: finding.severity }));

  const coveredAxes = new Set(
    coverage
      .filter(coverageIsComplete)
      .map((item) => item.axis)
  );
  const coverageGaps = AXES.filter((axis) => !coveredAxes.has(axis));

  const candidates = (planner.candidates || []).filter((item) => item.state === 'proposed');
  const blockedCandidates = (planner.candidates || []).filter((item) => item.state === 'blocked');
  // A blocked candidate is still real work, but it cannot be accepted until
  // its missing prerequisite is supplied. Do not turn that state into an
  // endless "generate another direction" heartbeat.
  const onlyBlockedCandidates = workFrontier.length === 0
    && candidates.length === 0
    && blockedCandidates.length > 0;
  const mustGenerate = goalsOpen.length > 0 && workFrontier.length === 0 && !onlyBlockedCandidates;
  const recentDone = directions
    .filter((direction) => TERMINAL.has(direction.state))
    .slice(-5)
    .map((direction) => ({
      id: direction.id,
      state: direction.state,
      question: direction.question,
      answer: direction.conclusion?.answer || ''
    }));

  const actions = [];
  const workCoverageGaps = coverageGaps.filter((axis) => !['evidence', 'cleanup', 'deliver'].includes(axis));
  // An unmet goal is never "done" just because every axis was ticked. Keep a
  // concrete, testable fallback so an idle unfinished engagement always has
  // a new attack hypothesis to dispatch instead of "等待窗口/本轮不探测".
  const fallback = workCoverageGaps.length > 0
    ? fallbackDirection(goal, workCoverageGaps[0])
    : (goalsOpen.length > 0 ? {
        axis: 'chain',
        question: `${goal.target || '目标'} 的 RCE/高危入口是否还能通过换入口、换协议、换参数或换等价路径进一步验证？请挑一个尚未实测的具体 endpoint 和参数，发请求取响应并落证据。`,
        doneWhen: '拿到该入口的可复现响应证据，或明确排除该路径',
        fallback: true
      } : null);
  // Fill EVERY free worker slot, not just one. Distinct axes/questions so the
  // workers do not duplicate the same probe.
  const FALLBACK_VARIANTS = ['chain', 'input', 'identity', 'config', 'component', 'surface'];
  const fallbacks = goalsOpen.length === 0 ? [] : FALLBACK_VARIANTS
    .map((axis, i) => ({
      axis,
      question: `${goal.target || '目标'} 深入验证 #${i + 1}：${({
        chain: '把已发现的线索串联成从入口到敏感操作的可利用链，换等价路径重试并取响应证据',
        input: '挑一个尚未实测的可写参数/上传/注入入口，构造最小请求验证服务端处理',
        identity: '换认证边界（令牌、Cookie、越权 ID）验证未授权访问是否成立',
        config: '探测默认配置、调试端点、敏感文件与错误回显',
        component: '按已识别组件/版本验证一个具体已知缺陷的可利用性',
        surface: '枚举一个未覆盖的路由/参数面并发出实际请求取响应'
      })[axis]}。`,
      doneWhen: '拿到该方向的可复现响应证据，或明确排除该路径',
      fallback: true
    }))
    .slice(0, 6);
  // Never advertise a worker slot that is already occupied. The old max(1)
  // made a full engagement look runnable and caused the Lead to sit on one
  // worker while the other two slots stayed idle.
  const available = Math.max(0, workerLimit - activeTasks.length);
  // Candidates are proposed directions, not yet runnable. Accept enough of
  // them to fill slots that the current frontier cannot fill, then dispatch.
  const candidateSlots = Math.max(0, available - workFrontier.length);
  if (candidateSlots > 0 && candidates.length > 0) {
    const batch = candidates.slice(0, candidateSlots);
    actions.push({
      kind: batch.length > 1 ? 'accept_candidates' : 'accept_candidate',
      id: batch[0].id,
      candidateIds: batch.map((item) => item.id),
      questions: batch.map((item) => item.question),
      count: batch.length
    });
  }
  if (available > 0 && workFrontier.length > 0) {
    if (workFrontier.length > 1 && available > 1) {
      actions.push({
        kind: 'dispatch_batch',
        directionIds: workFrontier.slice(0, available).map((item) => item.id),
        questions: workFrontier.slice(0, available).map((item) => item.question),
        count: Math.min(workFrontier.length, available)
      });
    } else {
      actions.push({ kind: 'run_direction', id: workFrontier[0].id, question: workFrontier[0].question, priority: workFrontier[0].priority });
    }
  } else if (available > 0 && goalsOpen.length > 0 && fallback && !onlyBlockedCandidates) {
    actions.push({ kind: 'add_direction', ...fallback });
  }
  if (unvalidated.length > 0) {
    // Surface the entire validation debt in one action. Auditing only the
    // first finding leaves older pending findings permanently invisible to
    // the planner even though the UI still shows them as 待验证.
    actions.push({
      kind: unvalidated.length > 1 ? 'validate_batch' : 'validate',
      findingId: unvalidated[0].id,
      findingIds: unvalidated.map((item) => item.id),
      count: unvalidated.length,
      severity: unvalidated[0].severity
    });
  }

  return {
    paused: false,
    goals,
    openGoals: goalsOpen,
    mustGenerate,
    planner: {
      round: Number(planner.round) || 0,
      lastWakeAt: Number(planner.lastWakeAt) || 0,
      lastWakeReason: planner.lastWakeReason || ''
    },
    frontier: workFrontier.slice(0, 10),
    leadOnlyDirections: leadOnlyDirections.slice(0, 10),
    recentDone,
    candidates: candidates.slice(0, 8),
    unvalidated,
    coverageGaps,
    fallback,
    fallbacks,
    concurrency: {
      limit: workerLimit,
      active: activeTasks.length,
      available: Math.max(0, workerLimit - activeTasks.length)
    },
    actions
  };
}
