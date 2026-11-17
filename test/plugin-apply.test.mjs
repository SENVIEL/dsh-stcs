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

test('plugin apply registers one coherent tool surface', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-plugin-'))
  try {
    fs.cpSync(path.resolve(import.meta.dirname, '..', 'lib'), path.join(root, 'lib'), { recursive: true })
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-tools', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-tools', 'index.js'), `export function defineTool(value){ return value }`)
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-storage-domain', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-storage-domain', 'index.js'), `export function defineDomain(value){ return value }\nexport function domainTable(value){ return value }`)
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-session', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-session', 'index.js'), `export function appendPluginRecord(){}`)
    write(path.join(root, 'node_modules', 'zod', 'package.json'), '{"type":"module","exports":"./index.js"}')
    write(path.join(root, 'node_modules', 'zod', 'index.js'), `export const z = { any(){ return {} } }`)

    const tools = []
    const commands = []
    const cleanups = []
    const tables = new Map()
    const tableFor = (key) => {
      if (!tables.has(key)) {
        const rows = new Map()
        tables.set(key, {
          async get(id) { return rows.get(id) },
          async put(id, value) { rows.set(id, structuredClone(value)) }
        })
      }
      return tables.get(key)
    }
    const ctx = {
      tools: {
        register(tool) { tools.push(tool) },
        guard() { return () => {} }
      },
      storageDomain: {
        get() { return undefined },
        async open(spec) { return { table(name) { return tableFor(`${spec.name}:${name}`) } } }
      },
      sessions: { get() { return undefined } },
      get(name) {
        return name === 'commands'
          ? { register(definition) { commands.push(definition); return () => {} } }
          : undefined
      },
      inject() {},
      effect(fn) {
        const cleanup = fn()
        if (typeof cleanup === 'function') cleanups.push(cleanup)
        return cleanup
      },
      on() { return () => {} },
      logger: { warn() {} }
    }
    const module = await import(pathToFileURL(path.join(root, 'lib', 'plugin.js')).href)
    module.apply(ctx)
    const names = tools.map((tool) => tool.name)
    assert.equal(new Set(names).size, names.length, 'tool names must be unique')
    // The DSH tool-parameter DSL rejects `required` below an array `items`
    // node even though plain JSON Schema permits it. Catch that at test time
    // instead of discovering it as a preset-load failure in the client.
    const invalidRequired = []
    const seenParameterNodes = new WeakSet()
    const visitParameters = (node, path, itemSchema = false) => {
      if (!node || typeof node !== 'object' || Array.isArray(node)) return
      if (seenParameterNodes.has(node)) return
      seenParameterNodes.add(node)
      if (itemSchema && Object.hasOwn(node, 'required')) invalidRequired.push(`${path}.required`)
      for (const [key, value] of Object.entries(node)) {
        visitParameters(value, `${path}.${key}`, key === 'items' && node.type === 'array')
      }
    }
    for (const tool of tools) visitParameters(tool.parameters, `${tool.name}.parameters`)
    assert.deepEqual(invalidRequired, [], 'nested required is not supported by the DSH value schema DSL')
    assert.deepEqual(commands.map((command) => command.name).sort(), [
      'pentest-audit-pending',
      'pentest-pause-all',
      'pentest-resume-all'
    ])
    for (const name of [
      'pentest_flow_role',
      'pentest_flow_validate',
      'pentest_plan',
      'pentest_trace_add',
      'pentest_trace_search',
      'pentest_trace_get',
      'pentest_trace_stats',
      'pentest_asset_import',
      'pentest_asset_search',
      'pentest_asset_link',
      'pentest_asset_links',
      'pentest_asset_stats',
      'pentest_evidence_export',
      'pentest_evidence_verify'
    ]) {
      assert.ok(names.includes(name), `${name} must be registered`)
    }

    const traceAdd = tools.find((tool) => tool.name === 'pentest_trace_add')
    const traceSearch = tools.find((tool) => tool.name === 'pentest_trace_search')
    const exec = { agent: { session: { id: 's1' } } }
    const probe = tools.find((tool) => tool.name === 'pentest_runtime_probe')
    assert.ok(probe, 'pentest_runtime_probe must be registered')
    const probed = await probe.execute({}, exec)
    assert.equal(probed.services.subagents, false)
    assert.deepEqual(probed.providers, [])
    const added = await traceAdd.execute({
      taskId: 'task-1', step: '1', tool: 'pwsh', summary: 'probe login', detail: 'GET /login -> 200'
    }, exec)
    assert.equal(added.reused, false)
    const searched = await traceSearch.execute({ query: 'login' }, exec)
    assert.equal(searched.total, 1)
    assert.equal(searched.items[0].summary, 'probe login')

    const flowStart = tools.find((tool) => tool.name === 'pentest_flow_start')
    const flowStatus = tools.find((tool) => tool.name === 'pentest_flow_status')
    assert.ok(flowStart && flowStatus)
    await flowStart.execute({ target: 'https://pause.test', objective: 'pause command', authorization: 'test authorization' }, exec)
    const pause = commands.find((command) => command.name === 'pentest-pause-all')
    const resume = commands.find((command) => command.name === 'pentest-resume-all')
    const invocation = { agent: { session: { id: 's1', header: { cwd: root } } } }
    const paused = await pause.handler(invocation)
    assert.equal(paused.kind, 'success')
    assert.equal((await flowStatus.execute({}, exec)).goal.phase, 'paused')
    const resumed = await resume.handler(invocation)
    assert.equal(resumed.kind, 'success')
    assert.equal((await flowStatus.execute({}, exec)).goal.phase, 'active')

    for (const cleanup of cleanups) cleanup()
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
