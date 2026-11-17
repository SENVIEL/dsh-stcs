import assert from 'node:assert/strict'
import test from 'node:test'

import { RETEST_VERDICTS, evaluateRetest, aggregateRetests } from '../lib/v4/retest.js'

const finding = { id: 'finding-1', severity: 'high', claim: 'SQLi' }

test('a single failed reproduction is inconclusive, never fixed', () => {
  const r = evaluateRetest({
    priorFinding: finding,
    currentEvidence: [{ role: 'supporting', path: 'e/1.txt' }],
    attempts: [{ reproduced: false }],
    comparableEnvironment: true,
    normalControl: [{ ok: true }],
    now: 1
  })
  assert.equal(r.verdict, 'inconclusive')
  assert.ok(r.requirements.some((x) => x.includes('two consistent')))
})

test('fixed requires comparable env + normal control + two attempts', () => {
  const r = evaluateRetest({
    priorFinding: finding,
    currentEvidence: [{ role: 'supporting', path: 'e/1.txt' }],
    attempts: [{ reproduced: false }, { result: 'not_reproduced' }],
    comparableEnvironment: true,
    normalControl: [{ ok: true, status: '200' }],
    now: 2
  })
  assert.equal(r.verdict, 'fixed')
})

test('uncomparable environment or missing control blocks fixed', () => {
  const base = {
    priorFinding: finding,
    currentEvidence: [{ role: 'supporting', path: 'e/1.txt' }],
    attempts: [{ reproduced: false }, { reproduced: false }]
  };
  assert.equal(evaluateRetest({ ...base, comparableEnvironment: false, normalControl: [{ ok: true }] }).verdict, 'inconclusive');
  assert.equal(evaluateRetest({ ...base, comparableEnvironment: true, normalControl: null }).verdict, 'inconclusive');
  assert.equal(evaluateRetest({ ...base, comparableEnvironment: true, normalControl: [{ ok: false }] }).verdict, 'inconclusive');
})

test('independent proof evidence yields reproduced even with failed attempts', () => {
  const r = evaluateRetest({
    priorFinding: finding,
    currentEvidence: [{ role: 'proof', sha256: 'a'.repeat(64), path: 'e/proof.txt' }],
    attempts: [{ reproduced: false }, { reproduced: false }],
    comparableEnvironment: true,
    normalControl: [{ ok: true }]
  })
  assert.equal(r.verdict, 'reproduced')
})

test('missing prior finding keeps the entry hard-gate', () => {
  assert.equal(evaluateRetest({ currentEvidence: [], attempts: [] }).verdict, 'inconclusive')
  assert.match(evaluateRetest({}).reason, /priorFinding/)
})

test('aggregate gate blocks delivery on inconclusive high/critical', () => {
  const a = aggregateRetests([
    { findingId: 'finding-1', verdict: 'fixed' },
    { findingId: 'finding-2', verdict: 'inconclusive', reason: 'one failure only' },
    { findingId: 'finding-3', verdict: 'reproduced' }
  ])
  assert.deepEqual(a.counts, { reproduced: 1, fixed: 1, inconclusive: 1 })
  assert.equal(a.deliverable, false)
  assert.ok(a.blockers.some((x) => x.includes('finding-2')))
  assert.equal(aggregateRetests([{ findingId: 'x', verdict: 'fixed' }]).deliverable, true)
  assert.ok(RETEST_VERDICTS.includes('inconclusive'))
})
