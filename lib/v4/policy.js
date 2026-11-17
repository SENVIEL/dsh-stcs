/**
 * SINGLE policy evaluator for the pentest plugin.
 *
 * Historically the red line, the "audited/pending" rule, the authorization
 * baseline and the goal-lifecycle guard were each re-implemented in 5-7
 * places (safety.js, authorization.js, dispatch prompt, roles prompt,
 * protocol, SCOPE.md, reduce, UI findingCategory, UI auditStateOf). Every
 * fix changed one copy and the others drifted, producing an endless stream of
 * contradictory symptoms. ALL consumers must import from here.
 */
import { redLineReason } from './safety.js';
import { normalizeAuthorization, RED_LINE, AUTHORIZATION_POLICY } from './authorization.js';

export { redLineReason, normalizeAuthorization, RED_LINE, AUTHORIZATION_POLICY };

/** ONE audit state rule: an auditor conclusion is the only reviewed state. */
export function auditStateOf(finding, validations = []) {
  const id = String(finding?.id || '');
  const hasConclusion = Array.isArray(validations)
    && validations.some((v) => String(v?.findingId || '') === id
      && String(v?.validator || '') === 'agent:pentest-auditor'
      && v?.superseded !== true);
  return hasConclusion ? 'audited' : 'pending';
}

/** Finding category is derived from the same audit state — never a third axis. */
export function categoryOfAuditState(auditState) {
  return auditState === 'audited' ? 'vulnerability' : 'candidate';
}

/** Human-only goal lifecycle. The model can never block/pause/end. */
export function isHumanGoalCommand(text, action) {
  const raw = String(text || '');
  if (!raw || /<sidecar_planner>|<goal_round>|planner 心跳|不是人类的新要求/.test(raw)) return false;
  // A human explicitly forbidding termination must never be read as consent.
  if (/(?:不要|不用|别|无需|不准|禁止|永不|绝不|不允许|不能).{0,16}(?:结束|终止|停止|暂停|标记|block|complete|pause|stop)/i.test(raw)) return false;
  if (action === 'blocked') return false; // permanently forbidden
  if (action === 'pause') return /(?:请|现在|可以|直接|帮我|立即)?\s*(?:暂停|挂起)(?:这个|本次|当前)?(?:目标|任务|测试)|pause\s+(?:the\s+)?(?:goal|test)/i.test(raw);
  return /(?:请|现在|可以|直接|帮我|立即)?\s*(?:结束|终止|停止|收工|停掉)(?:这个|本次|当前)?(?:目标|任务|测试)|(?:目标|任务)(?:到此为止|结束|完成|收工)|(?:stop|end|complete)\s+(?:the\s+)?(?:goal|test)/i.test(raw);
}
