/**
 * Content-addressed evidence export.
 *
 * v3 records already carry request/response/expected/note plus sha256, but the
 * bytes only exist inside the JSON state row. This module materializes the
 * canonical evidence payloads under the engagement workdir:
 *
 *   evidence/
 *     index.json
 *     blobs/<sha256>.json
 *
 * It is deliberately a file projection of existing state evidence, not a new
 * state schema. Export is idempotent and verification is read-only.
 */
import fs from 'node:fs'
import path from 'node:path'
import { canonicalEvidencePayload, sha256 } from './evidence-v3.js'

export const EVIDENCE_STORE_VERSION = 1

function text(value) {
  return value === undefined || value === null ? '' : String(value)
}

function fail(code, message) {
  const error = new Error(message)
  error.code = code
  throw error
}

function safeFilename(hash) {
  if (!/^[a-f0-9]{64}$/.test(hash)) fail('evidence/hash', 'invalid evidence sha256')
  return `${hash}.json`
}

function writeAtomic(file, textValue) {
  const temp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  fs.writeFileSync(temp, textValue, 'utf8')
  try {
    // Windows rename does not replace an existing file; remove only after the
    // replacement bytes are already safely on disk.
    if (fs.existsSync(file)) fs.rmSync(file, { force: true })
    fs.renameSync(temp, file)
  } catch (error) {
    try { fs.unlinkSync(temp) } catch { /* best effort */ }
    throw error
  }
}

function ensureWorkdir(workdir) {
  const root = text(workdir).trim()
  if (!root) fail('evidence/workdir', 'evidence export requires goal.workdir')
  return path.resolve(root)
}

export function evidenceBlobName(record) {
  return safeFilename(sha256(canonicalEvidencePayload(record)))
}

/**
 * Export all records in `evidence` under <workdir>/evidence. Same content is
 * reused; a changed record with a different canonical hash gets a new blob.
 */
export function exportEvidence({ evidence, workdir, now = Date.now() }) {
  const base = ensureWorkdir(workdir)
  const records = Array.isArray(evidence) ? evidence.filter((record) => record && typeof record === 'object') : []
  const root = path.join(base, 'evidence')
  const blobDir = path.join(root, 'blobs')
  fs.mkdirSync(blobDir, { recursive: true })
  const index = []
  let exported = 0
  let reused = 0
  let skipped = 0
  for (const record of records) {
    const id = text(record.id).trim()
    if (!id) {
      skipped += 1
      continue
    }
    const hash = sha256(canonicalEvidencePayload(record))
    const filename = safeFilename(hash)
    const target = path.join(blobDir, filename)
    const payload = JSON.stringify({
      version: EVIDENCE_STORE_VERSION,
      sha256: hash,
      record
    }, null, 2) + '\n'
    if (fs.existsSync(target)) {
      let current
      try {
        current = JSON.parse(fs.readFileSync(target, 'utf8'))
      } catch {
        current = null
      }
      if (current?.sha256 === hash) {
        reused += 1
      } else {
        writeAtomic(target, payload)
        exported += 1
      }
    } else {
      writeAtomic(target, payload)
      exported += 1
    }
    index.push({
      id,
      kind: text(record.kind),
      findingId: text(record.findingId),
      sha256: hash,
      file: path.relative(root, target).split(path.sep).join('/'),
      bytes: Buffer.byteLength(payload, 'utf8')
    })
  }
  const indexPayload = JSON.stringify({
    version: EVIDENCE_STORE_VERSION,
    generatedAt: now,
    total: index.length,
    blobs: index
  }, null, 2) + '\n'
  const indexPath = path.join(root, 'index.json')
  writeAtomic(indexPath, indexPayload)
  return {
    ok: true,
    root,
    indexPath,
    total: index.length,
    exported,
    reused,
    skipped,
    blobs: index
  }
}

/**
 * Verify every expected evidence record has a blob whose canonical sha256
 * matches. Extra blobs are allowed; missing or tampered blobs are not.
 */
export function verifyEvidenceExport({ evidence, workdir }) {
  const base = ensureWorkdir(workdir)
  const root = path.join(base, 'evidence')
  const records = Array.isArray(evidence) ? evidence.filter((record) => record && typeof record === 'object') : []
  const problems = []
  const checked = []
  for (const record of records) {
    const id = text(record.id).trim()
    if (!id) continue
    const hash = sha256(canonicalEvidencePayload(record))
    const target = path.join(root, 'blobs', safeFilename(hash))
    if (!fs.existsSync(target)) {
      problems.push(`${id}: missing evidence blob ${hash}`)
      continue
    }
    let parsed
    try {
      parsed = JSON.parse(fs.readFileSync(target, 'utf8'))
    } catch {
      problems.push(`${id}: unreadable evidence blob ${hash}`)
      continue
    }
    if (parsed?.sha256 !== hash) {
      problems.push(`${id}: blob sha256 mismatch`)
      continue
    }
    if (!parsed?.record || sha256(canonicalEvidencePayload(parsed.record)) !== hash) {
      problems.push(`${id}: embedded record hash mismatch`)
      continue
    }
    checked.push({ id, sha256: hash, file: path.relative(root, target).split(path.sep).join('/') })
  }
  return {
    ok: problems.length === 0,
    checked: checked.length,
    problems,
    records: checked,
    root
  }
}
