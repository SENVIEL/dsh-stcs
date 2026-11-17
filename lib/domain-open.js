/**
 * Shared storage-domain opening.
 *
 * DSH mounts every installed agent preset eagerly in one Host process, so
 * several `dsh-pentest-v2` instances (one per preset that includes the row)
 * can want the same domain name. The domain facility reserves a name while
 * its open is in flight and rejects every other opener with `already-open`;
 * the handle then belongs to the winning instance.
 *
 * A losing opener must wait for the winner to publish the handle and share
 * it, not cache a rejected promise: the v4 tools would otherwise stay broken
 * for the rest of the process, which is exactly how an STCS session silently
 * fell back to the legacy v3 state.
 */

export function isAlreadyOpen(error) {
  return error?.code === 'already-open' || /already open/i.test(String(error?.message || error));
}

/**
 * Return the open domain for `spec`, opening it when nobody else has.
 * @param {object} ctx context with the `storageDomain` service
 * @param {{ name: string }} spec declared domain
 * @param {{ attempts?: number, delayMs?: number }} [options] retry budget
 * @returns {Promise<object>} the shared domain handle
 */
export async function openSharedDomain(ctx, spec, options = {}) {
  const attempts = Math.max(1, Number(options.attempts) || 120);
  const delayMs = Math.max(0, Number(options.delayMs ?? 250));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const existing = ctx.storageDomain.get(spec.name);
    if (existing) return existing;
    try {
      return await ctx.storageDomain.open(spec);
    } catch (error) {
      const opened = ctx.storageDomain.get(spec.name);
      if (opened) return opened;
      if (attempt >= attempts - 1 || !isAlreadyOpen(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`domain '${spec.name}' is unavailable`);
}
