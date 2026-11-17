/**
 * STCS runtime state, modelled on ARTEX's task runtime rather than on the
 * coordinator board.
 *
 * This table is deliberately an adapter, not a second copy of v4:
 * - directions/facts/findings remain authoritative in `stcs_v4`;
 * - this table owns task lifecycle, planner rounds, intent claims/leases,
 *   worker slots and the cold digest;
 * - every mutation is serialized through a get/put chain so a planner round and
 *   a worker claim cannot interleave.
 *
 * It runs inside the STCS host plugin. It does not modify DSH core.
 */
import { clamp, text } from './util.js';
import { buildColdDigest } from './coldgraph.js';

const ACTIVE_TASK_STATES = new Set(['queued', 'running', 'claimed']);
const TERMINAL_INTENT_STATES = new Set(['done', 'exhausted', 'blocked', 'stopped', 'cancelled']);

export function emptyRuntime(sessionId, now = Date.now()) {
  return {
    version: 1,
    sessionId: text(sessionId),
    revision: 1,
    taskId: `task:${text(sessionId)}`,
    goalId: '',
    phase: 'queued',
    createdAt: now,
    updatedAt: now,
    startedAt: 0,
    deadlineAt: 0,
    maxWorkers: 6,
    workerLeaseMs: 180000,
    planner: {
      state: 'idle',
      round: 0,
      lastWakeAt: 0,
      lastStartAt: 0,
      lastEndAt: 0,
      lastError: '',
      mustGenerate: false,
      probeCount: 0,
      lastResult: null
    },
    intents: {},
    workers: {},
    digest: { generatedAt: 0, coldIntents: [], coldFacts: [] },
    controls: [],
    updatedBy: 'runtime'
  };
}

function activeTask(task) {
  return task && ACTIVE_TASK_STATES.has(text(task.state));
}

function intentStateOf(direction) {
  const state = text(direction?.state) || 'open';
  if (state === 'open' || state === 'running') return state;
  return TERMINAL_INTENT_STATES.has(state) ? state : 'open';
}

export class StcsRuntime {
  constructor({ table, now = () => Date.now(), maxWorkers = 6, workerLeaseMs = 180000, coldAfterMs = 30 * 60 * 1000 } = {}) {
    if (!table || typeof table.get !== 'function' || typeof table.put !== 'function') {
      throw new Error('StcsRuntime requires a get/put table');
    }
    this.table = table;
    this.now = typeof now === 'function' ? now : () => Date.now();
    this.maxWorkers = clamp(maxWorkers, 1, 16);
    this.workerLeaseMs = clamp(workerLeaseMs, 30000, 3600000);
    this.coldAfterMs = Math.max(60000, Number(coldAfterMs) || 30 * 60 * 1000);
    this.chains = new Map();
  }

  _enqueue(sessionId, operation) {
    const key = text(sessionId);
    const previous = this.chains.get(key) || Promise.resolve();
    const current = previous.then(operation, operation);
    this.chains.set(key, current.then(() => {}, () => {}));
    return current;
  }

  async _load(sessionId) {
    const row = await this.table.get(text(sessionId));
    const state = row && typeof row === 'object' ? (row.state ?? row) : undefined;
    return state && typeof state === 'object' ? state : undefined;
  }

  async read(sessionId) {
    return this._enqueue(sessionId, () => this._load(sessionId));
  }

  async update(sessionId, mutator) {
    return this._enqueue(sessionId, async () => {
      const base = (await this._load(sessionId)) || emptyRuntime(sessionId, this.now());
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

  /**
   * Mirror the canonical v4 state into runtime intents/worker slots. This is
   * idempotent and is called before every scheduler decision.
   */
  async sync(sessionId, state, now = this.now()) {
    return this.update(sessionId, (runtime) => {
      const goal = state?.goal || {};
      const phase = text(goal.phase) === 'paused' ? 'paused'
        : text(goal.phase) === 'done' ? 'done'
          : text(goal.phase) === 'active' ? 'running' : 'queued';
      runtime.goalId = text(goal.id) || runtime.goalId;
      runtime.maxWorkers = clamp(Math.min(
        Number(state?.settings?.workerLimit) || runtime.maxWorkers || this.maxWorkers,
        this.maxWorkers
      ), 1, 16);
      runtime.workerLeaseMs = clamp(runtime.workerLeaseMs || this.workerLeaseMs, 30000, 3600000);
      if (phase === 'running' && !runtime.startedAt) runtime.startedAt = now;
      runtime.phase = phase;
      runtime.deadlineAt = Number(goal.deadlineAt) || Number(state?.settings?.deadlineAt) || runtime.deadlineAt || 0;
      if (phase === 'running' && runtime.deadlineAt > 0 && now >= runtime.deadlineAt) {
        runtime.phase = 'settling';
      }

      const activeTasks = (state?.tasks || []).filter(activeTask);
      // Adopt tasks that were already running before this runtime instance
      // started (host restart / old coordinator). Otherwise they consume v4
      // worker capacity while the runtime thinks those slots are free.
      const boundTaskIds = new Set(Object.values(runtime.workers || {})
        .filter((worker) => worker && worker.state !== 'idle' && text(worker.taskId))
        .map((worker) => text(worker.taskId)));
      for (const task of activeTasks) {
        if (boundTaskIds.has(text(task.id))) continue;
        let workerId = '';
        for (let index = 0; index < runtime.maxWorkers; index += 1) {
          const candidate = `worker-${index + 1}`;
          if (!runtime.workers?.[candidate] || runtime.workers[candidate].state === 'idle') {
            workerId = candidate;
            break;
          }
        }
        if (!workerId) continue;
        runtime.workers[workerId] = {
          id: workerId, state: 'running', intentId: text(task.directionId), taskId: text(task.id),
          childId: text(task.childId), claimedAt: Number(task.startedAt) || now,
          leaseUntil: now + runtime.workerLeaseMs, updatedAt: now
        };
        boundTaskIds.add(text(task.id));
      }
      const activeByDirection = new Map(activeTasks.map((task) => [text(task.directionId), task]));
      for (const direction of (state?.directions || [])) {
        if (!direction || direction.deleted === true || !direction.id) continue;
        const id = text(direction.id);
        const previous = runtime.intents[id] || {
          id, directionId: id, state: 'open', priority: 0, workerId: '', taskId: '', childId: '',
          claimedAt: 0, leaseUntil: 0, updatedAt: now
        };
        const nextState = intentStateOf(direction);
        const task = activeByDirection.get(id);
        runtime.intents[id] = {
          ...previous,
          state: task ? 'running' : nextState,
          priority: Number(direction.priority) || previous.priority || 0,
          taskId: task ? text(task.id) : (nextState === 'open' ? '' : previous.taskId),
          childId: task ? text(task.childId) : previous.childId,
          updatedAt: now
        };
      }

      for (const [workerId, worker] of Object.entries(runtime.workers || {})) {
        if (!worker || worker.state === 'idle') continue;
        const task = activeTasks.find((item) => text(item.id) === text(worker.taskId));
        const intent = runtime.intents[text(worker.intentId)];
        if (task && intent && intent.state === 'running') {
          worker.leaseUntil = now + runtime.workerLeaseMs;
          worker.updatedAt = now;
          continue;
        }
        const leaseExpired = Number(worker.leaseUntil) > 0 && now > Number(worker.leaseUntil);
        if (!task || !intent || intent.state !== 'running' || leaseExpired) {
          runtime.workers[workerId] = {
            ...worker, state: 'idle', intentId: '', taskId: '', childId: '', claimedAt: 0, leaseUntil: 0
          };
        }
      }

      // ARTEX cold graph: bounded, deterministic digest of closed intents.
      // Canonical history stays in v4; the runtime only stores the summary.
      const closed = Object.values(runtime.intents)
        .filter((item) => TERMINAL_INTENT_STATES.has(text(item.state)));
      if (closed.length > 40) {
        runtime.digest = buildColdDigest({
          directions: state?.directions || [],
          facts: state?.facts || [],
          findings: state?.findings || [],
          now
        });
      }
      runtime.updatedBy = 'sync';
      return runtime;
    });
  }

  async claim(sessionId, directionId, now = this.now()) {
    return this.update(sessionId, (runtime) => {
      if (runtime.phase !== 'running') return runtime;
      const id = text(directionId);
      const intent = runtime.intents[id];
      if (!intent || intent.state !== 'open') return runtime;
      const active = Object.values(runtime.workers || {}).filter((worker) => worker.state !== 'idle');
      if (active.length >= runtime.maxWorkers) return runtime;
      let workerId = '';
      for (let index = 0; index < runtime.maxWorkers; index += 1) {
        const candidate = `worker-${index + 1}`;
        if (!runtime.workers?.[candidate] || runtime.workers[candidate].state === 'idle') {
          workerId = candidate;
          break;
        }
      }
      if (!workerId) return runtime;
      runtime.workers[workerId] = {
        id: workerId, state: 'claimed', intentId: id, taskId: '', childId: '',
        claimedAt: now, leaseUntil: now + runtime.workerLeaseMs, updatedAt: now
      };
      runtime.intents[id] = { ...intent, state: 'running', workerId, claimedAt: now, leaseUntil: now + runtime.workerLeaseMs, updatedAt: now };
      runtime.updatedBy = 'claim';
      return runtime;
    });
  }

  async bind(sessionId, workerId, taskId, childId, now = this.now()) {
    return this.update(sessionId, (runtime) => {
      const worker = runtime.workers?.[text(workerId)];
      if (!worker) return runtime;
      worker.state = 'running';
      worker.taskId = text(taskId);
      worker.childId = text(childId);
      worker.leaseUntil = now + runtime.workerLeaseMs;
      worker.updatedAt = now;
      runtime.updatedBy = 'bind';
      return runtime;
    });
  }

  async release(sessionId, workerId, now = this.now()) {
    return this.update(sessionId, (runtime) => {
      const worker = runtime.workers?.[text(workerId)];
      if (!worker) return runtime;
      const intent = runtime.intents[text(worker.intentId)];
      if (intent && intent.state === 'running' && !intent.taskId) intent.state = 'open';
      runtime.workers[text(workerId)] = {
        ...worker, state: 'idle', intentId: '', taskId: '', childId: '', claimedAt: 0, leaseUntil: 0, updatedAt: now
      };
      runtime.updatedBy = 'release';
      return runtime;
    });
  }

  async plannerStarted(sessionId, now = this.now()) {
    return this.update(sessionId, (runtime) => {
      runtime.planner = {
        ...runtime.planner,
        state: 'running', lastStartAt: now, lastWakeAt: now, lastError: '', probeCount: 0, lastResult: null
      };
      runtime.updatedBy = 'planner';
      return runtime;
    });
  }

  async recordProbe(sessionId, url, now = this.now()) {
    return this.update(sessionId, (runtime) => {
      const count = Number(runtime.planner?.probeCount) || 0;
      if (count >= 2) throw new Error('planner probe budget exhausted (max 2 per round)');
      runtime.planner = { ...runtime.planner, probeCount: count + 1 };
      runtime.controls = [...(runtime.controls || []), { at: now, action: 'probe', url: text(url).slice(0, 500) }].slice(-50);
      runtime.updatedBy = 'probe';
      return runtime;
    });
  }

  async plannerFinished(sessionId, result, now = this.now()) {
    return this.update(sessionId, (runtime) => {
      runtime.planner = {
        ...runtime.planner,
        state: 'idle',
        round: (Number(runtime.planner?.round) || 0) + 1,
        lastEndAt: now,
        lastError: '',
        lastResult: result || null
      };
      runtime.updatedBy = 'planner';
      return runtime;
    });
  }

  async failPlanner(sessionId, error, now = this.now()) {
    return this.update(sessionId, (runtime) => {
      runtime.planner = { ...runtime.planner, state: 'idle', lastError: text(error), lastEndAt: now };
      runtime.updatedBy = 'planner';
      return runtime;
    });
  }

  async setPhase(sessionId, phase, now = this.now()) {
    return this.update(sessionId, (runtime) => {
      runtime.phase = text(phase);
      runtime.controls = [...(runtime.controls || []), { at: now, phase: text(phase) }].slice(-50);
      runtime.updatedBy = 'control';
      return runtime;
    });
  }

  async killIntent(sessionId, intentId, now = this.now()) {
    return this.update(sessionId, (runtime) => {
      const intent = runtime.intents?.[text(intentId)];
      if (intent) intent.state = 'blocked';
      for (const worker of Object.values(runtime.workers || {})) {
        if (text(worker.intentId) !== text(intentId)) continue;
        worker.state = 'idle';
        worker.intentId = '';
        worker.taskId = '';
        worker.childId = '';
        worker.claimedAt = 0;
        worker.leaseUntil = 0;
      }
      runtime.controls = [...(runtime.controls || []), { at: now, action: 'kill', intentId: text(intentId) }].slice(-50);
      runtime.updatedBy = 'control';
      return runtime;
    });
  }

  async steerIntent(sessionId, intentId, message, now = this.now()) {
    return this.update(sessionId, (runtime) => {
      runtime.controls = [...(runtime.controls || []), {
        at: now, action: 'steer', intentId: text(intentId), message: text(message).slice(0, 500)
      }].slice(-50);
      runtime.updatedBy = 'control';
      return runtime;
    });
  }

  async snapshot(sessionId) {
    return this.read(sessionId);
  }
}

/** Map-backed table for unit tests. */
export function memoryRuntimeTable(initial = new Map()) {
  const rows = new Map(initial);
  return {
    async get(key) { return rows.get(key); },
    async put(key, value) { rows.set(key, value); },
    async delete(key) { rows.delete(key); },
    rows
  };
}
