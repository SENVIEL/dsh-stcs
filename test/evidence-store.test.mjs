import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { canonicalEvidencePayload, sha256 } from '../lib/evidence-v3.js'
import { evidenceBlobName, exportEvidence, verifyEvidenceExport } from '../lib/evidence-store.js'

function record(id, request = 'GET / HTTP/1.1\nHost: example.test\n\n', response = 'HTTP/1.1 200 OK') {
  return {
    id,
    findingId: 'finding-1',
    kind: 'http-step',
    request,
    response,
    expected: '200',
    note: 'probe'
  }
}

test('evidence export writes canonical blobs and a stable index', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-store-'))
  try {
    const evidence = [record('evidence-1'), record('evidence-2', 'POST /login HTTP/1.1\nHost: example.test\n\n', '302')]
    const out = exportEvidence({ evidence, workdir: dir, now: 1000 })
    assert.equal(out.ok, true)
    assert.equal(out.total, 2)
    assert.equal(out.exported, 2)
    assert.equal(fs.existsSync(out.indexPath), true)
    for (const blob of out.blobs) assert.equal(fs.existsSync(path.join(out.root, blob.file)), true)
    const expectedHash = sha256(canonicalEvidencePayload(evidence[0]))
    assert.equal(out.blobs[0].sha256, expectedHash)
    assert.equal(evidenceBlobName(evidence[0]), `${expectedHash}.json`)
    const verify = verifyEvidenceExport({ evidence, workdir: dir })
    assert.equal(verify.ok, true)
    assert.equal(verify.checked, 2)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('evidence export is idempotent and verification catches tampering', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-store-'))
  try {
    const evidence = [record('evidence-1')]
    const first = exportEvidence({ evidence, workdir: dir, now: 1 })
    const second = exportEvidence({ evidence, workdir: dir, now: 2 })
    assert.equal(second.exported, 0)
    assert.equal(second.reused, 1)
    const blob = path.join(first.root, first.blobs[0].file)
    const parsed = JSON.parse(fs.readFileSync(blob, 'utf8'))
    parsed.record.response = 'tampered'
    fs.writeFileSync(blob, JSON.stringify(parsed, null, 2), 'utf8')
    const verify = verifyEvidenceExport({ evidence, workdir: dir })
    assert.equal(verify.ok, false)
    assert.match(verify.problems.join('\n'), /embedded record hash mismatch/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('evidence export requires a workdir', () => {
  assert.throws(() => exportEvidence({ evidence: [], workdir: '' }), /goal.workdir/)
  assert.throws(() => verifyEvidenceExport({ evidence: [], workdir: '' }), /goal.workdir/)
})
