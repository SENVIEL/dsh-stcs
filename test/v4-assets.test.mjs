import test from 'node:test';
import assert from 'node:assert/strict';
import { createV4State } from '../lib/v4/state.js';
import { reduceV4 } from '../lib/v4/reduce.js';
import { V4Session } from '../lib/v4/session.js';
import { deriveAssetsFromState } from '../lib/v4/assets.js';

test('v4 seeds target assets from goal targets without duplicates', () => {
  const state = createV4State({
    sessionId: 'assets-1',
    target: 'https://efbng.example.test',
    targets: ['https://efbng.example.test', '*.example.test', '203.0.113.10', '203.0.113.10:22'],
    objective: 'o',
    now: 1
  });
  const values = new Set(state.assets.map((item) => `${item.type}:${item.value}`));
  assert.ok(values.has('root-domain:example.test'));
  assert.ok(values.has('subdomain:efbng.example.test'));
  assert.ok(values.has('app:https://efbng.example.test'));
  assert.ok(values.has('ip:203.0.113.10'));
  assert.ok(values.has('service:203.0.113.10:22'));
  assert.equal(new Set(state.assets.map((item) => `${item.type}:${item.value.toLowerCase()}`)).size, state.assets.length);
  assert.equal(state.assets[0].id, 'asset-1');
});

test('v4 asset add reuses duplicate type+value and accepts string meta', () => {
  let state = createV4State({ sessionId: 'assets-2', target: 'https://t.test', objective: 'o', now: 1 });
  state = reduceV4(state, {
    type: 'asset', op: 'add',
    assets: [{ type: 'endpoint', value: 'GET /health', meta: 'from probe' }],
    now: 2
  });
  const first = state.assets.find((item) => item.type === 'endpoint');
  assert.equal(first.meta, 'from probe');
  state = reduceV4(state, {
    type: 'asset', op: 'add',
    assets: [{ type: 'endpoint', value: 'GET /health', meta: 'duplicate' }],
    now: 3
  });
  assert.equal(state.assets.filter((item) => item.type === 'endpoint' && item.value === 'GET /health').length, 1);
});

test('v4 read backfills assets for legacy states with an empty inventory', async () => {
  const state = createV4State({ sessionId: 'assets-3', target: 'https://legacy.test', objective: 'o', now: 1 });
  state.assets = [];
  state.counters.asset = 0;
  const rows = new Map([['assets-3', structuredClone(state)]]);
  const store = V4Session.createStore({
    load: async (id) => rows.get(id),
    save: async (id, next) => { rows.set(id, structuredClone(next)); },
    append: async () => {},
    now: () => 100
  });
  const session = new V4Session({ store, sessionId: 'assets-3' });
  const next = await session.read();
  assert.ok(next.assets.length >= 2);
  assert.ok(next.assets.some((item) => item.type === 'root-domain' && item.value === 'legacy.test'));
  assert.ok(next.assets.some((item) => item.type === 'app' && item.value === 'https://legacy.test'));
});

test('v4 derives endpoint assets from recorded facts', () => {
  const state = createV4State({ sessionId: 'assets-4', target: 'https://facts.test', objective: 'o', now: 1 });
  state.facts.push({
    id: 'fact-1',
    directionId: 'direction-1',
    answer: 'Observed GET /api/user/list and POST /api/upload on the target.',
    confidence: 'observed',
    evidenceIds: [],
    createdAt: 2
  });
  const items = deriveAssetsFromState(state);
  assert.ok(items.some((item) => item.type === 'endpoint' && item.value === 'GET /api/user/list'));
  assert.ok(items.some((item) => item.type === 'endpoint' && item.value === 'POST /api/upload'));
});
