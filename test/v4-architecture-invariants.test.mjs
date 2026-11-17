import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const read = (p) => fs.readFileSync(p, 'utf8')
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = path.dirname(repoRoot)
const plugin = read(path.join(repoRoot, 'lib', 'plugin.js'))
const workspacePatch = read(path.join(workspaceRoot, 'dsh-pentest-sidecar', 'cordis.patch.yml'))
const installedPatch = read('C:/Users/MR/.dsh/packages/dsh-pentest-sidecar/cordis.patch.yml')
const profilePatch = read('C:/Users/MR/.dsh/profiles/desktop/cordis.patch.yml')

test('ONE wake source: sidecar heartbeat is disabled everywhere', () => {
  for (const p of [workspacePatch, installedPatch]) {
    assert.match(p, /enabled: false/)
    assert.doesNotMatch(p, /followup\(\).*heartbeat|heartbeatSeconds:/)
  }
  // plugin tick never injects a user message / followup
  const tick = plugin.slice(plugin.indexOf('const tick = async () =>'), plugin.indexOf('const timer = setInterval'))
  assert.doesNotMatch(tick, /followup|role:\s*'user'|kind:\s*'user'/)
})

test('global pentest guard stays disabled so standard sessions are untouched', () => {
  assert.match(profilePatch, /- id: pentest-guard\s*\n\s*disabled: true/)
  assert.match(profilePatch, /- id: pentest-preset-root\s*\n\s*disabled: true/)
})

test('plugin tick is silent state self-heal: no model-facing turns', () => {
  const tick = plugin.slice(plugin.indexOf('const tick = async () =>'), plugin.indexOf('const timer = setInterval'))
  assert.doesNotMatch(tick, /inject|sendMessage\(this\.agent|spawnTeammate\(.*\{[\s\S]*prompt/)
  // drain is allowed (writes validations to state), but no conversation injection
  assert.match(tick, /drainGlobalAuditDebt/)
})

test('canonical v4 state is the only source for audit counts', () => {
  const projection = read(path.join(repoRoot, 'lib', 'projection.js'))
  assert.match(projection, /const auditState = auditStateOf\(item, validations\)/)
  const ui = read(path.join(workspaceRoot, 'dsh-pentest-ui', 'lib', 'ui-pentest.client.js'))
  const job = ui.slice(ui.indexOf('function auditStateOf'), ui.indexOf('function candidateSeverity'))
  assert.match(job, /finding\.auditState/)
  assert.doesNotMatch(job, /pentest\.validations/)
})
