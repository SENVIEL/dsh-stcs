/**
 * Vulnerability-level dedupe policy.
 *
 * Identity is the final vulnerability type plus its root cause/component,
 * NOT the endpoint, parameter, host, port or evidence file. The same
 * vulnerability described with different words, or reached through different
 * interfaces, is still one vulnerability with multiple affected assets.
 */
export function normalizeDedupeKey({ vulnType, rootCause }) {
  const type = text(vulnType).trim().toLowerCase();
  const cause = text(rootCause).trim().toLowerCase();
  if (!type) throw new Error('vulnType is required for dedupe');
  if (!cause) throw new Error('rootCause is required for dedupe');
  return `${type}:${cause}`;
}

export function sameVulnerability(a, b) {
  if (!a || !b) return false;
  const left = text(a.dedupeKey).trim().toLowerCase();
  const right = text(b.dedupeKey).trim().toLowerCase();
  return Boolean(left && right && left === right);
}

function text(value) {
  return value == null ? '' : String(value);
}
