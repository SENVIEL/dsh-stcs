import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const plugin = fs.readFileSync(path.join(root, 'lib', 'plugin.js'), 'utf8')

test('plugin registers the planner and trace tool surface', () => {
  for (const name of [
    'pentest_plan',
    'pentest_trace_add',
    'pentest_trace_search',
    'pentest_trace_get',
    'pentest_trace_stats',
    'pentest_asset_import',
    'pentest_asset_search',
    'pentest_asset_link',
    'pentest_asset_links',
    'pentest_asset_stats',
    'pentest_evidence_export',
    'pentest_evidence_verify'
  ]) {
    assert.match(plugin, new RegExp(`name: '${name}'`), `${name} must be registered`)
  }
  assert.match(plugin, /name: 'pentest_trace'/)
  assert.match(plugin, /const traceSpec = defineDomain/)
  assert.match(plugin, /name: 'pentest_asset_graph'/)
  assert.match(plugin, /const assetGraphSpec = defineDomain/)
})

test('protocol measures progress by new facts, not by intent count', () => {
  // A hard "keep at least 3 open directions" rule made the model manufacture
  // empty intents for zero facts; progress must be read from the graph delta.
  assert.match(plugin, /【进展判据】/, 'protocol must carry the progress criterion')
  assert.doesNotMatch(plugin, /补足至少/, 'the intent-count KPI must stay removed')
  assert.doesNotMatch(plugin, /frontier 少于 3 个/, 'the frontier-density rule must stay removed')
  assert.match(plugin, /上一轮没有新增 fact、finding 或 reproduced 验证/, 'stall must be defined by graph delta')
  // The parts that were genuinely useful are kept.
  assert.match(plugin, /每个子代理回报至少转成一个新的 fact/)
  assert.match(plugin, /不要把全部事实堆在同一个 intent 下/)
})

test('canonical and local presets load exactly one v2 host plugin', () => {
  const packed = path.join(os.homedir(), '.dsh', 'profiles', 'desktop', 'node_modules', '@howmp', 'dsh-pentest', 'preset', 'pentest', 'agent.cordis.yml')
  const local = path.join(os.homedir(), '.dsh', '.agent-presets', 'pentest', 'agent.cordis.yml')
  for (const file of [packed, local]) {
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, 'utf8')
    assert.match(text, /name:\s*'dsh-pentest-v2'/, `${file} must load v2`)
    assert.doesNotMatch(text, /name:\s*'@howmp\/dsh-pentest\/pentest'/, `${file} must not load the legacy host plugin`)
  }
})
