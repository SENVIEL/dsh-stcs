/**
 * v3 ReportModel -> Markdown.
 *
 * This is intentionally a renderer only. It must not inspect raw v2 state or
 * rebuild lineage; all grouping and field decisions live in report-model-v3.js.
 */
import { buildReportModel } from './report-model-v3.js'

const CN = { critical: '严重', high: '高危', medium: '中危', low: '低危', info: '信息' }

function text(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function indent(value) {
  return text(value).split('\n').filter((line) => line.trim() !== '').join('\n')
}

function stepBlock(step, index) {
  const lines = []
  const note = text(step.note).trim()
  const title = note === '' ? `步骤 ${index + 1}` : `**步骤 ${index + 1}：** ${note}`
  lines.push(title)
  lines.push('')
  if (text(step.request).trim() !== '') {
    lines.push('```http')
    lines.push(text(step.request).trim())
    lines.push('```')
    lines.push('')
  }
  if (text(step.response).trim() !== '') {
    lines.push('返回：')
    lines.push('')
    lines.push('```')
    lines.push(text(step.response).trim())
    lines.push('```')
    lines.push('')
  } else if (text(step.expected).trim() !== '') {
    lines.push(`返回 ${text(step.expected).trim()}`)
    lines.push('')
  }
  return lines
}

export function renderReportModelMarkdown(model) {
  if (!model || !Array.isArray(model.findings)) throw new Error('renderReportModelMarkdown: ReportModel required')
  const lines = []
  lines.push('# 渗透测试报告')
  lines.push('')
  lines.push('## 一、摘要')
  lines.push('')
  lines.push(`共记录 ${model.counts.findings} 个安全问题：严重 ${model.counts.critical}、高危 ${model.counts.high}、中危 ${model.counts.medium}、低危 ${model.counts.low}、信息 ${model.counts.info}。`)
  lines.push('')
  lines.push('| 序号 | 问题等级 | 安全问题名称 |')
  lines.push('|---|---|---|')
  model.findings.forEach((finding, index) => {
    lines.push(`| ${index + 1} | ${CN[finding.severity] || finding.severity} | ${finding.title.replace(/\|/g, '\\|')} |`)
  })
  lines.push('')
  lines.push('## 二、测试过程详述')
  lines.push('')
  model.findings.forEach((finding, index) => {
    lines.push(`### ${index + 1}. ${finding.title}（风险程度：${CN[finding.severity] || finding.severity}）`)
    lines.push('')
    lines.push('#### 漏洞描述')
    lines.push('')
    lines.push(text(finding.description).trim() || '（未记录）')
    lines.push('')
    if (finding.directionTitle !== '') {
      lines.push(`功能点：${finding.directionTitle}`)
      lines.push('')
    }
    lines.push('#### 接口来源')
    lines.push('')
    if (finding.apiSources.length === 0) lines.push('- 未记录（请在 finding.apiSources 补充 JS bundle / 源文件 / 路由定义位置）')
    else for (const source of finding.apiSources) lines.push(`- ${source}`)
    lines.push('')
    lines.push('#### 测试过程')
    lines.push('')
    if (finding.steps.length === 0) {
      lines.push('（尚未记录可复现步骤，报告不能补造请求包。）')
      lines.push('')
    } else {
      finding.steps.forEach((step, stepIndex) => lines.push(...stepBlock(step, stepIndex)))
    }
    if (finding.validation) {
      const verdict = finding.validation.verdict === 'reproduced'
        ? '已复现'
        : finding.validation.verdict === 'not_reproduced'
          ? '未复现'
          : finding.validation.verdict === 'inconclusive'
            ? '待确认'
            : text(finding.validation.verdict)
      if (verdict !== '') {
        lines.push(`验证结论：${verdict}`)
        lines.push('')
      }
    }
    lines.push('#### 风险分析')
    lines.push('')
    lines.push(text(finding.riskAnalysis).trim() || '（未记录影响分析。）')
    lines.push('')
    lines.push('#### 修复建议')
    lines.push('')
    if (text(finding.remediation).trim() === '') lines.push('（待补充）')
    else lines.push(indent(finding.remediation).split('\n').map((line) => `- ${line.replace(/^[-*]\s+/, '')}`).join('\n'))
    lines.push('')
    if (finding.retest) {
      lines.push('#### 复测')
      lines.push('')
      lines.push(`- 结论：${text(finding.retest.verdict)}`)
      if (finding.retest.summary) lines.push(`- 说明：${text(finding.retest.summary)}`)
      lines.push('')
    }
  })
  lines.push('## 三、资产清单')
  lines.push('')
  if (model.assets.length === 0) {
    lines.push('（未记录资产。）')
  } else {
    lines.push('| 序号 | 类型 | 资产 |')
    lines.push('|---|---|---|')
    model.assets.forEach((asset, index) => {
      lines.push(`| ${index + 1} | ${text(asset.type || asset.assetType || '')} | ${text(asset.value).replace(/\|/g, '\\|')} |`)
    })
  }
  lines.push('')
  if (model.coverage.length > 0) {
    lines.push('## 四、测试覆盖')
    lines.push('')
    lines.push('| 序号 | 资产/面 | 风险域 | 结果 |')
    lines.push('|---|---|---|---|')
    model.coverage.forEach((item, index) => {
      lines.push(`| ${index + 1} | ${text(item.surface)} | ${text(item.riskArea)} | ${text(item.outcome)} |`)
    })
    lines.push('')
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export function renderReportStateMarkdown(state) {
  return renderReportModelMarkdown(buildReportModel(state))
}
