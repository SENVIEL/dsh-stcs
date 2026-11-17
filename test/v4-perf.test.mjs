import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { enrichFindingsFromEvidence, clearEvidenceFileCache } from '../lib/v4/finding-fields.js'
import { toProjection } from '../lib/projection.js'
import { shouldEmitSnapshot, snapshotIntervalForEvidence } from '../lib/snapshot-gate.js'

test('evidence file cache invalidates when path/mtime/size changes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-evidence-cache-'))
  try {
    clearEvidenceFileCache()
    const file = path.join(dir, 'evidence', 'spec.json')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify({ description: 'first', steps: ['GET /one'] }))
    const state = {
      goal: { workdir: dir },
      findings: [{ id: 'finding-1', claim: 'claim', evidenceIds: ['evidence-1'] }],
      evidence: [{ id: 'evidence-1', path: 'evidence/spec.json' }]
    }
    assert.equal(enrichFindingsFromEvidence(state).findings[0].description, 'first')

    fs.writeFileSync(file, JSON.stringify({ description: 'second', steps: ['GET /two'] }))
    const future = new Date(Date.now() + 5000)
    fs.utimesSync(file, future, future)
    assert.equal(enrichFindingsFromEvidence(state).findings[0].description, 'second')
  } finally {
    clearEvidenceFileCache()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('projection keeps finding evidence references while slimming evidence payloads', () => {
  const view = toProjection({
    version: 4, revision: 3, sessionId: 's1',
    goal: { id: 'goal-1', target: 'https://t.test', phase: 'active' },
    directions: [{ id: 'direction-1', question: 'q', state: 'done', axis: ['surface'] }],
    facts: [], findings: [{
      id: 'finding-1', directionId: 'direction-1', claim: 'claim', severity: 'high',
      evidenceIds: ['evidence-1'], status: 'confirmed', createdAt: 1
    }],
    evidence: [{
      id: 'evidence-1', kind: 'response', role: 'proof', path: 'evidence/e1.txt',
      sha256: 'a'.repeat(64), summary: 'proof', createdAt: 1, extra: 'must be dropped'
    }],
    validations: [{ id: 'validation-1', findingId: 'finding-1', verdict: 'reproduced', validator: 'agent:pentest-auditor', evidenceIds: ['evidence-1'], at: 2 }],
    coverage: [], queue: [], edges: [], digests: [], tasks: []
  })
  assert.deepEqual(Object.keys(view.evidence[0]).sort(), ['id', 'path', 'sha256', 'summary'])
  const finding = view.findings.find((item) => item.id === 'finding-1')
  assert.deepEqual(finding.evidenceIds, ['evidence-1'])
  assert.equal(finding.validation.verdict, 'reproduced')
})

test('snapshot gate adapts to evidence volume and never throttles safety changes', () => {
  // OOM regression: full-state snapshots measured 1.2–1.6 MB; keep the
  // interval high to avoid thousands of large session-log events.
  assert.equal(snapshotIntervalForEvidence(0), 50)
  assert.equal(snapshotIntervalForEvidence(99), 50)
  assert.equal(snapshotIntervalForEvidence(100), 100)
  assert.equal(snapshotIntervalForEvidence(250), 100)
  assert.equal(snapshotIntervalForEvidence(251), 150)

  assert.equal(shouldEmitSnapshot({ revision: 55, last: 50, evidenceCount: 300 }), false)
  assert.equal(shouldEmitSnapshot({ revision: 199, last: 50, evidenceCount: 300 }), false)
  assert.equal(shouldEmitSnapshot({ revision: 200, last: 50, evidenceCount: 300 }), true)
  assert.equal(shouldEmitSnapshot({ revision: 55, last: 54, evidenceCount: 300, findingStateChanged: true }), true)
  assert.equal(shouldEmitSnapshot({ revision: 55, last: 54, evidenceCount: 300, criticalHighChanged: true }), true)
  assert.equal(shouldEmitSnapshot({ revision: 55, last: 54, evidenceCount: 300, goalChanged: true }), true)
  assert.equal(shouldEmitSnapshot({ revision: 55, last: 55, evidenceCount: 300, force: true }), true)
  assert.equal(shouldEmitSnapshot({ revision: 55, last: 55, evidenceCount: 300 }), false)
})
