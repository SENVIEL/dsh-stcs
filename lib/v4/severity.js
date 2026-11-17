/**
 * Auditor severity policy.
 *
 * The policy is deliberately explicit: a model may describe impact, but it may
 * not inflate a finding above the impact it actually proved. The auditor still
 * writes the rationale; this module only rejects impossible combinations.
 */
export const SEVERITY_RUBRIC = Object.freeze({
  critical: '已验证 RCE / 系统命令执行 / 管理员认证绕过并取得完整控制 / 大规模敏感数据泄露',
  high: '已验证未授权敏感数据读取、任意文件写入、持久化管理员能力，且可直接造成业务影响',
  medium: '需要特定条件或有限权限的读取、认证弱点、有限写入或单点信息泄露',
  low: '版本/banner/配置/ hardening 观察，未证明直接利用或业务影响',
  info: '仅侦察信息，不进入漏洞报告'
});

export function assertSeverityConsistency(severity, impactProven) {
  const rank = { low: 1, medium: 2, high: 3, critical: 4 };
  if (!rank[severity]) throw new Error(`unknown severity: ${severity}`);
  if (!['none', 'info', 'read', 'write', 'rce'].includes(impactProven)) {
    throw new Error(`unknown impactProven: ${impactProven}`);
  }
  if (impactProven === 'rce' && severity !== 'critical') {
    throw new Error('auditor severity policy: proven RCE must be critical');
  }
  if (impactProven === 'info' && rank[severity] > 2) {
    throw new Error('auditor severity policy: information-only impact cannot be high/critical');
  }
  if (impactProven === 'none' && severity !== 'low') {
    throw new Error('auditor severity policy: no proven impact must be low');
  }
}
