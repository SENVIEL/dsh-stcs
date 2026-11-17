/**
 * Minimal evidence attachment for a fresh STCS worker.
 *
 * The coordinator does the global retrieval; the worker receives only a few
 * snippets relevant to its one hypothesis. This replaces the old
 * `buildSituationalPack`, which leaked every fact/conclusion/sibling trace into
 * every worker prompt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { asArray, relevanceScore, text, tokenSet } from './util.js';

const MAX_ITEMS = 3;
const MAX_BYTES = 8192;

function excerptOf(file, maxBytes) {
  let fd = null;
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size <= 0) return '';
    const size = Math.max(1, Math.min(Number(maxBytes) || 0, stat.size));
    const buffer = Buffer.alloc(size);
    fd = fs.openSync(file, 'r');
    const read = fs.readSync(fd, buffer, 0, size, 0);
    const value = buffer.subarray(0, read).toString('utf8').replace(/\u0000/g, '').trim();
    return value.length > maxBytes ? `${value.slice(0, maxBytes)}…` : value;
  } catch {
    return '';
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch { /* best effort */ }
    }
  }
}

function scoreEvidence(row, seeds) {
  const blob = `${text(row?.summary)} ${text(row?.path)} ${text(row?.kind)} ${text(row?.role)}`;
  const relevance = relevanceScore(blob, seeds);
  if (relevance <= 0) return 0;
  return relevance
    + (text(row?.role) === 'proof' ? 5 : 0)
    + (text(row?.role) === 'verification' ? 4 : 0)
    + (text(row?.kind) === 'response' ? 2 : 0)
    + (text(row?.kind) === 'request' ? 2 : 0);
}

/**
 * @param {object} input
 * @param {object} input.state canonical v4 state
 * @param {object} input.hypothesis one hypothesis node
 * @param {string} input.cwd workdir used to resolve evidence paths
 * @param {number} [input.maxItems]
 * @param {number} [input.maxBytes]
 * @param {object} [input.fsImpl]
 */
export function selectMinimalAttachment({
  state,
  hypothesis,
  cwd,
  maxItems = MAX_ITEMS,
  maxBytes = MAX_BYTES,
  fsImpl = fs
} = {}) {
  const root = path.resolve(text(cwd) || '.');
  const seeds = [...tokenSet(`${text(hypothesis?.claim)} ${text(hypothesis?.reason)}`)];
  const rows = asArray(state?.evidence)
    .filter((item) => item && text(item.path))
    .map((item) => ({ item, score: scoreEvidence(item, seeds) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Number(maxItems) || MAX_ITEMS));

  const items = [];
  let usedBytes = 0;
  for (const { item } of rows) {
    const resolved = path.resolve(root, text(item.path));
    if (resolved !== root && !resolved.startsWith(root + path.sep)) continue;
    const remaining = Math.max(0, Number(maxBytes) - usedBytes);
    if (remaining <= 0) break;
    const excerpt = excerptOf(resolved, Math.min(remaining, 2048));
    if (!excerpt) continue;
    const row = {
      evidenceId: text(item.id),
      path: text(item.path),
      kind: text(item.kind),
      role: text(item.role),
      summary: text(item.summary),
      sha256: text(item.sha256),
      excerpt
    };
    items.push(row);
    usedBytes += Buffer.byteLength(excerpt, 'utf8');
  }

  return {
    items,
    bytes: usedBytes,
    note: items.length > 0
      ? `仅附与本假设相关的 ${items.length} 条证据；不要假设你知道其它 worker 的结论。`
      : '没有匹配的历史证据；按本假设自行做最小验证。'
  };
}

export function formatAttachment(attachment) {
  if (!attachment || !Array.isArray(attachment.items) || attachment.items.length === 0) {
    return [
      '【最小证据附件】',
      attachment?.note || '无匹配证据。'
    ].join('\n');
  }
  const lines = ['【最小证据附件（只读；仅本假设相关）】'];
  for (const item of attachment.items) {
    lines.push(`- ${item.evidenceId || 'evidence'} [${item.kind}/${item.role}] ${item.path}`);
    if (item.summary) lines.push(`  summary: ${item.summary}`);
    if (item.excerpt) {
      const excerpt = item.excerpt.replace(/\r\n/g, '\n').slice(0, 1200);
      lines.push('  excerpt:');
      lines.push(...excerpt.split('\n').map((line) => `  | ${line}`));
    }
  }
  if (attachment.note) lines.push(attachment.note);
  return lines.join('\n');
}
