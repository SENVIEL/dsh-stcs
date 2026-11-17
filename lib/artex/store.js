/**
 * Persistent store for STCS coordinator boards.
 *
 * Deliberately separate from the canonical `pentest_v4` store:
 * - the v4 blackboard remains the only authority for facts/findings/assets;
 * - coordinator decisions/targetMap/hypothesisTree/debrief live here;
 * - writes are serialized per session so a tick and a worker commit cannot
 *   interleave a read-modify-write.
 *
 * No DSH package imports: tests can drive it with a plain Map-backed table.
 */
import { emptyBoard } from './coordinator.js';
import { text } from './util.js';

export class CoordinatorStore {
  constructor({ table, now = () => Date.now() }) {
    if (!table || typeof table.get !== 'function' || typeof table.put !== 'function') {
      throw new Error('CoordinatorStore requires a get/put table');
    }
    this.table = table;
    this.now = typeof now === 'function' ? now : () => Date.now();
    this.chains = new Map();
  }

  _enqueue(sessionId, operation) {
    const key = text(sessionId);
    const previous = this.chains.get(key) ?? Promise.resolve();
    const current = previous.then(operation, operation);
    const settled = current.then(() => {}, () => {});
    this.chains.set(key, settled);
    return current;
  }

  async _load(sessionId) {
    const row = await this.table.get(text(sessionId));
    const state = row && typeof row === 'object' ? (row.state ?? row) : undefined;
    if (!state) return undefined;
    return state;
  }

  async read(sessionId) {
    return this._enqueue(sessionId, async () => this._load(sessionId));
  }

  async write(sessionId, state) {
    return this._enqueue(sessionId, async () => {
      await this.table.put(text(sessionId), {
        sessionId: text(sessionId),
        revision: Number(state?.revision) || 1,
        state
      });
      return state;
    });
  }

  /**
   * Atomic read-modify-write. The mutator receives the current board (or an
   * empty board) and MUST return the next board; returning undefined keeps the
   * current board. The revision is bumped here, never by callers.
   */
  async update(sessionId, mutator, { create = true } = {}) {
    return this._enqueue(sessionId, async () => {
      const current = await this._load(sessionId);
      if (!current && !create) return undefined;
      const base = current || emptyBoard(sessionId);
      const next = (await mutator(base)) || base;
      const committed = {
        ...next,
        version: 1,
        sessionId: text(sessionId) || next.sessionId,
        revision: Math.max(1, Number(base.revision) || 0) + 1,
        updatedAt: this.now()
      };
      await this.table.put(text(sessionId), {
        sessionId: committed.sessionId,
        revision: committed.revision,
        state: committed
      });
      return committed;
    });
  }

  async drain() {
    await Promise.all([...this.chains.values()]);
  }
}

/** Map-backed table for tests and dry runs. */
export function memoryCoordinatorTable(initial = new Map()) {
  const rows = new Map(initial);
  return {
    async get(key) { return rows.get(key); },
    async put(key, value) { rows.set(key, value); },
    async delete(key) { rows.delete(key); },
    rows
  };
}
