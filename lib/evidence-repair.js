/**
 * Deterministic evidence/step repair for v3 state.
 *
 * The earlier write path allowed agents to pass "human explanation + raw
 * packet" as one reproducibleSteps string. The note belongs in step.note; the
 * evidence request must be the replayable packet only. This migration is
 * idempotent and preserves existing evidence ids while re-hashing the canonical
 * request/response/note payload.
 */
import { canonicalEvidencePayload, evidenceHashMatches, sha256 } from './evidence-v3.js'
import { cleanStepRequest } from './step-request.js'

function text(value) {
  return value === undefined || value === null ? '' : String(value)
}

export function repairEvidenceStepsV3(state) {
  if (!state || Number(state.version) < 3) return { changed: false, state, repaired: 0 }
  const originalEvidence = Array.isArray(state.evidence) ? state.evidence : []
  const byId = new Map(originalEvidence.map((record) => [record.id, record]))
  let repaired = 0
  let changed = false
  const findings = (state.findings || []).map((finding) => {
    const sourceSteps = Array.isArray(finding.steps) ? finding.steps : []
    let findingChanged = false
    const steps = sourceSteps.map((step) => {
      const note = text(step?.note)
      const request = cleanStepRequest(note, step?.request)
      if (request !== text(step?.request)) findingChanged = true
      return { ...step, note, request: text(request) }
    })
    const evidenceIds = Array.isArray(finding.evidenceIds) ? finding.evidenceIds : []
    for (let index = 0; index < evidenceIds.length; index += 1) {
      const record = byId.get(evidenceIds[index])
      if (!record) continue
      const step = steps[index] || {}
      const request = cleanStepRequest(step.note || record.note, record.request || step.request)
      const next = {
        ...record,
        request,
        note: text(step.note || record.note),
        response: text(record.response || step.response),
        expected: text(record.expected || step.expected)
      }
      next.sha256 = sha256(canonicalEvidencePayload(next))
      if (!evidenceHashMatches(record) || next.request !== record.request || next.sha256 !== record.sha256) {
        byId.set(record.id, next)
        findingChanged = true
        repaired += 1
      }
    }
    if (!findingChanged) return finding
    changed = true
    return {
      ...finding,
      steps,
      reproducibleSteps: steps.map((step) => text(step.request))
    }
  })
  if (!changed) return { changed: false, state, repaired: 0 }
  return {
    changed: true,
    repaired,
    state: {
      ...state,
      findings,
      evidence: originalEvidence.map((record) => byId.get(record.id) || record)
    }
  }
}

