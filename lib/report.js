/**
 * 绿盟 NSFOCUS 式交付报告。
 *
 * 结构由《报告样例-新格式.md》与 PATCH-finding-detail.md 固定：
 *   标题/目标/目的/授权
 *   一、摘要（等级统计 + 序号/等级/名称表）
 *   二、测试过程详述（每条：问题描述 / 测试过程 / 风险分析 / 修复建议）
 *   三、资产清单
 *
 * 测试过程只放客户能照做复现的最小步骤；落盘、统计、对照验证、清理现场、
 * 证据路径、源码定位等内部操作必须过滤。风险分析放实际影响与量级。
 */
import { renderReportStateMarkdown } from './report-renderer-v3.js';

const CN = { critical: '严重', high: '高危', medium: '中危', low: '低危', info: '提示' };
const ORDER = ['critical', 'high', 'medium', 'low', 'info'];
const HTTP_REQUEST_LINE = /(?:^|\n)\s*(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|TRACE|CONNECT)\s+\S+\s+HTTP\/[\d.]+/;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return value === undefined || value === null ? '' : String(value);
}

function escapeCell(value) {
  return text(value).replace(/\|/g, '\\|');
}

function verdictOf(finding) {
  return finding?.validation && typeof finding.validation === 'object' ? finding.validation.verdict : undefined;
}

function reportableFindings(state) {
  return asArray(state.findings).filter((finding) => {
    if (finding.deleted === true) return false;
    if (finding.evidenceStatus === 'unverified') return false;
    if (verdictOf(finding) === 'not_reproduced') return false;
    return true;
  });
}

function effectiveSeverity(finding) {
  if (verdictOf(finding) === 'reproduced') return finding.severity;
  if (finding.severity === 'critical') return 'high';
  if (finding.severity === 'high') return 'medium';
  return finding.severity;
}

/** finding.description = 问题描述 + （可选）风险分析/影响；拆开分别落在两节。 */
export function splitFindingText(rawInput) {
  const raw = text(rawInput).trim();
  if (raw === '') return { desc: '', impact: '' };
  const marker = /(?:\n|^)\s*(?:\(2\)|2[.、])\s*(?:风险分析\/影响|风险分析|影响)\s*[:：]?/;
  const inline = /(?<=^|[\n。；;！？])\s*(?:风险分析\/影响|风险分析|影响)\s*[:：]/;
  const match = raw.match(marker) || raw.match(inline);
  if (!match || typeof match.index !== 'number') return { desc: raw, impact: '' };
  const head = raw.slice(0, match.index);
  const tail = raw.slice(match.index + match[0].length);
  const desc = head
    .replace(/^\s*(?:\(1\)|1[.、])\s*/, '')
    .replace(/^\s*(?:漏洞描述|描述)\s*[:：]?\s*/, '')
    .replace(/[\s。；;！？]+$/, '')
    .trim();
  const impact = tail
    .replace(/^\s*(?:\(2\)|2[.、])\s*/, '')
    .replace(/^\s*(?:风险分析\/影响|风险分析|影响)\s*[:：]?\s*/, '')
    .trim();
  return { desc, impact };
}

const AUX_LEADING = [
  /^(?:对照验证|对照实验|对比验证|反证|补充验证|交叉验证)/,
  /^(?:清理现场|还原现场|还原|恢复现场|删除测试数据|收尾)/,
  /^(?:统计(?:泄露)?规模|统计规模|条数统计|数量统计)/,
  /^(?:命令行一键复现|一键复现|命令行复现)/,
  /^(?:保存响应|落盘|导出响应|写入文件)/,
  /^(?:准备环境|环境准备|安装工具|建立目录|起\s*VPS)/,
  /^(?:证据路径|证据清单|证据文件|落盘路径|输出路径|导出路径|留档路径|原始报文路径)/,
  /^(?:源码定位|源码分析|源码级定位|代码审计|根因分析|成因分析|原理分析|漏洞成因)/,
  /^(?:静态确认|静态验证|静态分析|代码确认|源码确认|特征串确认|bundle\s*分析)/
];

const AUX_SCRIPT = [
  /\bcurl(?:\.exe)?\b[^\n]*?\s-o\s+(?!NUL\b|nul\b|\/dev\/null\b)\S+/i,
  /\bwget\s+-O\s|\|\s*tee\s|\bOut-File\b|\bSet-Content\b/i,
  /System\.(?:Text|IO)\.|\[regex\]|ReadAllBytes|Get-Content/i,
  /\b(?:lead|worker|agent|tmp|temp|probe)_[\w.-]+\.(?:json|txt|log|html|xml)/i,
  /统计(?:泄露)?规模|条数统计|共\s*\d+\s*条|Matches\(/i,
  /落盘|保存(?:响应|到文件)|导出到本地/,
  /\b[\w.-]+_\d+-\d{4}-\d{4}[\\/]/,
  /[A-Za-z]:\\Users\\|[A-Za-z]:\\Documents\\|[A-Za-z]:\\Temp\//i,
  /\bfindstr\b|\bgrep\s+-[a-zA-Z]*\s+[\w./\\-]+/i
];

export function isAuxiliaryStep(step) {
  const raw = text(step);
  if (raw.trim() === '') return false;
  const body = raw.replace(/^\s*步骤\s*\d+\s*/, '').trim();
  if (body === '') return false;
  for (const re of AUX_LEADING) if (re.test(body)) return true;
  if (!HTTP_REQUEST_LINE.test(body)) {
    for (const re of AUX_SCRIPT) if (re.test(body)) return true;
  }
  return false;
}

export function stepsForReport(steps) {
  const all = asArray(steps);
  const kept = all.filter((step) => !isAuxiliaryStep(step));
  return kept.length === 0 ? all : kept;
}

/** 一步 = 说明（+预期） + 原始 HTTP 请求/响应。 */
export function splitStepText(rawInput) {
  const raw = text(rawInput);
  const body = raw.replace(/^\s*步骤\s*\d+\s*/, '').trim();
  if (body === '') return { note: '', expect: '', request: '', response: '' };
  const reqMark = /(?:\n|^)\s*((?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|TRACE|CONNECT)\s+\S+\s+HTTP\/[\d.]+[\s\S]*)$/;
  const qm = body.match(reqMark);
  let head = body;
  let tail = '';
  if (qm && typeof qm.index === 'number') {
    head = body.slice(0, qm.index);
    tail = qm[1].trim();
  }
  let expect = '';
  const expectMatch = head.match(/[（(]\s*预期\s*([\s\S]*)[）)]\s*[:：]?\s*$/) || head.match(/预期\s*[:：]\s*([\s\S]*)$/);
  if (expectMatch && typeof expectMatch.index === 'number') {
    expect = expectMatch[1].trim();
    head = head.slice(0, expectMatch.index).trim();
  }
  // 说明行去掉模型常写的“步骤1：”“：”等前缀/标点。
  const note = head.trim().replace(/^[:：，,。;；\s]+/, '').replace(/[:：\s]*$/, '').trim();
  let request = tail;
  let response = '';
  if (tail !== '') {
    const respMark = /(?:\n|^)\s*(?:——\s*响应\s*——|实际响应体|实际响应|响应内容|响应体|响应)\s*[:：]?\s*/;
    const rm = tail.match(respMark);
    if (rm && typeof rm.index === 'number') {
      request = tail.slice(0, rm.index).trim();
      response = tail.slice(rm.index + rm[0].length).trim();
    } else {
      const em = tail.match(/(?:\n|^)\s*(?:预期|返回)\s*([\s\S]*)$/);
      if (em && typeof em.index === 'number') {
        request = tail.slice(0, em.index).trim();
        const extra = em[1].trim();
        expect = expect === '' ? extra : `${expect}；${extra}`;
      }
    }
  }
  // 有些 finding 的 step 没有「响应」标记，响应直接贴在请求包后的空行。
  // 末尾的 HTTP/1.x NNN 状态行切成响应，保证报告是完整请求 + 完整响应两块。
  const trailingResponse = request.match(/(?:\n|^)\s*(HTTP\/1\.[01]\s+[1-5]\d\d[\s\S]*)$/);
  if (response === '' && trailingResponse && typeof trailingResponse.index === 'number') {
    response = trailingResponse[1].trim();
    request = request.slice(0, trailingResponse.index).trim();
  }
  return { note, expect, request, response };
}

const NATURAL_VERB = /(?:写入|刷新|发送|提交|上传|下载|访问|请求|抓取|构造|修改|替换|删除|创建|调用|登录|导入|注入|回显|重放|放包|拦截|触发)/;
const ALREADY_TAIL = /[:：，。；;]$|(?:如下|请求包|报文|发送|原始请求包)\s*[:：]?$/;

export function naturalStepNote(noteInput, index) {
  const raw = text(noteInput).trim();
  if (raw === '') return index === 0 ? '以下为原始请求包：' : '发送请求包：';
  if (ALREADY_TAIL.test(raw)) return /[：:]$/.test(raw) ? raw : `${raw}：`;
  if (NATURAL_VERB.test(raw)) return `${raw}，发送请求包：`;
  return `${raw}：`;
}

export function expectAsResult(expectInput) {
  const raw = text(expectInput).trim().replace(/^预期\s*[:：]?\s*/, '');
  if (raw === '') return '';
  if (/^(?:返回|响应|得到|成功|失败|HTTP\s*\d)/i.test(raw)) return raw;
  return `返回 ${raw}`;
}

function stepRequestInfo(stepInput) {
  const raw = text(stepInput);
  const line = raw.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)\s+(\S+)\s+HTTP\b/i);
  const host = raw.match(/^Host:\s*(\S+)/mi);
  return { method: line ? line[1].toUpperCase() : '', path: line ? line[2] : '', host: host ? host[1] : '' };
}

function fallbackStepNote(stepInput, index, finding) {
  const info = stepRequestInfo(stepInput);
  const title = text(finding && finding.title).replace(/\s+/g, ' ').trim().slice(0, 64);
  const target = [info.host, info.path].filter(Boolean).join('');
  if (info.method && target) {
    if (index === 0) return `向 ${target} 发送 ${info.method} 请求，用于验证「${title || '该漏洞'}」；观察响应是否出现预期特征。`;
    return `继续向 ${target} 发送 ${info.method} 请求，用于复核上一步结果并确认「${title || '该漏洞'}」。`;
  }
  if (index === 0) return `记录并确认「${title || '该漏洞'}」的请求上下文。`;
  return `继续验证「${title || '该漏洞'}」的后续步骤。`;
}

function formatStep(stepInput, index, noteOverride = '', finding = null) {
  const step = splitStepText(stepInput);
  const noteRaw = text(noteOverride) || step.note || fallbackStepNote(stepInput, index, finding);
  const note = noteRaw.replace(/^\s*(?:步骤\s*\d+\s*[:：]?\s*|\d+\s*[)）.、]\s*)/, '').trim();
  const noteDisplay = /[：。！？!?.]$/.test(note) ? note : `${note}：`;
  const lines = [];
  const prefix = `**步骤 ${index + 1}：** `;
  if (step.request !== '') {
    lines.push(prefix + noteDisplay);
    lines.push('');
    lines.push('```http');
    lines.push(step.request);
    lines.push('```');
    lines.push('');
    if (step.response !== '') {
      lines.push('返回：');
      lines.push('');
      lines.push('```');
      lines.push(step.response);
      lines.push('```');
      lines.push('');
    } else if (step.expect !== '') {
      lines.push(expectAsResult(step.expect));
      lines.push('');
    }
    return lines;
  }
  const tail = step.expect === '' ? '' : `，${expectAsResult(step.expect)}`;
  lines.push(`${prefix}${noteDisplay}${tail}`);
  lines.push('');
  return lines;
}

function interfaceSourcesOf(finding) {
  const out = [];
  const add = (value) => {
    const item = text(value);
    if (item !== '' && !out.includes(item)) out.push(item);
  };
  for (const key of ['apiSources', 'interfaceSources', 'sourceFiles', 'sources']) {
    for (const item of asArray(finding && finding[key])) add(item);
  }
  add(finding && finding.apiSource);
  add(finding && finding.interfaceSource);
  const refs = [...asArray(finding && finding.evidenceRefs), text(finding && finding.trafficRef)]
    .filter((item) => /(?:\.js|\.mjs|\.ts|\.tsx|\.map|bundle|sourcemap|static[\\/]js|assets[\\/]index-)/i.test(text(item)));
  for (const ref of refs) add(ref);
  // 历史 finding 没写 apiSources 时，从描述/证据/步骤里回捞见过的 JS 文件名/URL。
  const haystack = [
    finding && finding.description,
    finding && finding.report,
    finding && finding.poc,
    finding && finding.impactEvidence,
    ...asArray((finding && finding.reproducibleSteps) || (finding && finding.steps))
  ].map((item) => text(item)).join('\n');
  const mentioned = haystack.match(/(?:https?:\/\/[^\s"'<>]+\.js(?:\?[^\s"'<>]*)?|[\w./-]+\.js(?:\?[^\s"'<>]*)?)/gi) || [];
  for (const item of mentioned) add(item);
  return out;
}

function conciseSentences(value, maxSentences = 2, maxChars = 260) {
  let text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text === '') return '';
  const parts = text.match(/[^。！？!?]+[。！？!?]?/g) || [text];
  let out = parts.slice(0, maxSentences).join('').trim();
  if (out.length > maxChars) out = `${out.slice(0, maxChars - 1).replace(/[，,；;、\s]+$/, '')}…`;
  return out;
}

function conciseRemediation(value, maxItems = 3) {
  const raw = String(value || '').trim();
  if (raw === '') return [];
  let items = raw.split(/\n+|(?=\d+[)）.、]\s*)/).map((s) => s.trim()).filter(Boolean);
  if (items.length <= 1) items = raw.match(/[^；;。!?！？]+[；;。!?！？]?/g) || [raw];
  return items.slice(0, maxItems)
    .map((s) => s.replace(/^\d+[)）.、]\s*/, '').replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
}

function allRemediationItems(value) {
  const raw = String(value || '').trim();
  if (raw === '') return [];
  let items = raw.split(/\n+|(?=\d+[)）.、]\s*)/).map((s) => s.trim()).filter(Boolean);
  if (items.length <= 1) items = raw.match(/[^；;。!?！？]+[；;。!?！？]?/g) || [raw];
  return items
    .map((s) => s.replace(/^\d+[)）.、]\s*/, '').replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
}

function assetHost(value) {
  const raw = String(value || '').trim();
  if (raw === '') return '';
  try {
    return new URL(raw.includes('://') ? raw : 'http://' + raw).hostname.toLowerCase();
  } catch (error) {
    return '';
  }
}

function assetsForFinding(finding, assets) {
  const list = Array.isArray(assets) ? assets : [];
  const keys = new Set();
  if (typeof finding?.affectedAssetId === 'string' && finding.affectedAssetId !== '') keys.add(finding.affectedAssetId);
  for (const item of Array.isArray(finding?.affectedAssets) ? finding.affectedAssets : []) {
    if (typeof item === 'string' && item !== '') keys.add(item);
  }
  const keyHosts = new Set([...keys].map(assetHost).filter(Boolean));
  return list.filter((asset) => {
    if (keys.has(asset?.id) || keys.has(asset?.value)) return true;
    const host = assetHost(asset?.value);
    if (host !== '' && keyHosts.has(host)) return true;
    const value = String(asset?.value || '');
    return [...keys].some((key) => key.length >= 4 && (value.includes(key) || String(asset?.id || '').includes(key)));
  });
}

function findingSection(finding, state, index) {
  const lines = [];
  const severity = effectiveSeverity(finding);
  lines.push(`### ${index + 1}. ${text(finding.title)}（风险程度：${CN[severity]}）`);
  lines.push('');

  const split = splitFindingText(finding.description);
  const desc = conciseSentences(split.desc || text(finding.description).trim(), 2, 120);
  lines.push('#### 漏洞描述');
  lines.push('');
  lines.push(desc || '（未记录）');
  lines.push('');

  lines.push('#### 接口来源');
  lines.push('');
  const sources = interfaceSourcesOf(finding);
  if (sources.length === 0) {
    lines.push('- 未记录（请用 pentest_update_finding 补充 apiSources：JS bundle / 源文件 / 路由定义位置）');
  } else {
    for (const source of sources) lines.push(`- ${source}`);
  }
  lines.push('');

  lines.push('#### 测试过程');
  lines.push('');
  const intent = asArray(state.intents).find((item) => item.id === finding.intentId);
  if (intent) {
    lines.push(`功能点：${text(intent.title)}`);
    lines.push('');
  }
  const linkedAssets = assetsForFinding(finding, asArray(state.assets));
  for (const asset of linkedAssets) {
    lines.push(`漏洞链接：[${text(asset.type)}] ${text(asset.value)}`);
  }
  if (linkedAssets.length > 0) lines.push('');
  const rawSteps = asArray(finding.reproducibleSteps).length > 0 ? finding.reproducibleSteps : finding.steps;
  const stepNotes = asArray(finding.stepNotes);
  const entries = asArray(rawSteps).map((step, index) => ({ step, note: text(stepNotes[index]) }));
  const kept = entries.filter((entry) => !isAuxiliaryStep(entry.step));
  const use = kept.length > 0 ? kept : entries;
  if (use.length === 0) {
    lines.push('（尚未记录可复现步骤：请用 pentest_update_finding 补充 reproducibleSteps。）');
    lines.push('');
  } else {
    use.forEach((entry, stepIndex) => lines.push(...formatStep(entry.step, stepIndex, entry.note, finding)));
  }
  if (finding.validation && typeof finding.validation === 'object') {
    const verdict = text(finding.validation.verdict);
    const verdictLabel = verdict === 'reproduced' ? '已复现' : verdict === 'not_reproduced' ? '未复现' : verdict === 'inconclusive' ? '待确认' : verdict;
    if (verdictLabel !== '') {
      lines.push(`验证结论：${verdictLabel}`);
      lines.push('');
    }
  } else if (!Array.isArray(finding.evidenceRefs) || finding.evidenceRefs.length === 0) {
    lines.push('验证结论：未独立验证（缺少 evidenceRefs 或独立复现记录）');
    lines.push('');
  }

  lines.push('#### 风险分析');
  lines.push('');
  const risk = conciseSentences(text(finding.riskAnalysis).trim() || split.impact || text(finding.impactEvidence).trim(), 2, 120);
  lines.push(risk || '（未记录影响分析。）');
  lines.push('');

  lines.push('#### 修复建议');
  lines.push('');
  const remediation = conciseRemediation(finding.remediation, 3);
  if (remediation.length === 0) lines.push('（待补充）');
  else remediation.forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  if (finding.retest) {
    lines.push('#### 复测');
    lines.push('');
    lines.push(`- 结论：${text(finding.retest.verdict)}`);
    if (finding.retest.summary) lines.push(`- 说明：${text(finding.retest.summary)}`);
    lines.push('');
  }
  return lines;
}

/**
 * 生成报告。结构严格按《报告样例-新格式.md》，不追加探索链路附录。
 */
export function buildReport(state) {
  if (Number(state?.version) >= 3) return renderReportStateMarkdown(state);
  if (!state?.goal) {
    return '# 渗透测试报告\n\n（尚未初始化：请先调用 pentest_add_goal 记录目标与目的。）\n';
  }
  const goal = state.goal;
  const reportable = reportableFindings(state);
  const grouped = Object.fromEntries(ORDER.map((severity) => [severity, []]));
  for (const finding of reportable) {
    const severity = effectiveSeverity(finding);
    (grouped[severity] || grouped.info).push(finding);
  }

  const lines = [];
  lines.push('# 渗透测试报告');
  lines.push('');
  lines.push(`- 测试目标：${text(goal.target)}`);
  lines.push(`- 测试目的：${text(goal.objective)}`);
  lines.push(`- 授权范围：${text(goal.authorization) === '' ? '（未声明）' : text(goal.authorization)}`);
  lines.push('');
  lines.push('## 一、摘要');
  lines.push('');
  const counts = ORDER.slice(0, 4).map((severity) => `${CN[severity]} ${grouped[severity].length} 个`).join('、');
  lines.push(`本次测试共发现 ${reportable.length} 个安全问题：${counts}。`);
  lines.push('');
  if (reportable.length > 0) {
    lines.push('| 序号 | 问题等级 | 安全问题名称 |');
    lines.push('| --- | --- | --- |');
    let index = 0;
    for (const severity of ORDER) {
      for (const finding of grouped[severity]) {
        index += 1;
        lines.push(`| ${index} | ${CN[severity]} | ${escapeCell(finding.title)} |`);
      }
    }
    lines.push('');
  }

  lines.push('## 二、测试过程详述');
  lines.push('');
  if (reportable.length === 0) {
    lines.push('（本次测试未发现已确认的安全问题。）');
    lines.push('');
  } else {
    let index = 0;
    for (const severity of ORDER) {
      for (const finding of grouped[severity]) {
        lines.push(...findingSection(finding, state, index));
        index += 1;
      }
    }
  }

  lines.push('## 三、资产清单');
  lines.push('');
  if (asArray(state.assets).length === 0) {
    lines.push('（未记录资产。）');
    lines.push('');
  } else {
    lines.push('| 类型 | 资产 | 说明 |');
    lines.push('| --- | --- | --- |');
    for (const asset of asArray(state.assets)) {
      lines.push(`| ${text(asset.type)} | ${text(asset.value)} | ${text(asset.meta) === '' ? '-' : escapeCell(asset.meta)} |`);
    }
    lines.push('');
  }

  if (asArray(state.coverage).length > 0) {
    const outcomeLabel = {
      reported: '已报告',
      no_issue_found: '未发现问题',
      ruled_out: '已排除',
      not_applicable: '不适用',
      needs_follow_up: '需跟进'
    };
    lines.push('## 四、测试覆盖');
    lines.push('');
    lines.push('| 攻击面 | 风险区域 | 结论 | 证据 |');
    lines.push('| --- | --- | --- | --- |');
    for (const row of asArray(state.coverage)) {
      lines.push(`| ${escapeCell(row.surface)} | ${escapeCell(row.riskArea)} | ${outcomeLabel[row.outcome] || text(row.outcome)} | ${row.evidence ? escapeCell(row.evidence) : '-'} |`);
    }
    lines.push('');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function escapeHtml(value) {
  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 自包含 HTML：Word / 浏览器 / PDF 打印可直接打开。 */
export function reportToHtml(markdown, title = '渗透测试报告') {
  const lines = text(markdown).split('\n');
  const rows = [];
  let paragraph = [];
  let list = [];
  let code = null;
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    rows.push(`<p>${paragraph.map(escapeHtml).join('<br>')}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    rows.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    list = [];
  };
  const flushCode = () => {
    if (code === null) return;
    rows.push(`<pre>${escapeHtml(code.join('\n'))}</pre>`);
    code = null;
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('```')) {
      flushParagraph(); flushList();
      if (code === null) code = []; else flushCode();
      continue;
    }
    if (code !== null) { code.push(line); continue; }
    if (line.trim() === '') { flushParagraph(); flushList(); continue; }
    if (line.startsWith('|')) {
      flushParagraph(); flushList();
      const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
      const next = lines[i + 1] || '';
      if (/^[\s|:-]+$/.test(next)) {
        const header = cells.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('');
        const body = [];
        i += 2;
        while (i < lines.length && lines[i].startsWith('|')) {
          const rowCells = lines[i].replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
          body.push(`<tr>${rowCells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`);
          i += 1;
        }
        i -= 1;
        rows.push(`<table><thead><tr>${header}</tr></thead><tbody>${body.join('')}</tbody></table>`);
        continue;
      }
    }
    if (line.startsWith('### ')) { flushParagraph(); flushList(); rows.push(`<h3>${escapeHtml(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## ')) { flushParagraph(); flushList(); rows.push(`<h2>${escapeHtml(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# ')) { flushParagraph(); flushList(); rows.push(`<h1>${escapeHtml(line.slice(2))}</h1>`); continue; }
    if (line.startsWith('> ')) { flushParagraph(); flushList(); rows.push(`<blockquote>${escapeHtml(line.slice(2))}</blockquote>`); continue; }
    if (line.startsWith('- ')) { flushParagraph(); list.push(line.slice(2)); continue; }
    paragraph.push(line);
  }
  flushParagraph(); flushList(); flushCode();
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
body{font:14px/1.7 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;max-width:980px;margin:32px auto;padding:0 24px;color:#1f2328}
h1{font-size:26px;border-bottom:1px solid #d0d7de;padding-bottom:8px}h2{font-size:20px;margin-top:28px}h3{font-size:16px;margin-top:22px}
table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #d0d7de;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f6f8fa}
pre{background:#f6f8fa;border:1px solid #d0d7de;border-radius:6px;padding:12px;overflow:auto;font-size:12px;line-height:1.5}
blockquote{margin:8px 0;padding:4px 12px;border-left:4px solid #d0d7de;color:#57606a}ul{padding-left:24px}
</style></head><body>${rows.join('\n')}</body></html>
`;
}
