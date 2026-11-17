import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('startup reprojects every v4 session so stale snapshots are rebuilt', () => {
  const tick = source.slice(source.indexOf('const tick = async () =>'), source.indexOf('const timer = setInterval'))
  assert.match(tick, /v4StartupReprojected/)
  assert.match(tick, /for \(const sessionId of v4CachedKeys\)/)
  assert.match(tick, /await reprojectSession\(sessionId, \{ force: true \}\)/)
  // no dependency on an open chat: no ctx.sessions.get gate in this loop
  const loop = tick.slice(tick.indexOf('if (!v4StartupReprojected)'), tick.indexOf('// Only sessions with their OWN live agent'))
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
  assert.doesNotMatch(loop, /ctx\.sessions/)
  assert.doesNotMatch(loop, /v4Attempted/)
  assert.match(loop, /reprojectSession\(sessionId, \{ force: true \}\)/)
})
