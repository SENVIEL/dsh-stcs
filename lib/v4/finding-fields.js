import fs from 'node:fs';
import path from 'node:path';

// Evidence JSON files are immutable in normal operation but projection/report
// can be recomputed many times per revision. Cache the parsed spec keyed by
// path + mtime + size; any rewrite invalidates it naturally.
const EVIDENCE_CACHE_LIMIT = 256;
const evidenceFileCache = new Map();

export function clearEvidenceFileCache() {
  evidenceFileCache.clear();
}

function readEvidenceSpec(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return undefined;
  }
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) return undefined;
  const key = `${file}|${stat.mtimeMs}|${stat.size}`;
  if (evidenceFileCache.has(key)) return evidenceFileCache.get(key);
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const spec = JSON.parse(raw);
    evidenceFileCache.set(key, spec);
    if (evidenceFileCache.size > EVIDENCE_CACHE_LIMIT) {
      const oldest = evidenceFileCache.keys().next().value;
      if (oldest !== undefined) evidenceFileCache.delete(oldest);
    }
    return spec;
  } catch {
    return undefined;
  }
}

/**
 * Fill report-only finding fields from a finding_spec JSON already registered
 * as evidence. Canonical state is never mutated; only the copy used by the
 * report/UI projection is enriched.
 */
export function enrichFindingsFromEvidence(state) {
  if (!state || !Array.isArray(state.findings) || state.findings.length === 0) return state;
  const root = path.resolve(state.goal?.workdir || '.');
  const byId = new Map((state.evidence || []).map((item) => [item.id, item]));
  const out = { ...state, findings: state.findings.map((finding) => {
    if (finding.description && finding.riskAnalysis && finding.remediation && Array.isArray(finding.steps) && finding.steps.length > 0) return finding;
    for (const id of finding.evidenceIds || []) {
      const evidence = byId.get(id);
      if (!evidence?.path || !/.json$/i.test(evidence.path)) continue;
      const file = path.resolve(root, evidence.path);
      if (!file.startsWith(root + path.sep)) continue;
      const spec = readEvidenceSpec(file);
      if (!spec || typeof spec !== 'object' || !spec.description) continue;
      if (!Array.isArray(spec.reproducibleSteps) && !Array.isArray(spec.steps)) continue;
      return {
        ...finding,
        title: finding.title || spec.title || finding.claim,
        description: finding.description || spec.description,
        riskAnalysis: finding.riskAnalysis || spec.riskAnalysis || '',
        remediation: finding.remediation || spec.remediation || '',
        steps: (finding.steps?.length ? finding.steps : (spec.reproducibleSteps || spec.steps || [])).map(String),
        stepNotes: finding.stepNotes?.length ? finding.stepNotes : (spec.stepNotes || []).map(String),
        apiSources: finding.apiSources?.length ? finding.apiSources : (spec.apiSources || spec.evidenceRefs || []).map(String)
      };
    }
    return finding;
  }) };
  return out;
}

/**
 * Coverage is the worker's durable claim that an axis had an issue. Older
 * workers sometimes put the proof there but forgot findings[]. Keep the
 * canonical state untouched and expose a derived finding in projections and
 * reports when the coverage note contains a confirmed high-impact condition.
 */
export function deriveCoverageFindings(state) {
  if (!state || !Array.isArray(state.coverage) || state.coverage.length === 0) return state;
  const evidenceById = new Map((state.evidence || []).map((item) => [item.id, item]));
  const existing = (state.findings || []).filter((item) => item && item.deleted !== true);
  const derived = [];
  for (const coverage of state.coverage) {
    if (!coverage || coverage.result !== 'issue_found') continue;
    const note = String(coverage.note || '').trim();
    if (!note || /(证伪|不成立|未证实|无法|未验证|not confirmed|false positive)/i.test(note)) continue;
    if (!/(已确认|实测|成功|返回|root|uid=0|命令执行|RCE|默认口令|可直接登录)/i.test(note)) continue;
    const evidenceIds = (Array.isArray(coverage.evidenceIds) ? coverage.evidenceIds : [])
      .map(String)
      .filter((id) => evidenceById.has(id));
    if (evidenceIds.length === 0) continue;
    const overlap = (ids) => ids.some((id) => evidenceIds.includes(id));
    const family = /(DataEase|默认口令|root|RCE|命令执行|uid=0)/i;
    if (existing.some((finding) => overlap(finding.evidenceIds || [])
      || (family.test(note) && family.test(String(finding.claim || ''))))) continue;
    if (derived.some((finding) => finding.claim === note)) continue;
    const matchedFact = (state.facts || []).find((fact) => overlap(fact.evidenceIds || []));
    const paths = evidenceIds.map((id) => evidenceById.get(id)?.path).filter(Boolean);
    const critical = /(RCE|远程代码执行|命令执行|root|uid=0|OS command)/i.test(note);
    derived.push({
      id: `derived-${coverage.id}`,
      directionId: matchedFact?.directionId || null,
      claim: note,
      title: note.length > 100 ? `${note.slice(0, 99)}…` : note,
      description: note,
      riskAnalysis: critical
        ? 'worker 已在 coverage 中确认命令执行/root 权限，影响为服务器或容器完全失陷。'
        : 'worker 已在 coverage 中确认默认凭据或管理员能力，可能导致敏感数据泄露与进一步利用。',
      remediation: critical
        ? '修复默认管理员口令与 SQL/JDBC 执行面，限制 previewSql 等危险能力并补充独立验证。'
        : '立即更换默认口令，启用最小权限与登录保护，并对管理员操作增加审计。',
      steps: paths.length > 0
        ? paths.map((item) => `证据文件：${item}`)
        : [`evidence: ${evidenceIds.join(', ')}`],
      stepNotes: [],
      apiSources: [],
      severity: critical ? 'critical' : 'high',
      impactProven: critical ? 'rce' : 'write',
      evidenceIds,
      validationId: null,
      status: 'unverified',
      derived: true,
      createdAt: Number(coverage.createdAt) || Number(state.goal?.updatedAt) || Date.now()
    });
  }
  return derived.length > 0 ? { ...state, findings: [...(state.findings || []), ...derived] } : state;
}
