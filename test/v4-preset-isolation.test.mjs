import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('every pentest guard is gated to the pentest preset', () => {
  const start = source.indexOf('const isPentestGuardSession')
  const body = source.slice(start, source.indexOf('const autoGoalFromMessage', start))
  assert.match(body, /preset !== 'pentest'\) return false|return preset === 'pentest'/)

  // The four guards must consult the gate before any denial path.
  for (const guard of ['const workdirGuard', 'const scopeGuard', 'const hardBoundaryGuard', 'const goalLifecycleGuard']) {
    const at = source.indexOf(guard)
    assert.ok(at > 0, `${guard} missing`)
    const chunk = source.slice(at, at + 1400)
    assert.match(chunk, /isPentestGuardSession\(/, `${guard} is not preset-gated`)
  }
})

test('standard-mode sessions can never be denied by pentest guards', () => {
  // A standard session has no preset=pentest, so the gate returns false and
  // every guard returns next()/undefined before reading a goal or a path.
  assert.match(source, /NEVER affect standard/)
})
