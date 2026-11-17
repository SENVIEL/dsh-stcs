/**
 * v4 report renderer. Pure: takes a v4 state and returns Markdown.
 * The plugin writes the result under <workdir>/reports/v4-report.md.
 */
import { AXES, coverageIsComplete } from './axes.js'
import { latestValidationFor } from './validations.js'

function line(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function clip(value, max = 600) {
  const text = line(value)
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function evidenceLabel(state, id) {
  const item = (state.evidence || []).find((entry) => entry.id === id)
  if (!item) return id
  return `${id} (${item.path || item.summary || item.kind || 'evidence'})`
}

export function renderV4Report(state, { now = new Date() } = {}) {
  const goal = state.goal || {}
  const allFindings = (state.findings || []).filter((item) => item.deleted !== true && item.severity !== 'info')
  // `impactProven=none` is not the same as a negative observation. A source
  // or harness-only finding can have no proven live impact and still be a
  // pending candidate that must stay visible in the unconfirmed section.
  const isObservation = (item) => item.status === 'false_positive'
    || item.status === 'not_reproduced'
    || item.status === 'rejected'
  const findings = allFindings.filter((item) => !isObservation(item))
  const observations = allFindings.filter(isObservation)
  const severityRank = { critical: 0, high: 1, medium: 2, low: 3 }
  const bySeverity = (a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9)
  const confirmed = findings.filter((item) => item.status === 'confirmed').sort(bySeverity)
  const unconfirmed = findings.filter((item) => item.status !== 'confirmed').sort(bySeverity)
  const verificationLevel = (item) => line(item.verificationLevel)
    || (item.status === 'confirmed' ? 'confirmed'
      : item.status === 'inconclusive' ? 'inconclusive' : 'unverified')
  observations.sort(bySeverity)
  const directions = state.directions || []
  const assets = state.assets || []
  const validations = (state.validations || []).filter((item) => item.superseded !== true)
  const tasks = state.tasks || []
  const verified = validations.filter((item) => item.verdict === 'reproduced').length
  const lines = []
  lines.push('# 渗透测试报告（v4）', '')
  const targets = Array.isArray(goal.targets) && goal.targets.length > 0 ? goal.targets : [goal.target]
  lines.push(`- 目标：${targets.filter(Boolean).map(line).join('、') || '（未记录）'}`)
  lines.push(`- 目的：${line(goal.objective)}`)
  lines.push(`- 授权：${line(goal.authorization) || '未记录（红线缺失，禁止交付）'}`)
  lines.push(`- 工作目录：${line(goal.workdir)}`)
  lines.push(`- 生成时间：${now.toISOString()}`)
  lines.push('', '## 概览', '')
  const goals = state.goals || []
  lines.push(`- 方向：${directions.length}（完成 ${directions.filter((item) => item.state === 'done').length}）`)
  lines.push(`- 目标：${goals.filter((item) => item.state === 'met').length}/${goals.length} 已证明`)
  lines.push(`- 发现：${confirmed.length} 已确认 / ${unconfirmed.length} 未确认 / ${observations.length} 观察（critical/high ${findings.filter((item) => ['critical', 'high'].includes(item.severity)).length}）`)
  lines.push(`- 复现验证：${verified}`)
  lines.push(`- 资产：${assets.length}`)
  lines.push(`- 任务：${tasks.length}（done ${tasks.filter((item) => item.state === 'done').length}，failed ${tasks.filter((item) => item.state === 'failed').length}）`)
  lines.push('', '## 范围与目标', '')
  lines.push(`- in-scope：${targets.filter(Boolean).map(line).join('、') || '（未记录）'}`)
  lines.push(`- excluded：${(goal.excludedTargets || []).filter(Boolean).map(line).join('、') || '（无）'}`)
  lines.push('', '## 资产清单', '')
  if (assets.length === 0) lines.push('（无）')
  for (const asset of assets) {
    const meta = line(asset.meta)
    lines.push(`- [${line(asset.type) || 'asset'}] ${line(asset.value)}${meta ? `（${meta}）` : ''}`)
  }
  lines.push('', '## 目标', '')
  if (goals.length === 0) lines.push('（无）')
  for (const goal of goals) {
    lines.push(`- [${goal.state === 'met' ? 'met' : 'open'}] ${line(goal.title)}`)
    const proofs = (goal.proofs || []).filter((proof) => proof.invalidated !== true)
    if (proofs.length) lines.push(`  - 证明：${proofs.map((proof) => `${proof.evidenceId}${proof.findingId ? `（finding ${proof.findingId}）` : proof.factId ? `（fact ${proof.factId}）` : ''}（${line(proof.reason) || 'no reason'}）`).join(', ')}`)
  }
  lines.push('', '## 已确认发现', '')
  if (confirmed.length === 0) lines.push('（无）')
  for (const finding of confirmed) {
    lines.push(`### [${line(finding.severity) || 'info'}] ${clip(finding.title || finding.claim)}`, '')
    lines.push(`- 状态：${line(finding.status) || 'unverified'}`)
    lines.push(`- 影响：${line(finding.impactProven) || 'unknown'}`)
    lines.push('', '#### 漏洞描述', '')
    lines.push(clip(finding.description || finding.claim, 1000) || '（未记录）')
    lines.push('', '#### 测试过程', '')
    const steps = Array.isArray(finding.steps) ? finding.steps : (Array.isArray(finding.reproducibleSteps) ? finding.reproducibleSteps : [])
    const stepNotes = Array.isArray(finding.stepNotes) ? finding.stepNotes : []
    if (steps.length === 0) {
      lines.push('（未记录可复现步骤；证据：' + ((finding.evidenceIds || []).map((id) => evidenceLabel(state, id)).join(', ') || '无') + '）')
    } else {
      steps.forEach((step, index) => {
        lines.push(`${index + 1}. ${clip(stepNotes[index] || `步骤 ${index + 1}`, 300)}`)
        lines.push('```http')
        lines.push(String(step).replace(/\r\n/g, '\n').trim())
        lines.push('```')
      })
    }
    lines.push('', '#### 风险分析', '')
    lines.push(clip(finding.riskAnalysis || '（未记录风险分析）', 800))
    lines.push('', '#### 修复建议', '')
    lines.push(clip(finding.remediation || '（未记录修复建议）', 800))
    const validation = latestValidationFor(validations, finding.id)
    if (validation) {
      lines.push('', `验证：${validation.verdict}${validation.notes ? `（${clip(validation.notes, 240)}）` : ''}`)
    }
    lines.push('')
  }
  lines.push('', '## 未确认发现', '')
  if (unconfirmed.length === 0) lines.push('（无）')
  for (const finding of unconfirmed) {
    lines.push(`- [${line(finding.severity) || 'info'}] ${clip(finding.claim, 300)}（${line(finding.status) || 'unverified'} / ${verificationLevel(finding)}）`)
  }
  lines.push('', '## 负面观察（不是漏洞）', '')
  if (observations.length === 0) lines.push('（无）')
  for (const finding of observations) lines.push(`- [${line(finding.severity) || 'info'}] ${clip(finding.claim, 240)}`)
  lines.push('## 探索方向', '')
  if (directions.length === 0) lines.push('（无）')
  for (const direction of directions) {
    const directionTasks = tasks.filter((task) => task.directionId === direction.id)
    const directionFacts = (state.facts || []).filter((fact) => fact.directionId === direction.id)
    const parents = Array.isArray(direction.parents) && direction.parents.length > 0 ? `；parents ${direction.parents.join(',')}` : ''
    lines.push(`- [${direction.state}] ${clip(direction.question, 140)}（task ${directionTasks.length} / fact ${directionFacts.length}${parents}）`)
    if (direction.conclusion?.answer) lines.push(`  - 结论：${clip(direction.conclusion.answer, 140)}`)
  }
  lines.push('', '## 覆盖', '')
  const coverage = state.coverage || []
  if (coverage.length === 0) lines.push('（无）')
  for (const item of coverage) {
    const evidenceSuffix = Array.isArray(item.evidenceIds) && item.evidenceIds.length > 0
      ? `，evidence ${item.evidenceIds.length}`
      : '，无 evidence（不计覆盖）'
    lines.push(`- ${line(item.axis)}：${line(item.result)}${item.note ? `（${line(item.note)}）` : ''}${evidenceSuffix}`)
  }
  const covered = new Set(coverage.filter(coverageIsComplete).map((item) => item.axis))
  const gaps = AXES.filter((axis) => !covered.has(axis))
  if (gaps.length > 0) lines.push(`- 未覆盖轴：${gaps.join(', ')}`)
  lines.push('', '## 证据索引', '')
  const referenced = new Set()
  for (const finding of [...confirmed, ...unconfirmed]) for (const id of finding.evidenceIds || []) referenced.add(id)
  for (const validation of validations) for (const id of validation.evidenceIds || []) referenced.add(id)
  const evidence = (state.evidence || []).filter((item) => referenced.has(item.id))
  lines.push(`- 收证总数：${(state.evidence || []).length}；报告引用：${evidence.length}；未确认候选证据已纳入索引`)
  if (evidence.length === 0) lines.push('（无引用证据）')
  for (const item of evidence) {
    lines.push(`- ${item.id} | ${line(item.kind)} | ${line(item.role)} | ${line(item.path)} | ${line(item.sha256)}`)
  }
  lines.push('')
  return lines.join('\n')
}
