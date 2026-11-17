/**
 * Small JSON diff used by the live UI snapshot channel.
 *
 * The full view model is 0.6–3.2 MB. Writing it to the session log on every
 * revision caused multi-hundred-MB session logs and OOMed the host on open.
 * The hot path now sends object/array deltas; a full snapshot is only used when
 * there is no in-process base (first event after restart) or when the caller
 * explicitly forces a repair.
 */
const SET = '__stcsSet';
const APPEND = '__stcsAppend';
const OBJECT = '__stcsObject';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function jsonEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffValue(previous, next) {
  if (jsonEqual(previous, next)) return null;
  if (Array.isArray(previous) && Array.isArray(next)) {
    const prefix = previous.length <= next.length
      && previous.every((item, index) => jsonEqual(item, next[index]));
    if (prefix && next.length > previous.length) {
      return { [APPEND]: next.slice(previous.length) };
    }
    return { [SET]: next };
  }
  if (isObject(previous) && isObject(next)) {
    const patch = {};
    let changed = false;
    for (const key of Object.keys(next)) {
      const child = diffValue(previous[key], next[key]);
      if (child !== null) {
        patch[key] = child;
        changed = true;
      }
    }
    for (const key of Object.keys(previous)) {
      if (Object.prototype.hasOwnProperty.call(next, key)) continue;
      patch[key] = { [SET]: null };
      changed = true;
    }
    return changed ? { [OBJECT]: patch } : null;
  }
  return { [SET]: next };
}

/** Return a JSON-safe patch for `next`, or null when nothing changed. */
export function diffProjection(previous, next) {
  if (!previous || !next) return null;
  const patch = {};
  let changed = false;
  for (const key of Object.keys(next)) {
    const child = diffValue(previous[key], next[key]);
    if (child !== null) {
      patch[key] = child;
      changed = true;
    }
  }
  for (const key of Object.keys(previous)) {
    if (Object.prototype.hasOwnProperty.call(next, key)) continue;
    patch[key] = { [SET]: null };
    changed = true;
  }
  return changed ? patch : null;
}

function applyValue(previous, patch) {
  if (!patch || typeof patch !== 'object') return previous;
  if (Object.prototype.hasOwnProperty.call(patch, SET)) return patch[SET];
  if (Object.prototype.hasOwnProperty.call(patch, APPEND)) {
    return [...(Array.isArray(previous) ? previous : []), ...(Array.isArray(patch[APPEND]) ? patch[APPEND] : [])];
  }
  if (Object.prototype.hasOwnProperty.call(patch, OBJECT)) {
    return applyObject(previous, patch[OBJECT]);
  }
  return patch;
}

function applyObject(previous, patch) {
  const next = isObject(previous) ? { ...previous } : {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, SET) && value[SET] === null) {
      delete next[key];
      continue;
    }
    next[key] = applyValue(next[key], value);
  }
  return next;
}

/** Apply a patch produced by {@link diffProjection}. */
export function applyProjectionPatch(previous, patch) {
  if (!patch || typeof patch !== 'object') return previous;
  return applyObject(previous, patch);
}
