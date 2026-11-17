/**
 * STCS Cordis plugin entry (`dsh-pentest-v2/artex`).
 *
 * Mounted as a preset-scoped host plugin. It shares the `pentestV4` facade of
 * the sibling `dsh-pentest-v2` row, so the canonical v4 store has exactly one
 * writer chain. It provides:
 * - CoordinatorRunner (persistent state machine, 3s silent tick)
 * - artex_status (read-only status for the root session)
 * - a hard tool guard for the root/worker policy
 * - the `stcs:protocol` prompt section that overrides legacy dispatch text
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';
import { jsonSafe } from '../projection.js';
import { openSharedDomain } from '../domain-open.js';
import { getPentestV4Facade } from '../plugin.js';
import { CoordinatorStore } from './store.js';
import { CoordinatorRunner } from './coordinator-runner.js';
import { StcsRuntime } from './runtime.js';
import { createStcsToolGuard, ROOT_DENIED_TOOLS, PLANNER_DENIED_TOOLS } from './guard.js';
import { buildStcsProtocol, buildStcsPlannerProtocol, buildStcsWorkerProtocol } from './prompt.js';
import { text } from './util.js';

export const name = 'artex-coordinator';
// `pentestV4` is deliberately NOT injected: a preset plugin that provides a
// service must isolate it in a realm shared with every consumer, which a
// third-party bundle cannot declare for the sibling `dsh-pentest-v2` row.
// This module resolves the facade through the process-global handoff instead,
// so the preset row activates even while the sibling row is still loading.
export const inject = ['tools', 'systemPrompt', 'sessions', 'agents', 'subagents', 'storageDomain'];

const artexSpec = defineDomain({
  name: 'artex_coordinator',
  version: 1,
  tables: { sessions: domainTable(z.any()) }
});

// ARTEX runtime is a separate STCS-owned domain. Keeping it out of
// artex_coordinator means a board replay and a task/worker lease mutation can
// never overwrite each other.
const runtimeSpec = defineDomain({
  name: 'stcs_runtime',
  version: 1,
  tables: { tasks: domainTable(z.any()) }
});

function tool(definition) {
  const execute = definition.execute;
  return defineTool({
    ...definition,
    parameters: definition.parameters || {},
    execute: async (...args) => jsonSafe(await execute(...args)),
    output: definition.output ?? {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }]
    }
  });
}

async function openDomain(ctx) {
  return openSharedDomain(ctx, artexSpec);
}

export function apply(ctx, config = {}) {
  const enabled = config.enabled !== false;
  let runner = null;
  let stop = null;
  let booted = false;
  let bootError = '';
  let bootTimer = null;

  const getAgentTeams = () => {
    try { return typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined; } catch { return undefined; }
  };
  const getGoals = () => {
    try { return typeof ctx.get === 'function' ? ctx.get('goals') : undefined; } catch { return undefined; }
  };
  const getAgentPresets = () => {
    try { return typeof ctx.get === 'function' ? ctx.get('agentPresets') : undefined; } catch { return undefined; }
  };
  // The new-session dialog commits the preset to the `agentPreset` session
  // projection; the session header keeps its creation-time value ("standard"),
  // so every preset check must read the projection first.
  const presetOf = (agent) => {
    try {
      const registry = getAgentPresets();
      const session = agent?.session;
      if (registry && typeof registry.presetForSession === 'function' && session) {
        const selected = registry.presetForSession(session);
        if (selected) return text(selected);
      }
    } catch { /* fall through to the header */ }
    return text(agent?.session?.header?.agentPreset);
  };
  const isStcsAgent = (agent) => presetOf(agent) === 'artex';
  // The v4 facade arrives through the package-level handoff published by the
  // sibling `dsh-pentest-v2` row; `ctx.get` remains a fallback for a Host that
  // still provides the legacy service.
  const resolveFacade = () => {
    const handoff = getPentestV4Facade();
    if (handoff) return handoff;
    try { return typeof ctx.get === 'function' ? ctx.get('pentestV4') : undefined; } catch { return undefined; }
  };

  const boot = async () => {
    if (booted) return runner;
    const facade = resolveFacade();
    if (!facade) {
      bootError = 'pentestV4-unavailable';
      scheduleBootRetry();
      return null;
    }
    bootError = '';
    const domain = await openDomain(ctx);
    const runtimeDomain = await openSharedDomain(ctx, runtimeSpec);
    const store = new CoordinatorStore({
      table: domain.table('sessions'),
      now: () => Date.now()
    });
    const runtime = new StcsRuntime({
      table: runtimeDomain.table('tasks'),
      now: () => Date.now(),
      maxWorkers: config.maxWorkers ?? 6,
      workerLeaseMs: config.workerLeaseMs ?? 180000
    });
    runner = new CoordinatorRunner({
      store,
      runtime,
      getSession: (sessionId) => facade.getSession(sessionId),
      agents: ctx.agents,
      goals: getGoals(),
      subagents: ctx.subagents,
      auditPendingFor: (options) => facade.auditPendingFor(options),
      indexEvidence: (sessionId) => facade.trafficEvidenceIndexer(sessionId),
      reproject: (sessionId) => facade.reprojectSession(sessionId),
      agentTeams: getAgentTeams(),
      presetOf,
      config: { ...config, enabled },
      logger: ctx.logger
    });
    if (enabled) stop = runner.start();
    booted = true;
    return runner;
  };

  // The sibling row may activate a tick after this one; retry until its
  // handoff is published instead of waiting forever on an injected service.
  const scheduleBootRetry = () => {
    if (bootTimer !== null || booted) return;
    bootTimer = setInterval(() => {
      if (booted) {
        clearInterval(bootTimer);
        bootTimer = null;
        return;
      }
      if (!resolveFacade()) return;
      clearInterval(bootTimer);
      bootTimer = null;
      void boot().catch((error) => {
        bootError = text(error?.message || error);
        try { ctx.logger?.warn?.('stcs coordinator boot failed: ' + bootError); } catch { /* best effort */ }
      });
    }, 250);
    bootTimer.unref?.();
  };

  ctx.effect(() => {
    let disposed = false;
    void boot().then(() => {
      if (disposed) {
        try { stop?.(); } catch { /* best effort */ }
        try { runner?.stop(); } catch { /* best effort */ }
        stop = null;
      }
    }).catch((error) => {
      bootError = text(error?.message || error);
      try { ctx.logger?.warn?.('stcs coordinator boot failed: ' + bootError); } catch { /* best effort */ }
    });
    return () => {
      disposed = true;
      if (bootTimer !== null) {
        clearInterval(bootTimer);
        bootTimer = null;
      }
      try { stop?.(); } catch { /* best effort */ }
      try { runner?.stop(); } catch { /* best effort */ }
      stop = null;
    };
  }, 'stcs.coordinator');

  ctx.tools.register(tool({
    name: 'artex_status',
    description: 'Read-only STCS status: goal, worker slots, target map, hypothesis tree, decisions digest and graded verdicts. This is the root session\'s only status/read tool; it never writes graph state or dispatches workers.',
    parameters: {},
    execute: async (_args, exec) => {
      if (!runner) {
        return {
          ready: false,
          reason: bootError || 'coordinator-not-ready',
          policy: { mainSessionReadOnly: true, targetOwner: 'user' }
        };
      }
      const sessionId = text(exec?.agent?.id || exec?.agent?.session?.id);
      const status = await runner.describe(sessionId);
      return { ...status, toolFilter: rootToolFilter.get(sessionId) || null };
    }
  }), { when: (context) => isStcsAgent(context?.agent) && !context?.agent?.session?.header?.parentSession });

  // ARTEX planners may do a very small amount of read-only reconnaissance. The
  // shell is deliberately not available; this tool only permits GET/HEAD to
  // the current goal origin and two probes per planner round.
  ctx.tools.register(tool({
    name: 'stcs_probe',
    description: 'Planner-only read-only probe: GET or HEAD a URL on the current goal origin. Maximum 2 probes per planner round; no body, no cookies, no redirect following, no shell.',
    parameters: {
      url: { type: 'string', required: true, description: 'URL on the current goal origin.' },
      method: { type: 'string', description: 'GET (default) or HEAD.' }
    },
    execute: async (args, exec) => {
      if (!runner) return { ok: false, error: bootError || 'coordinator-not-ready' };
      const sessionId = text(exec?.agent?.session?.header?.parentSession
        || exec?.agent?.id || exec?.agent?.session?.id);
      if (!sessionId) return { ok: false, error: 'session-id-missing' };
      try {
        return { ok: true, ...(await runner.plannerProbe(sessionId, args?.url, args?.method)) };
      } catch (error) {
        return { ok: false, error: text(error?.message || error) };
      }
    }
  }), {
    when: (context) => {
      try {
        const teams = typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined;
        const membership = teams?.membership?.(context?.agent);
        const name = `${membership?.name || membership?.memberName || context?.agent?.session?.header?.teamMemberName || context?.agent?.name || ''}`;
        return membership?.role === 'planner' || /planner|规划员/i.test(name)
          || (!membership && text(context?.agent?.session?.header?.parentSession) !== ''
            && text(context?.agent?.session?.header?.agentPreset) === 'artex');
      } catch {
        return false;
      }
    }
  });

  ctx.tools.guard(createStcsToolGuard({
    getPreset: presetOf,
    getMembership: (agent) => {
      try {
        const agentTeams = getAgentTeams();
        return agentTeams && typeof agentTeams.membership === 'function'
          ? agentTeams.membership(agent)
          : undefined;
      } catch {
        return undefined;
      }
    }
  }));

  // Hide probing tools from the STCS root and planner roles. The plugin is
  // mounted in the STCS preset scope; workers keep the full worker surface.
  const rootToolFilter = new Map();
  const applyToolRestriction = (agent, names, label) => {
    const sessionId = text(agent?.id || agent?.session?.id);
    if (!sessionId || rootToolFilter.has(sessionId)) return;
    const scoped = agent?.ctx;
    if (!scoped?.tools || typeof scoped.tools.restrict !== 'function') {
      rootToolFilter.set(sessionId, { applied: false, role: label, reason: 'agent-ctx-tools-unavailable' });
      return;
    }
    let denied = 0;
    const failed = [];
    for (const name of names) {
      try {
        scoped.tools.restrict({ deny: [name] });
        denied += 1;
      } catch (error) {
        failed.push(`${name}: ${text(error?.message || error).slice(0, 80)}`);
      }
    }
    rootToolFilter.set(sessionId, { applied: denied > 0, role: label, denied, failed: failed.slice(0, 5) });
  };
  const membershipOf = (agent) => {
    try {
      const teams = typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined;
      return agent && teams?.membership ? teams.membership(agent) : undefined;
    } catch { return undefined; }
  };
  const isPlannerMember = (agent, membership) => {
    const role = text(membership?.role || membership?.memberRole);
    const name = text(membership?.name || membership?.memberName || agent?.name || '');
    if (role === 'planner' || /planner|规划员/i.test(name)) return true;
    if (membership) return false;
    // DSH 0.2.2: agentTeams.membership is gone. The planner subagent is the
    // only non-root role launched with the artex preset (workers have none).
    const header = agent?.session?.header || {};
    return text(header.parentSession) !== '' && text(header.agentPreset) === 'artex';
  };
  const applySessionToolRestriction = (agent, session) => {
    const header = session?.header || agent?.session?.header || {};
    const membership = membershipOf(agent);
    if (isPlannerMember(agent, membership)) {
      applyToolRestriction(agent, PLANNER_DENIED_TOOLS, 'planner');
      return;
    }
    if (text(header.parentSession)) return;
    applyToolRestriction(agent, ROOT_DENIED_TOOLS, 'root');
  };
  if (typeof ctx.on === 'function') {
    ctx.on('agent/created', ({ agent } = {}) => {
      applySessionToolRestriction(agent, agent?.session);
    });
    ctx.on('session/event', (session, event) => {
      if (event?.type !== 'turn/start' && event?.type !== 'user/message') return;
      const agent = typeof ctx.get === 'function' ? ctx.get('agents')?.get?.(session?.id) : undefined;
      if (agent) applySessionToolRestriction(agent, session);
    });
  }

  ctx.inject(['systemPrompt'], (scope) => {
    scope.systemPrompt.section({
      name: 'stcs:protocol',
      order: 90,
      text: (context) => {
        const scope = context?.scope;
        const parent = scope?.session?.header?.parentSession || scope?.header?.parentSession;
        const agent = scope?.agent || context?.agent;
        let membership;
        try {
          const teams = typeof ctx.get === 'function' ? ctx.get('agentTeams') : undefined;
          membership = agent && teams?.membership ? teams.membership(agent) : undefined;
        } catch { membership = undefined; }
        const memberName = `${membership?.name || membership?.memberName || agent?.name || ''}`;
        if (/planner|规划员/i.test(memberName) || isPlannerMember(agent, membership)) return buildStcsPlannerProtocol();
        return parent ? buildStcsWorkerProtocol() : buildStcsProtocol();
      }
    });
  });
}

