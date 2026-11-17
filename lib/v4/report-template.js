/**
 * Fixed report template contract. The reporter writes content; the renderer
 * owns layout. Keeping the section list here prevents a model from silently
 * changing the report structure.
 */
export const REPORT_TEMPLATE = Object.freeze({
  id: 'pentest-default-v1',
  title: '渗透测试报告',
  findingSections: ['漏洞描述', '测试过程', '风险分析', '修复建议'],
  sections: [
    '执行摘要',
    '授权与范围',
    '已确认发现',
    '未确认发现',
    '覆盖与证据',
    '附录'
  ]
});

export function validateReportMarkdown(markdown, findings = []) {
  const text = String(markdown || '');
  if (!text.trim()) throw new Error('report is empty');
  if (!text.includes(REPORT_TEMPLATE.title)) throw new Error(`report title missing: ${REPORT_TEMPLATE.title}`);
  const confirmed = (findings || []).filter((item) => item.deleted !== true
    && item.severity !== 'info'
    && item.status === 'confirmed'
    && item.impactProven !== 'none');
  for (const section of REPORT_TEMPLATE.findingSections) {
    const count = text.split(section).length - 1;
    if (confirmed.length > 0 && count < confirmed.length) {
      throw new Error(`report template: finding section "${section}" appears ${count} times, expected at least ${confirmed.length}`);
    }
  }
  if (!text.includes('证据')) throw new Error('report template: evidence index missing');
  return { templateId: REPORT_TEMPLATE.id, confirmed: confirmed.length };
}

/**
 * Count the report's declared gaps. Reporter output uses GAP-01/GAP-02 codes
 * in the Markdown body; state.report.gaps must reflect the actual document,
 * not a hardcoded zero.
 */
export function parseReportGaps(markdown) {
  const text = String(markdown || '');
  const codes = new Set();
  for (const match of text.matchAll(/\bGAP[-_ ]?(\d{1,3})\b/gi)) {
    codes.add(`GAP-${String(Number(match[1])).padStart(2, '0')}`);
  }
  if (codes.size > 0) return codes.size;
  const uncovered = text.match(/未覆盖轴[：:]\s*([^\n]+)/);
  if (uncovered) {
    const items = uncovered[1].split(/[,，、]/).map((item) => item.trim()).filter(Boolean);
    if (items.length > 0) return items.length;
  }
  // Fallback for reports that use a "coverage gaps" section with bullet items
  // instead of explicit GAP codes.
  const section = text.match(/(?:^|\n)#{1,6}\s*(?:覆盖缺口|遗留缺口|未覆盖项|GAPS?|Coverage\s+Gaps?)\s*\n([\s\S]*?)(?=\n#{1,6}\s|$)/i);
  if (!section) return 0;
  return section[1]
    .split(/\r?\n/)
    .filter((line) => /^\s*[-*]\s+\S/.test(line))
    .length;
}
