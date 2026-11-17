/**
 * DSH pentest v2 — application store.
 *
 * 单会话串行提交：
 *   load state → reduce（纯）→ save 一行 → append 快照事件 → 返回结果
 *
 * 任何一步失败：不写 save、不 append；state 仍是旧值。
 * save 本身必须是原子的单行写（适配器负责）。
 */

import { reduce, repairFindingLineage } from './state.js';
import { snapshotEvent } from './projection.js';

export class PentestStateStore {
  constructor({ load, save, append, now = () => Date.now(), reduce: reduceFn = reduce, cache = true }) {
    if (typeof load !== 'function') throw new Error('store.load required');
    if (typeof save !== 'function') throw new Error('store.save required');
    this.load = load;
    this.save = save;
    this.append = typeof append === 'function' ? append : async () => {};
    this.reduce = reduceFn;
    this.now = now;
    this.chains = new Map();
    // Per-session canonical cache. All access is inside `_enqueue`, so the
    // existing single-session serialization still guarantees that a read never
    // observes a half-applied mutation.
    this.cacheEnabled = cache !== false;
    this.cache = new Map();
  }

  _cached(sessionId) {
    return this.cacheEnabled ? this.cache.get(sessionId) : undefined;
  }

  _remember(sessionId, state) {
    if (this.cacheEnabled && state) this.cache.set(sessionId, state);
    return state;
  }

  _forget(sessionId) {
    if (this.cacheEnabled) this.cache.delete(sessionId);
  }

  _enqueue(sessionId, operation) {
    const previous = this.chains.get(sessionId) ?? Promise.resolve();
    const current = previous.then(operation, operation);
    const settled = current.then(() => {}, () => {});
    this.chains.set(sessionId, settled);
    return current;
  }

  /**
   * 读取时修复旧血缘：finding 若挂在侦察/宽 intent 下，迁到独立 verify intent。
   * 幂等，只在第一次变化时写回并重发快照；不改变命令语义。
   */
  async _loadRepaired(sessionId) {
    const cached = this._cached(sessionId);
    if (cached) return cached;
    const current = await this.load(sessionId);
    if (!current) return current;
    // v3 is already normalized and must be read without mutation.
    if (Number(current.version) >= 3) return this._remember(sessionId, current);
    const changed = repairFindingLineage(current, this.now());
    if (changed) {
      await this.save(sessionId, current);
      await this.append(sessionId, snapshotEvent(current));
    }
    return this._remember(sessionId, current);
  }

  async read(sessionId) {
    return this._enqueue(sessionId, async () => this._loadRepaired(sessionId));
  }

  /** 重发当前状态快照（用于修复历史缺投影/旧事件被拒绝的会话）。 */
  async create(sessionId, state) {
    return this._enqueue(sessionId, async () => {
      const existing = this._cached(sessionId) || await this.load(sessionId);
      if (existing) throw new Error(`pentest state for ${sessionId} already exists`);
      await this.save(sessionId, state);
      this._remember(sessionId, state);
      await this.append(sessionId, snapshotEvent(state));
      return state;
    });
  }

  /** Replace one existing state atomically (used by explicit schema migration). */
  async replace(sessionId, state) {
    return this._enqueue(sessionId, async () => {
      const existing = this._cached(sessionId) || await this.load(sessionId);
      if (!existing) throw new Error(`pentest state for ${sessionId} does not exist`);
      await this.save(sessionId, state);
      this._remember(sessionId, state);
      await this.append(sessionId, snapshotEvent(state));
      return state;
    });
  }

  /**
   * 原子提交一个命令。返回 {state,result}。
   * 不允许在 command 内部再调用 mutate（适配器层要避免）。
   * `tolerateAppendFailure` 用于 UI 直接控制（暂停/恢复/审计）：状态表本身
   * 已保存，但目标会话日志可能因历史外部编辑而 seq 断裂，Host 会拒绝
   * append。此时不能让已提交的状态回滚，也不能把错误展示成操作失败。
   */
  async mutate(sessionId, command, options = {}) {
    return this._enqueue(sessionId, async () => {
      const current = await this._loadRepaired(sessionId);
      if (!current) throw new Error(`pentest state for ${sessionId} does not exist`);
      const at = command?.now ?? this.now();
      const reduced = this.reduce(current, { ...command, now: at });
      // v2/v3 reducers return { state, result }; the v4 reducer returns the
      // next state directly.
      const nextState = reduced && typeof reduced === 'object' && reduced.state ? reduced.state : reduced;
      await this.save(sessionId, nextState);
      this._remember(sessionId, nextState);
      try {
        await this.append(sessionId, snapshotEvent(nextState));
      } catch (error) {
        if (!options.tolerateAppendFailure) throw error;
      }
      return { state: nextState, result: reduced?.result };
    });
  }

  async reproject(sessionId, options = {}) {
    return this._enqueue(sessionId, async () => {
      const current = await this._loadRepaired(sessionId);
      if (!current) throw new Error(`pentest state for ${sessionId} does not exist`);
      try {
        await this.append(sessionId, snapshotEvent(current, { force: options.force === true }));
      } catch (error) {
        if (!options.tolerateAppendFailure) throw error;
      }
      return current;
    });
  }

  async drain() {
    await Promise.all([...this.chains.values()]);
  }
}

/** 内存实现：只用于纯测试与回放。 */
export function memoryStore(initial = new Map(), { now = () => Date.now() } = {}) {
  const states = new Map(initial);
  const events = [];
  const store = new PentestStateStore({
    load: async (sessionId) => states.get(sessionId),
    save: async (sessionId, state) => { states.set(sessionId, state); },
    append: async (sessionId, event) => { events.push({ sessionId, event }); },
    now
  });
  return { store, states, events };
}
