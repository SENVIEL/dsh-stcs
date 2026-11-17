import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { attachAllStepResponses } from '../lib/v4/step-responses.js'
import { buildWorkerPrompt, WORKER_SCHEMA } from '../lib/v4/dispatch.js'

test('projection attaches real response packets and rewrites 预期 notes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-resp-'))
  const file = 'evidence/step1.txt'
  fs.mkdirSync(path.join(dir, 'evidence'), { recursive: true })
  fs.writeFileSync(path.join(dir, file),
    '### REQUEST\nGET /v2/api-docs HTTP/1.1\nHost: t.test\n\n### RESPONSE HEADERS\nHTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer realm="oauth2server"\nContent-Type: application/json\n\n{"error":"unauthorized"}', 'utf8')
  const state = {
    goal: { workdir: dir, target: 't.test' },
    evidence: [{ id: 'evidence-1', path: file, role: 'proof', summary: 'GET /v2/api-docs 返回 401' }],
    findings: [{
      id: 'finding-1', severity: 'low',
      steps: ['GET /v2/api-docs HTTP/1.1\r\nHost: t.test\r\n\r\n'],
      stepNotes: ['请求接口文档（预期返回 401 与 WWW-Authenticate）'],
      evidenceIds: ['evidence-1']
    }]
  }
  const out = attachAllStepResponses(state)
  const step = out.findings[0].steps[0]
  assert.match(step, /实际响应：/)
  assert.match(step, /HTTP\/1\.1 401 Unauthorized/)
  assert.match(step, /WWW-Authenticate/)
  // Projection only attaches the real response; it does not rewrite notes.
  // The UI renders the short action sentence + the response block instead.
  assert.equal(out.findings[0].stepNotes[0], state.findings[0].stepNotes[0])
  // canonical untouched
  assert.doesNotMatch(state.findings[0].steps[0], /实际响应/)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('every step gets a raw response even when evidence count differs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-resp-'))
  fs.mkdirSync(path.join(dir, 'evidence'), { recursive: true })
  const files = ['a.txt', 'b.txt', 'c.txt']
  files.forEach((name, i) => fs.writeFileSync(path.join(dir, 'evidence', name),
    `=== REQUEST ===\nGET /step${i} HTTP/1.1\nHost: t.test\n\n=== RESPONSE ===\nHTTP/1.1 200 OK\nContent-Type: application/json\n\n{"n":${i},"body":"${'x'.repeat(3000)}"}`, 'utf8'))
  const state = {
    goal: { workdir: dir, target: 't.test' },
    evidence: files.map((p, i) => ({ id: `e${i}`, path: `evidence/${p}`, summary: `第${i}步返回 200` })),
    findings: [{
      id: 'f1', severity: 'high',
      steps: files.map((_, i) => `GET /step${i} HTTP/1.1\r\nHost: t.test\r\n\r\n`),
      stepNotes: files.map((_, i) => `请求第${i}步，返回 200 且带 body`),
      evidenceIds: files.map((_, i) => `e${i}`)
    }]
  }
  const out = attachAllStepResponses(state)
  out.findings[0].steps.forEach((step, i) => {
    assert.match(step, /实际响应：/)
    assert.match(step, /HTTP\/1\.1 200 OK/)
    assert.match(step, /Content-Type: application\/json/)
    assert.ok(step.length < 2200, 'long response must be trimmed, not dropped')
  })
  fs.rmSync(dir, { recursive: true, force: true })
})

test('worker prompt and schema require actual responses, not 预期', () => {
  const prompt = buildWorkerPrompt({
    direction: { question: 'q', doneWhen: 'd', stage: 'surface' },
    target: 'https://t.test', workdir: 'w'
  })
  assert.match(prompt, /实际响应原文/)
  assert.match(prompt, /不要只写请求包或「预期/)
  assert.match(JSON.stringify(WORKER_SCHEMA), /ACTUAL response/)
})
