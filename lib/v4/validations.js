/**
 * Validation lookup policy.
 *
 * A finding can have many validation rows over time (Lead retries, auditor
 * re-reviews, retests). The display and delivery gates must always read the
 * latest non-superseded row, never `find(...)` which returns the oldest one.
 */

function idOrdinal(value) {
  const match = String(value || '').match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function validationOrdinal(validation) {
  return (Number(validation?.at) || 0) * 1_000_000 + idOrdinal(validation?.id);
}

/** Latest non-superseded validation for one finding, or undefined. */
export function latestValidationFor(validations, findingId) {
  const id = String(findingId || '');
  if (!id) return undefined;
  const rows = (Array.isArray(validations) ? validations : [])
    .filter((item) => item && String(item.findingId || '') === id && item.superseded !== true);
  if (rows.length === 0) return undefined;
  return rows.slice().sort((a, b) => validationOrdinal(a) - validationOrdinal(b)).at(-1);
}

/** True only when the latest validation is an independent auditor reproduction. */
export function hasAuditorReproduction(validations, findingId) {
  const latest = latestValidationFor(validations, findingId);
  return Boolean(latest
    && latest.verdict === 'reproduced'
    && latest.validator === 'agent:pentest-auditor'
    && latest.superseded !== true);
}

/** True when the latest validation reproduces the finding (any validator). */
export function hasReproduction(validations, findingId) {
  return latestValidationFor(validations, findingId)?.verdict === 'reproduced';
}
