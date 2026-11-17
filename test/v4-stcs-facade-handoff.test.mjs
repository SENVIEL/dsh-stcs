import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}

// The preset registry rejects a mount when a row stays pending on an injected
// service. `dsh-pentest-v2/artex` must activate on its own and pick the v4
// facade up through the process-global handoff, even when the sibling row has
// not published it yet.
test('artex row activates without pentestV4 and reports not-ready instead of pending', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stcs-facade-'))
  try {
    fs.cpSync(path.resolve(import.meta.dirname, '..', 'lib'), path.join(root, 'lib'), { recursive: true })
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-tools', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-tools', 'index.js'), 'export function defineTool(value){ return value }')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-storage-domain', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-storage-domain', 'index.js'), 'export function defineDomain(value){ return value }\nexport function domainTable(value){ return value }')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-session', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-session', 'index.js'), 'export function appendPluginRecord(){}')
    write(path.join(root, 'node_modules', 'zod', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', 'zod', 'index.js'), 'export const z = { any(){ return {} } }')

    const tools = []
    const cleanups = []
    const ctx = {
      tools: {
        register(tool) { tools.push(tool) },
        guard() { return () => {} }
      },
      storageDomain: {
        get() { return undefined },
        async open(spec) {
          return { table() { return { async get() { return undefined }, async put() {} } } }
        }
      },
      sessions: { get() { return undefined } },
      agents: {},
      subagents: {},
      get() { return undefined },
      inject(_names, callback) {
        callback({ systemPrompt: { section() { return () => {} } } })
      },
      effect(fn) {
        const cleanup = fn()
        if (typeof cleanup === 'function') cleanups.push(cleanup)
        return cleanup
      },
      logger: { warn() {} }
    }

    const module = await import(pathToFileURL(path.join(root, 'lib', 'artex', 'plugin.js')).href)
    assert.ok(Array.isArray(module.inject))
    assert.equal(module.inject.includes('pentestV4'), false, 'pentestV4 must not be a hard injection')

    module.apply(ctx, { enabled: false })
    const status = tools.find((tool) => tool.name === 'artex_status')
    assert.ok(status, 'artex_status is registered even before the sibling facade exists')
    const value = await status.execute({}, { agent: { id: 'root', session: { id: 'root', header: {} } } })
    assert.equal(value.ready, false)
    assert.equal(value.reason, 'pentestV4-unavailable')

    for (const cleanup of cleanups.reverse()) cleanup()
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
