import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const plugin = read('lib/plugin.js')
const dispatch = read('lib/v4/dispatch.js')
const artexPlugin = read('lib/artex/plugin.js')
const runner = read('lib/artex/coordinator-runner.js')
const guard = read('lib/artex/guard.js')
const sync = read('tools/sync-active.mjs')
const pkg = JSON.parse(read('package.json'))

test('STCS isolation: legacy autoAdvance/global audit skip only the artex preset', () => {
  assert.match(plugin, /sessionPresetOf\(ctx, liveSession\) === 'artex'/)
  assert.match(plugin, /function sessionPresetOf\(ctx, session\)/)
  assert.match(plugin, /artex-coordinator-owned/)
  assert.match(plugin, /export function getPentestV4Facade\(\)/)
  assert.match(plugin, /Symbol\.for\('dsh-pentest-v2\.pentestV4Facade'\)/)
  assert.match(plugin, /globalThis\[PENTEST_V4_FACADE\] = v4Facade/)
  assert.doesNotMatch(plugin, /ctx\.provide\('pentestV4'/)
  assert.match(plugin, /trafficEvidenceIndexer/)
  assert.match(plugin, /auditPendingFor/)
})

test('STCS facade handoff keeps the preset mountable without a leaked service', () => {
  // A preset plugin that provides a Cordis service must isolate provider and
  // consumers in one realm; a third-party bundle cannot declare that for the
  // sibling row, so the facade travels through the shared package module and
  // the artex row must not hard-inject it.
  assert.match(artexPlugin, /import \{ getPentestV4Facade \} from '\.\.\/plugin\.js'/)
  const inject = artexPlugin.match(/export const inject = \[([^\]]*)\]/)
  assert.ok(inject, 'artex plugin declares inject')
  assert.doesNotMatch(inject[1], /pentestV4/)
  assert.match(artexPlugin, /pentestV4-unavailable/)
  assert.match(artexPlugin, /scheduleBootRetry/)
})

test('STCS isolation: the coordinator never manages the native goal lifecycle', () => {
  assert.doesNotMatch(runner, /goals\.(create|resume|edit|complete|pause)\s*\(/)
  assert.doesNotMatch(runner, /update_goal/)
  // The planner is the only teammate the coordinator may start, and it goes
  // through TeamRoleRunner, never through a direct spawn call of its own.
  assert.match(runner, /TeamRoleRunner/)
  assert.match(runner, /startPlannerTask/)
  assert.match(runner, /applyPlannerDirections/)
  assert.match(runner, /nativeGoalCheck/)
  assert.match(runner, /native-goal-deleted/)
})

test('STCS host plugin registers a read-only status tool, a guard and the final protocol', () => {
  assert.match(artexPlugin, /name: 'artex_status'/)
  assert.match(artexPlugin, /ctx\.tools\.guard/)
  assert.match(artexPlugin, /name: 'stcs:protocol'/)
  assert.match(artexPlugin, /order: 90/)
  assert.match(artexPlugin, /pentestV4/)
  assert.match(guard, /ROOT_ALLOWED_TOOLS/)
  assert.match(guard, /WORKER_ALLOWED_TOOLS/)
  assert.match(guard, /主会话只读/)
})

test('STCS dispatch additions stay optional and backward compatible', () => {
  assert.match(dispatch, /promptBuilder = null/)
  assert.match(dispatch, /retireOnSettle = false/)
  assert.match(dispatch, /this\.promptBuilder = typeof promptBuilder === 'function' \? promptBuilder : buildWorkerPrompt/)
  assert.equal(pkg.exports['./artex'], './lib/artex/plugin.js')
  assert.match(sync, /target: path\.join\(installedRoot, 'package\.json'\)/)
  assert.match(sync, /target: path\.join\(vendorRoot, 'package\.json'\)/)
})
