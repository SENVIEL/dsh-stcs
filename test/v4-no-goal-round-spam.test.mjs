import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('host goal-round continuation is stopped at the profile level, not by the plugin', () => {
  const patch = readFileSync('C:/Users/MR/.dsh/profiles/desktop/cordis.patch.yml', 'utf8')
  assert.match(patch, /- id: goal-round-driver\s*\n\s*disabled: true/)
  assert.match(source, /goal-round-driver is disabled at the profile level/)
})

test('plugin does not disarm goals (UI shows active+disarmed as 已暂停的目标)', () => {
  const code = source.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n')
  assert.doesNotMatch(code, /disarmPentestGoalRounds/)
  assert.doesNotMatch(code, /goals\.disarm\(/)
  assert.match(source, /NO disarm/)
})

test('flow_status never heals/resumes/disarms a goal', () => {
  const status = source.slice(source.indexOf("name: 'pentest_flow_status'"), source.indexOf("name: 'pentest_flow_status'") + 4000)
  assert.doesNotMatch(status, /healNativeGoalBlocked/)
  assert.doesNotMatch(status, /resume|disarm/)
})
