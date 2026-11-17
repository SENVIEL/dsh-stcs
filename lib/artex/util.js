/**
 * Small deterministic helpers shared by the STCS coordinator modules.
 *
 * Pure functions only: no I/O, no clocks, no mutable module state.
 */
import crypto from 'node:crypto';

export function text(value) {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value : String(value);
}

export function flat(value, max = 220) {
  const valueText = text(value).replace(/\s+/g, ' ').trim();
  return valueText.length > max ? `${valueText.slice(0, Math.max(0, max - 1))}…` : valueText;
}

export function slug(value, max = 48) {
  const raw = text(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return (raw || 'x').slice(0, max);
}

export function hashShort(value, size = 10) {
  return crypto.createHash('sha1').update(text(value)).digest('hex').slice(0, size);
}

/** Stable, readable id. The hash suffix prevents slug collisions between long URLs. */
export function stableId(prefix, ...parts) {
  const joined = parts.map((item) => text(item)).filter(Boolean).join('|');
  return `${prefix}-${slug(joined, 40)}-${hashShort(joined)}`;
}

export function uniqueBy(items, keyFn) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function tokenSet(value) {
  return new Set(
    text(value)
      .toLowerCase()
      .split(/[^a-z0-9\u4e00-\u9fff._/-]+/i)
      .map((item) => item.trim())
      .filter((item) => item.length >= 3)
  );
}

export function relevanceScore(value, seeds) {
  const hay = text(value).toLowerCase();
  let score = 0;
  for (const seed of seeds) if (seed && hay.includes(seed)) score += 1;
  return score;
}

export function shortQuestion(value, max = 120) {
  return flat(value, max);
}
