/**
 * Authorization normalization.
 *
 * The user's own words are the highest authority. Lead agents have repeatedly
 * appended self-imposed "verifiable authorization" gates (written work order,
 * IP allowlist, test window, test account, per-request rate limits) even when
 * the user said "everything is allowed / you can test any direction". Those
 * gates are not user red lines; they silently cap exploration and reduce
 * findings. This module removes them at the state boundary instead of relying
 * on a prompt to behave.
 */

// A bracketed Lead-authored verification gate plus the sentences inside that
// paragraph. Stop at a blank line or the next bracketed section so explicit
// user scope text that follows is preserved.
const SELF_IMPOSED_GATE_RE = /【(?:Lead|主代理|规划者|Lead 自行|模型自加)[^】]*(?:授权核验|核验门槛|执行门槛|停止门槛|待可核验凭证|非用户设限)[^】]*】[^\n【]*(?:\n|$)/g;

const SELF_IMPOSED_PHRASES = [
  /未提供书面授权书或工单编号[^\n。；]*/g,
  /在补齐任一可核验授权凭证[^\n。；]*之前[^\n。；]*/g,
  /测试源加白(?:回执|凭证)?[^\n。；]*/g,
  /测试专线\s*\/\s*VPN[^\n。；]*/g,
  /测试窗口凭证[^\n。；]*/g,
  /应急联系人与回滚方案[^\n。；]*/g,
  /单次请求最小化[^\n。；]*/g,
  /≤?\s*1\s*(?:req|请求)\s*\/\s*5\s*s[^\n。；]*/gi,
  /只读证明[^\n。；]*(?:不采用|暂不执行)[^\n。；]*/g
];

// Single definition of the two policy strings. policy.js is the ONLY public
// entry point; nothing else may restate these.
export const RED_LINE = '严禁测试删除和篡改原有数据的接口。除此之外不设其它前置限制；正常渗透动作默认放行。';
export const AUTHORIZATION_POLICY = `按用户授权原话执行；用户未要求的工单/加白/窗口/账号/频次一律不作为开工条件。${RED_LINE}`;

/**
 * Strip Lead-authored verification gates while preserving explicit user red
 * lines and the rest of the authorization text. Pure and idempotent.
 */
export function normalizeAuthorization(input) {
  const raw = String(input == null ? '' : input).trim();
  if (!raw) return '';
  let text = raw.replace(SELF_IMPOSED_GATE_RE, '');
  for (const re of SELF_IMPOSED_PHRASES) text = text.replace(re, '');
  text = text.replace(/[；;]\s*[；;]+/g, '；').replace(/\s{2,}/g, ' ').trim();
  return text.includes(AUTHORIZATION_POLICY)
    ? text
    : [text, AUTHORIZATION_POLICY].filter(Boolean).join('\n');
}

export const PLATFORM_GUARD_PREFIX = '【平台管控·非WAF】';

/** Wrap a guard rejection so the model never mistakes it for a target WAF. */
export function platformGuardReason(reason) {
  const text = String(reason || '').trim();
  return `${PLATFORM_GUARD_PREFIX} ${text} 平台侧约束，非目标防御；不要换 payload 重试。`;
}
