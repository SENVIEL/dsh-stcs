import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('plugin NEVER resumes/edits/creates/completes/disarms a native goal from the tick', () => {
  assert.doesNotMatch(source, /resumeBlockedGoal/)
  assert.doesNotMatch(source, /disarmPentestGoalRounds/)
  assert.match(source, /NEVER calls|touches NO native goal state/)
})

test('tick does not touch goals at all', () => {
  const tick = source.slice(source.indexOf('const tick = async () =>'), source.indexOf('const timer = setInterval'))
  assert.doesNotMatch(tick, /goalsSvc/)
  assert.doesNotMatch(tick, /agentsSvc\.list\(\)/)
  assert.doesNotMatch(tick, /agentsSvc\.get\(sessionId\)/)
  assert.match(tick, /deliberately does NOT touch goals at all/)
})

test('scheduler still stops when the human paused/cleared the native goal', () => {
  const start = source.indexOf('const autoAdvanceV4')
  const body = source.slice(start, start + 3000)
  assert.match(body, /native-goal-not-active/)
})
