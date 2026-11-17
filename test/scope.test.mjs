import test from 'node:test'
import assert from 'node:assert/strict'
import { networkCandidatesFrom, checkNetworkTarget } from '../lib/scope.js'

test('curl command name is not treated as a host', () => {
  const candidates = networkCandidatesFrom('curl.exe -sS -i -A "UA" -m 40 "https://user.riolu.work/login"')
  const ids = candidates.map((item) => item.id)
  assert.ok(ids.includes('user.riolu.work:443'), JSON.stringify(ids))
  assert.ok(!ids.includes('curl.exe:80'), JSON.stringify(ids))
})

test('curl with output flags still finds the real host', () => {
  const candidates = networkCandidatesFrom('curl.exe -sS -o login.html -D hdr.txt "https://user.riolu.work/login"')
  assert.deepEqual(candidates.map((item) => item.id), ['user.riolu.work:443'])
})

test('scope allows research hosts only when the caller opts in', () => {
  const goal = { targets: ['user.riolu.work'], excludedTargets: [], target: 'https://user.riolu.work' }
  assert.equal(checkNetworkTarget(goal, 'https://grep.app/api/search').allowed, false)
  assert.equal(checkNetworkTarget(goal, 'https://grep.app/api/search', { allowResearch: true }).allowed, true)
})

test('explicit exclusions beat the research allowlist', () => {
  const goal = { targets: ['user.riolu.work'], excludedTargets: ['github.com'], target: 'https://user.riolu.work' }
  const result = checkNetworkTarget(goal, 'https://github.com/x', { allowResearch: true })
  assert.equal(result.allowed, false)
  assert.match(result.reason, /excludedTargets/)
})

test('PowerShell variable suffix in a URL is not treated as part of the host', () => {
  const candidates = networkCandidatesFrom('curl.exe -sS "http://candyzzyz.com$p/web/"')
  assert.deepEqual(candidates.map((item) => item.id), ['candyzzyz.com:80'])
})
