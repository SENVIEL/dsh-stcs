import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('flow_wait returns immediately for terminal tasks and demands new real work', () => {
  const tool = source.slice(source.indexOf("name: 'pentest_flow_wait'"), source.indexOf("name: 'pentest_flow_wait'") + 2200)
  assert.match(tool, /idle: true/)
  assert.match(tool, /derive a NEW concrete attack direction and dispatch it now/)
  assert.match(tool, /\['done', 'failed', 'cancelled', 'unknown'\]\.includes\(task\.state\)/)
})

test('flow_status treats idle-but-unfinished as a MUST-WORK signal', () => {
  const start = source.indexOf("name: 'pentest_flow_status'")
  const status = source.slice(start, start + 6000)
  assert.match(status, /const idle = activeTasks\.length === 0 && openDirections\.length === 0/)
  assert.match(status, /unfinished: true/)
  assert.match(status, /mustDoNow/)
  assert.match(status, /本轮必须新增一个可验证方向并派活实测/)
  assert.match(status, /dispatchOpen: true, allowFallback: true, force: true/)
})

test('protocol forbids passive spinning but requires deeper testing', () => {
  assert.match(source, /【禁止空转，不等于不测试】/)
  assert.match(source, /禁止的是「反复调 wait\/status/)
  assert.match(source, /每一轮都必须有新的实测动作/)
  assert.match(source, /禁止「等待窗口/)
  assert.doesNotMatch(source, /【禁止空转】当前没有可运行方向/)
})
