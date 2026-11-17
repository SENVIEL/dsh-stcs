import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('blocked/paused/cleared goals are left exactly as the human set them', () => {
  assert.doesNotMatch(source, /resumeBlockedGoal/)
  const tick = source.slice(source.indexOf('const tick = async () =>'), source.indexOf('const timer = setInterval'))
  assert.doesNotMatch(tick, /goals\w*\.(resume|edit|create|complete|pause|disarm)\(/)
  assert.match(source, /goal-round-driver is disabled at the profile level/)
})

test('plugin never touches native goal activation (no disarm)', () => {
  // UI renders active+disarmed as "已暂停的目标" — disarm misled the user.
  const code = source.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n')
  assert.doesNotMatch(code, /disarmPentestGoalRounds/)
  assert.doesNotMatch(code, /goals\.disarm\(/)
  assert.match(source, /NO disarm/)
})

test('model still cannot mark a goal blocked', () => {
  assert.match(source, /if \(action === 'blocked'\)/)
  assert.match(source, /DISABLED/)
})
