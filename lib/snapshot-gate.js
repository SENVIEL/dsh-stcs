/**
 * Snapshot emission policy for the live UI channel.
 *
 * Kept pure so the throttling rules can be tested without importing the DSH
 * session package. `dsh-store.js` is the only production caller.
 */
export function snapshotIntervalForEvidence(evidenceCount) {
  const count = Number(evidenceCount) || 0;
  // A snapshot is the FULL derived state (nodes/facts/intents/queue rewritten
  // every time); real sessions measured 1.2–1.6 MB each. 1528 such events
  // inflated to ~1.9 GB and OOMed the host. Emit at most one per 50/100/150
  // revisions; the latest snapshot alone reconstructs the UI. The host's
  // 8 GB heap cap is a second line of defence, not a substitute for this.
  if (count < 100) return 50;
  if (count <= 250) return 100;
  return 150;
}

export function shouldEmitSnapshot({
  revision,
  last = 0,
  goalChanged = false,
  force = false,
  evidenceCount = 0,
  findingStateChanged = false,
  criticalHighChanged = false
} = {}) {
  const rev = Number(revision) || 0;
  const previous = Number(last) || 0;
  // Explicit reproject must always reach the UI, even at the same revision.
  if (force) return true;
  // Same revision: a read or a no-op command must not re-append an identical
  // snapshot. This used to produce hundreds of duplicate events per session.
  if (rev > 0 && rev === previous && !goalChanged && !findingStateChanged && !criticalHighChanged) return false;
  // Goal phase/pause, finding status and critical/high changes are safety
  // relevant and must never wait for the adaptive interval.
  if (goalChanged || findingStateChanged || criticalHighChanged) return true;
  // New sessions surface every revision up to 50, then use the evidence-sized
  // interval. Large engagements write far more state per revision, so the UI
  // channel backs off to 20 or 30 revisions instead of flooding the renderer.
  if (rev !== 0 && rev !== 1 && rev > 50) {
    const interval = snapshotIntervalForEvidence(evidenceCount);
    if (rev - previous < interval) return false;
  }
  return true;
}
