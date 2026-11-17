/**
 * v3 ReportModel.
 *
 * Formatting belongs in a renderer; grouping, severity ordering, direction
 * titles, steps, sources, evidence and validations belong here. This is the
 * single model that both Markdown/HTML output and the UI preview should use.
 */
import { V3_VERSION } from './migrate-v3.js'

const ORDER = ['critical', 'high', 'medium', 'low', 'info']
const CN = { critical: '严重', high: '高危', medium: '中危', low: '低危', info: '信息' }

function text(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function number(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function severityOf(finding) {
  const severity = text(finding?.severity || 'medium')
  return ORDER.includes(severity) ? severity : 'medium'
}

function directionTitle(state, finding) {
  const direction = (state.directions || []).find((item) => item.id === finding.directionId)
  return direction ? text(direction.title) : ''
}

export function buildReportModel(state) {
  if (!state || typeof state !== 'object') throw new Error('buildReportModel: state required')
  if (number(state.version) < V3_VERSION) throw new Error(`buildReportModel: expected v3 state, got v${state.version}`)
  const findings = (Array.isArray(state.findings) ? state.findings : [])
    .filter((finding) => finding.deleted !== true)
    .map((finding) => {
      const validation = (state.validations || []).find((item) => item.findingId === finding.id)
      return {
        id: finding.id,
        title: text(finding.title),
        severity: severityOf(finding),
        severityLabel: CN[severityOf(finding)],
        directionId: finding.directionId || null,
        directionTitle: directionTitle(state, finding) || text(finding.title),
        description: text(finding.description),
        riskAnalysis: text(finding.riskAnalysis),
        remediation: text(finding.remediation),
        affectedAssets: Array.isArray(finding.affectedAssets) ? finding.affectedAssets.slice() : [],
        apiSources: Array.isArray(finding.apiSources) ? finding.apiSources.slice() : [],
        steps: (Array.isArray(finding.steps) ? finding.steps : []).map((step) => ({
          note: text(step.note),
          request: text(step.request),
          response: text(step.response),
          expected: text(step.expected)
        })),
        evidenceIds: Array.isArray(finding.evidenceIds) ? finding.evidenceIds.slice() : [],
        validation: validation ? { ...validation } : null,
        retest: finding.retest ? { ...finding.retest } : null,
        createdAt: number(finding.createdAt),
        updatedAt: number(finding.updatedAt)
      }
    })
  const grouped = Object.fromEntries(ORDER.map((severity) => [severity, []]))
  for (const finding of findings) (grouped[finding.severity] || grouped.medium).push(finding)
  const ordered = ORDER.flatMap((severity) => grouped[severity])
  return {
    version: V3_VERSION,
    revision: number(state.revision),
    sessionId: state.sessionId || '',
    goal: state.goal ? { ...state.goal } : null,
    findings: ordered,
    grouped,
    assets: (Array.isArray(state.assets) ? state.assets : []).map((asset) => ({ ...asset })),
    coverage: (Array.isArray(state.coverage) ? state.coverage : []).map((item) => ({ ...item })),
    counts: {
      findings: findings.length,
      critical: grouped.critical.length,
      high: grouped.high.length,
      medium: grouped.medium.length,
      low: grouped.low.length,
      info: grouped.info.length,
      assets: Array.isArray(state.assets) ? state.assets.length : 0,
      coverage: Array.isArray(state.coverage) ? state.coverage.length : 0
    }
  }
}
