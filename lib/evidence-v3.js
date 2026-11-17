/**
 * Phase 3 evidence audit.
 *
 * v3 evidence records carry sha256. Legacy records hash the raw request;
 * newer records may hash a canonical request+response+note payload. Both are
 * accepted, but every finding.evidenceId must resolve and every hash must
 * match one of those forms.
 */
import crypto from 'node:crypto'

function text(value) {
  return value === undefined || value === null ? '' : String(value)
}

export function sha256(value) {
  return crypto.createHash('sha256').update(text(value)).digest('hex')
}

export function canonicalEvidencePayload(record) {
  return JSON.stringify({
    kind: text(record?.kind),
    request: text(record?.request),
    response: text(record?.response),
    expected: text(record?.expected),
    note: text(record?.note)
  })
}

export function evidenceHashMatches(record) {
  if (!record || typeof record !== 'object') return false
  const expected = text(record.sha256)
  if (expected === '') return false
  if (expected === sha256(record.request)) return true
  if (expected === sha256(canonicalEvidencePayload(record))) return true
  return false
}

export function auditEvidence(state) {
  const findings = (state?.findings || []).filter((finding) => finding.deleted !== true)
  const evidenceById = new Map((state?.evidence || []).map((record) => [record.id, record]))
  const validations = new Map((state?.validations || []).map((record) => [record.findingId, record]))
  const problems = []
  const missingEvidence = []
  const hashMismatches = []
  const unvalidated = []
  for (const finding of findings) {
    const ids = Array.isArray(finding.evidenceIds) ? finding.evidenceIds.filter(Boolean) : []
    for (const id of ids) {
      if (!evidenceById.has(id)) {
        missingEvidence.push({ findingId: finding.id, evidenceId: id })
        continue
      }
      if (!evidenceHashMatches(evidenceById.get(id))) {
        hashMismatches.push({ findingId: finding.id, evidenceId: id })
      }
    }
    const severity = String(finding.severity || '')
    const validation = validations.get(finding.id)
    const needsValidation = severity === 'critical' || severity === 'high'
    if (needsValidation && (!validation || validation.verdict !== 'reproduced')) {
      unvalidated.push({ findingId: finding.id, severity, verdict: validation?.verdict || '' })
    }
    if (needsValidation && ids.length === 0) {
      problems.push(`${finding.id}: ${severity} finding 没有 evidenceIds/证据`)
    }
  }
  if (missingEvidence.length > 0) problems.push(`${missingEvidence.length} 个 evidenceId 在 state.evidence 中不存在`)
  if (hashMismatches.length > 0) problems.push(`${hashMismatches.length} 条 evidence sha256 不匹配`)
  if (unvalidated.length > 0) problems.push(`${unvalidated.length} 条 high/critical 没有 reproduced validation`)
  return {
    ok: problems.length === 0,
    problems,
    missingEvidence,
    hashMismatches,
    unvalidated,
    evidenceCount: Array.isArray(state?.evidence) ? state.evidence.length : 0
  }
}
