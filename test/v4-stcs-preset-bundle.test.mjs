import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const patch = fs.readFileSync(path.join(root, 'cordis.patch.yml'), 'utf8')

test('dsh-stcs is one self-contained bundle package', () => {
  assert.equal(pkg.name, 'dsh-stcs')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.ok(pkg.files.includes('cordis.patch.yml'))
  assert.equal(pkg.dependencies, undefined)
  assert.equal((patch.match(/^- insert:/gm) || []).length, 2)
  assert.match(patch, /id: preset-artex/)
  assert.match(patch, /id: artex\b/)
  assert.match(patch, /name: STCS/)
  assert.match(patch, /- id: pentest\n            name: 'dsh-stcs\/plugin'/)
  assert.match(patch, /name: 'dsh-stcs\/artex'/)
  assert.match(patch, /- id: ui-stcs\n      name: 'dsh-stcs'/)
  assert.match(patch, /fetch: true/)
  assert.doesNotMatch(patch, /@howmp\/dsh-pentest/)
  assert.doesNotMatch(patch, /dsh-pentest-stcs/)
  assert.doesNotMatch(patch, /- id: (?:pentest-guard|pentest-preset-root|ui-pentest|storage-sqlite)/)
  assert.doesNotMatch(patch, /name: cordis:include/)
})
