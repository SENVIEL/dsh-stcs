/**
 * v2 legacy bridge — 只读旧 pentest domain，生成 v2 state。
 * 线上 v2 插件仍使用新 domain；旧表不删、不改。
 */

import { migrateLegacy } from './migrate.js';

const TABLES = ['goals', 'intents', 'facts', 'assets', 'findings', 'edges', 'digests', 'queue'];

function rowsOf(table, sessionId) {
  const out = [];
  for (const [, row] of table.entries()) {
    if (row && row.sessionId === sessionId) out.push(row);
  }
  return out;
}

export async function readLegacyState(domain, sessionId) {
  if (!domain) return undefined;
  const data = {};
  for (const name of TABLES) {
    try {
      data[name] = rowsOf(domain.table(name), sessionId);
    } catch {
      data[name] = [];
    }
  }
  const goal = data.goals[0];
  if (!goal) return undefined;
  return migrateLegacy({
    sessionId,
    goal,
    intents: data.intents,
    facts: data.facts,
    assets: data.assets,
    findings: data.findings,
    edges: data.edges,
    digests: data.digests,
    queue: data.queue,
    now: Date.now()
  });
}
