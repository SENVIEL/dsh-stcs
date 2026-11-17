/**
 * Bounded cold-graph digest for the STCS planner.
 *
 * ARTEX folds old exploration nodes into digest nodes. STCS keeps canonical
 * history in v4; this module only builds a compact, deterministic summary for
 * the planner context. It never deletes v4 state.
 */
import { text } from './util.js';

const TERMINAL = new Set(['done', 'exhausted', 'blocked', 'stopped', 'cancelled']);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unionFind(ids) {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (id) => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(id) !== id) {
      const next = parent.get(id);
      parent.set(id, root);
      id = next;
    }
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  return { find, union };
}

/**
 * @param {{directions?: object[], facts?: object[], findings?: object[], now?: number, maxGroups?: number}} input
 */
export function buildColdDigest({ directions = [], facts = [], findings = [], now = Date.now(), maxGroups = 20 } = {}) {
  const closed = directions.filter((item) =>
    item && item.deleted !== true && TERMINAL.has(text(item.state)));
  const ids = closed.map((item) => text(item.id)).filter(Boolean);
  const finder = unionFind(ids);
  const byId = new Map(closed.map((item) => [text(item.id), item]));

  // Union intents that share a concrete asset or parent. A shared axis alone is
  // too broad; it only groups when both sides have no concrete link.
  for (let i = 0; i < closed.length; i += 1) {
    for (let j = i + 1; j < closed.length; j += 1) {
      const a = closed[i];
      const b = closed[j];
      const aLinks = new Set([...asArray(a.assets), ...asArray(a.parents)].map((value) => text(value)).filter(Boolean));
      const bLinks = [...asArray(b.assets), ...asArray(b.parents)].map((value) => text(value)).filter(Boolean);
      const shared = bLinks.some((value) => aLinks.has(value));
      const aAxes = asArray(a.axis).map((value) => text(value));
      const bAxes = asArray(b.axis).map((value) => text(value));
      const aBare = aLinks.size === 0 && aAxes.length > 0;
      const bBare = bLinks.size === 0 && bAxes.length > 0;
      const sameBareAxis = aBare && bBare && aAxes.some((axis) => bAxes.includes(axis));
      if (shared || sameBareAxis) finder.union(text(a.id), text(b.id));
    }
  }

  const groups = new Map();
  for (const item of closed) {
    const root = finder.find(text(item.id));
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(item);
  }
  const factsByDirection = new Map();
  for (const fact of facts) {
    const id = text(fact?.directionId);
    if (!id) continue;
    if (!factsByDirection.has(id)) factsByDirection.set(id, []);
    factsByDirection.get(id).push(text(fact.id));
  }
  const findingsByDirection = new Map();
  for (const finding of findings) {
    const id = text(finding?.directionId);
    if (!id) continue;
    if (!findingsByDirection.has(id)) findingsByDirection.set(id, []);
    findingsByDirection.get(id).push(text(finding.id));
  }

  const digestGroups = [...groups.values()]
    .slice(0, Math.max(1, Number(maxGroups) || 20))
    .map((items, index) => {
      const directionIds = items.map((item) => text(item.id));
      const axes = [...new Set(items.flatMap((item) => asArray(item.axis).map((value) => text(value)).filter(Boolean)))];
      const factIds = [...new Set(directionIds.flatMap((id) => factsByDirection.get(id) || []))];
      const findingIds = [...new Set(directionIds.flatMap((id) => findingsByDirection.get(id) || []))];
      return {
        id: `cold-${index + 1}`,
        axes,
        intents: directionIds,
        factIds,
        findingIds,
        summary: `${directionIds.length} closed intent(s); ${axes.join(',') || 'no-axis'}; facts=${factIds.length}; findings=${findingIds.length}`
      };
    });

  return {
    generatedAt: now,
    totalClosed: closed.length,
    groups: digestGroups,
    coldIntents: closed.slice(-80).map((item) => ({
      id: text(item.id),
      state: text(item.state),
      priority: Number(item.priority) || 0,
      updatedAt: Number(item.updatedAt) || 0
    }))
  };
}
