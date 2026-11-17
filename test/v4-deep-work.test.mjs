import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { planV4 } from '../lib/v4/plan.js'
import { AXES } from '../lib/v4/axes.js'

const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('unfinished goal always has a concrete fallback direction even when axes are covered', () => {
  const state = {
    version: 4,
    goal: { id: 'g1', target: 'https://t.test', phase: 'active' },
    goals: [{ id: 'g1', state: 'open' }],
    directions: [], tasks: [], facts: [], findings: [], assets: [],
    coverage: AXES.map((axis) => ({ axis, axes: [axis], result: 'no_issue_found', evidenceIds: ['evidence-1'] })),
    planner: { candidates: [] },
    settings: { workerLimit: 3 }
  }
  const plan = planV4(state)
  assert.equal(plan.mustGenerate, true)
  assert.ok(plan.fallback, 'unmet goal must keep a fallback direction')
  assert.match(plan.fallback.question, /换入口|换协议|换参数|endpoint/)
  assert.match(plan.fallback.doneWhen, /可复现响应证据/)
})

test('flow_status is a work turn: it dispatches and allows fallback', () => {
  const start = source.indexOf("name: 'pentest_flow_status'")
  const body = source.slice(start, start + 6000)
  assert.match(body, /dispatchOpen: true, allowFallback: true, force: true/)
  assert.match(body, /unfinished: true/)
  assert.match(body, /mustDoNow/)
  assert.match(body, /禁止只回一句现状|本轮必须新增一个可验证方向/)
})

test('protocol forbids "wait for window / no probe this round" and demands new real work', () => {
  assert.match(source, /【禁止空转，不等于不测试】/)
  assert.match(source, /禁止「等待窗口/)
  assert.match(source, /每一轮都必须有新的实测动作/)
  assert.match(source, /派 worker 发请求取响应/)
  assert.match(source, /WAF 封禁、IP 被限、入口不可达都只是要换路径继续测的 fact/)
})
