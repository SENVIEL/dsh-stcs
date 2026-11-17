/**
 * Dependency-free, deterministic DOCX writer.
 *
 * It writes a stored (uncompressed) ZIP containing the minimum OOXML parts
 * required by Word. It intentionally does not execute application code and
 * does not rely on a model for layout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPORT_TEMPLATE } from './report-template.js';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const out = Buffer.alloc(2);
  out.writeUInt16LE(value >>> 0, 0);
  return out;
}

function u32(value) {
  const out = Buffer.alloc(4);
  out.writeUInt32LE(value >>> 0, 0);
  return out;
}

function zipStore(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
    const crc = crc32(data);
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameBuf.length), u16(0), nameBuf, data
    ]);
    const central = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameBuf.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBuf
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(centrals.length), u16(centrals.length),
    u32(centralSize), u32(offset), u16(0)
  ]);
  return Buffer.concat([...locals, ...centrals, end]);
}

function xml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

function paragraph(text, { bold = false, size = 22, heading = false } = {}) {
  const style = heading ? '<w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>' : '';
  const runProps = `<w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
  return `<w:p>${style}<w:r>${runProps}<w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
}

function documentXml(state, now) {
  const goal = state.goal || {};
  const findings = (state.findings || []).filter((item) => item.deleted !== true && item.severity !== 'info');
  const confirmed = findings.filter((item) => item.status === 'confirmed' && item.impactProven !== 'none');
  const pending = findings.filter((item) => item.approvalStatus === 'pending');
  const unconfirmed = findings.filter((item) => item.status !== 'confirmed' && !pending.includes(item));
  const targets = (Array.isArray(goal.targets) && goal.targets.length ? goal.targets : [goal.target]).filter(Boolean);
  const body = [];
  body.push(paragraph(REPORT_TEMPLATE.title, { bold: true, size: 36, heading: true }));
  body.push(paragraph(`目标：${targets.join('、') || '（未记录）'}`));
  body.push(paragraph(`目的：${goal.objective || '（未记录）'}`));
  body.push(paragraph(`授权：${goal.authorization || '（未记录）'}`));
  body.push(paragraph(`生成时间：${now.toISOString()}`));
  body.push(paragraph('执行摘要', { bold: true, size: 30, heading: true }));
  body.push(paragraph(`已确认漏洞 ${confirmed.length} 条，未确认 ${unconfirmed.length} 条，待用户审批 ${pending.length} 条。`));
  body.push(paragraph('授权与范围', { bold: true, size: 30, heading: true }));
  body.push(paragraph(`in-scope：${targets.join('、') || '（未记录）'}`));
  body.push(paragraph(`excluded：${(goal.excludedTargets || []).join('、') || '（无）'}`));
  body.push(paragraph('已确认发现', { bold: true, size: 30, heading: true }));
  if (confirmed.length === 0) body.push(paragraph('（无）'));
  for (const finding of confirmed) {
    body.push(paragraph(`[${finding.severity}] ${finding.title || finding.claim}`, { bold: true, size: 26, heading: true }));
    body.push(paragraph(`状态：${finding.status}    影响：${finding.impactProven || 'unknown'}`));
    body.push(paragraph('漏洞描述', { bold: true }));
    body.push(paragraph(finding.description || finding.claim));
    body.push(paragraph('测试过程', { bold: true }));
    const steps = Array.isArray(finding.steps) ? finding.steps : [];
    if (steps.length === 0) body.push(paragraph('（未记录可复现步骤）'));
    steps.forEach((step, index) => body.push(paragraph(`${index + 1}. ${String(step).replace(/\r\n/g, '\n')}`)));
    body.push(paragraph('风险分析', { bold: true }));
    body.push(paragraph(finding.riskAnalysis || '（未记录风险分析）'));
    body.push(paragraph('修复建议', { bold: true }));
    body.push(paragraph(finding.remediation || '（未记录修复建议）'));
    body.push(paragraph(`证据：${(finding.evidenceIds || []).join(', ') || '（无）'}`));
  }
  body.push(paragraph('未确认发现', { bold: true, size: 30, heading: true }));
  if (unconfirmed.length === 0) body.push(paragraph('（无）'));
  for (const finding of unconfirmed) body.push(paragraph(`[${finding.severity}] ${finding.claim}（${finding.status || 'unverified'}）`));
  body.push(paragraph('待用户审批（红线）', { bold: true, size: 30, heading: true }));
  if (pending.length === 0) body.push(paragraph('（无）'));
  for (const finding of pending) body.push(paragraph(`[${finding.severity}] ${finding.claim}：${finding.proposedAction || '等待审核'}`));
  body.push(paragraph('覆盖与证据', { bold: true, size: 30, heading: true }));
  for (const item of state.evidence || []) body.push(paragraph(`${item.id} | ${item.kind || ''} | ${item.path || ''} | ${item.sha256 || ''}`));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
}

export function renderV4Docx(state, { now = new Date() } = {}) {
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/document.xml': documentXml(state, now)
  };
  return zipStore(files);
}

export function writeV4Docx(state, targetPath, options = {}) {
  const resolved = path.resolve(targetPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const bytes = renderV4Docx(state, options);
  fs.writeFileSync(resolved, bytes);
  return { path: resolved, bytes: bytes.length, templateId: REPORT_TEMPLATE.id };
}
