import test from 'node:test'
import assert from 'node:assert/strict'
import { PentestStateStore } from '../lib/store.js'
import { createV4State } from '../lib/v4/state.js'
import { reduceV4 } from '../lib/v4/reduce.js'

function makeStore({ cache = true } = {}) {
  let stored = createV4State({ sessionId: 'cache-s1', target: 'https://t.test', objective: 'o', workdir: 'C:/tmp/cache', now: 1 })
  let loads = 0
  let saves = 0
  const store = new PentestStateStore({
    load: async () => { loads += 1; return structuredClone(stored) },
    save: async (_id, state) => { saves += 1; stored = structuredClone(state) },
    append: async () => {},
    reduce: reduceV4,
    cache
  })
  return {
    store,
    get loads() { return loads },
    get saves() { return saves },
    get stored() { return stored }
  }
}

test('state cache serves repeated reads and updates after mutate/save', async () => {
  const fixture = makeStore()
  const first = await fixture.store.read('cache-s1')
  const second = await fixture.store.read('cache-s1')
  assert.equal(first.revision, 1)
  assert.equal(second.revision, 1)
  assert.equal(fixture.loads, 1)

  const mutated = await fixture.store.mutate('cache-s1', { type: 'settings', op: 'set', workerLimit: 5 })
  assert.equal(mutated.state.revision, 2)
  assert.equal(fixture.saves, 1)
  const cachedAfterMutate = await fixture.store.read('cache-s1')
  assert.equal(cachedAfterMutate.revision, 2)
  assert.equal(cachedAfterMutate.settings.workerLimit, 5)
  assert.equal(fixture.loads, 1, 'mutate must refresh the cache instead of re-reading storage')
})

test('replace updates the cache and serializes concurrent mutations', async () => {
  const fixture = makeStore()
  await fixture.store.read('cache-s1')
  const replacement = { ...fixture.stored, revision: 10, settings: { workerLimit: 2 } }
  await fixture.store.replace('cache-s1', replacement)
  const afterReplace = await fixture.store.read('cache-s1')
  assert.equal(afterReplace.revision, 10)
  assert.equal(fixture.loads, 1)
  assert.equal(fixture.saves, 1)

  const results = await Promise.all([
    fixture.store.mutate('cache-s1', { type: 'settings', op: 'set', workerLimit: 3 }),
    fixture.store.mutate('cache-s1', { type: 'settings', op: 'set', workerLimit: 4 })
  ])
  assert.deepEqual(results.map((item) => item.state.revision), [11, 12])
  assert.equal(fixture.stored.revision, 12)
  assert.equal(fixture.stored.settings.workerLimit, 4)
  assert.equal(fixture.loads, 1, 'concurrent mutations share the same cached canonical state')
})

test('cache can be disabled for diagnostics or external writers', async () => {
  const fixture = makeStore({ cache: false })
  await fixture.store.read('cache-s1')
  await fixture.store.read('cache-s1')
  assert.equal(fixture.loads, 2)
})
