import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('model can never mark a goal blocked', () => {
  // guard rejects blocked unconditionally
  assert.match(source, /if \(action === 'blocked'\)/)
  assert.match(source, /不允许被模型标记为受阻/)
  // pentest_block_goal tool is disabled
  const tool = source.slice(source.indexOf("name: 'pentest_block_goal'"), source.indexOf("name: 'pentest_reopen_goal'"))
  assert.match(tool, /DISABLED/)
  assert.match(tool, /throw new Error\('目标保护/)
  assert.doesNotMatch(tool, /handlers\.goalBlock/)
})

test('human-command detection is delegated to the single policy evaluator', () => {
  const policy = readFileSync(new URL('../lib/v4/policy.js', import.meta.url), 'utf8')
  assert.match(source, /userExplicitlyEndsGoal\(text\) \{ return isHumanGoalCommand\(text, 'complete'\)/)
  assert.match(policy, /<sidecar_planner>\|<goal_round>/)
  assert.doesNotMatch(policy, /受阻\|blocked/)
  assert.match(policy, /if \(action === 'blocked'\) return false/)
})

test('tick does not resurrect blocked/paused/cleared goals', () => {
  const tick = source.slice(source.indexOf('const tick = async () =>'), source.indexOf('const timer = setInterval'))
  assert.doesNotMatch(tick, /goalsSvc\.resume/)
  assert.doesNotMatch(tick, /resumeBlockedGoal/)
  assert.match(tick, /Goal lifecycle belongs ONLY to the human/)
})

test('protocol states the goal stays active and block is forbidden', () => {
  assert.match(source, /渗透目标永远保持 active/)
  assert.match(source, /pentest_block_goal 已禁用/)
})
