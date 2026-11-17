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

test('full plugin stack executes goal, planner, trace, asset graph and evidence', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-full-'))
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
    const tools = []
    const cleanups = []
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
    const byName = new Map(tools.map((tool) => [tool.name, tool]))
    const call = (name, args = {}) => {
      const tool = byName.get(name)
      assert.ok(tool, `${name} must be registered`)
      return tool.execute(args, exec)
    }
    const exec = { agent: { session: { id: 'session-full', header: { cwd: root } } } }

    const goal = await call('pentest_add_goal', {
      target: 'https://example.test',
      objective: 'full integration test',
      workdir: path.join(root, 'work')
    })
    assert.equal(goal.initialized, true)

    const direction = await call('pentest_add_intent', {
      title: 'recon login',
      detail: 'map login',
      doneWhen: 'endpoint known'
    })
    assert.ok(direction.id)
    assert.ok(direction.taskId)

    const planBefore = await call('pentest_plan', { limit: 5 })
    assert.equal(planBefore.counts.runnable, 1)
    assert.equal(planBefore.actions[0].kind, 'dispatch_task')

    const trace = await call('pentest_trace_add', {
      taskId: direction.taskId,
      step: '1',
      tool: 'pwsh',
      summary: 'probe login',
      detail: 'GET /login -> 200'
    })
    assert.equal(trace.reused, false)
    const traceHits = await call('pentest_trace_search', { query: 'login' })
    assert.equal(traceHits.total, 1)
    const traceRead = await call('pentest_trace_get', { eventId: trace.event.id })
    assert.equal(traceRead.total, 1)

    const imported = await call('pentest_asset_import', {
      rows: [{ type: 'endpoint', value: 'https://example.test/login', meta: 'login' }]
    })
    assert.equal(imported.results.length, 1)
    const assets = await call('pentest_asset_search', { query: 'login' })
    assert.equal(assets.total, 1)
    const assetId = assets.items[0].id
    const link = await call('pentest_asset_link', {
      nodeType: 'direction', nodeId: direction.id, assetId
    })
    assert.equal(link.reused, false)

    const localAsset = await call('pentest_add_asset', {
      type: 'endpoint', value: 'https://example.test/login', meta: 'local mirror'
    })
    assert.equal(localAsset.scopeKey, 'example.test')
    const duplicateAsset = await call('pentest_add_asset', {
      type: 'endpoint', value: 'https://example.test/login', meta: 'local mirror'
    })
    assert.equal(duplicateAsset.reused, true)
    const mirrored = await call('pentest_asset_search', { query: 'example.test/login' })
    assert.ok(mirrored.total >= 1)

    const finding = await call('pentest_add_finding', {
      title: 'Exposed login',
      severity: 'high',
      intentId: direction.id,
      reproducibleSteps: ['GET /login HTTP/1.1\r\nHost: example.test\r\n\r\n'],
      stepNotes: ['read login page'],
      stepResponses: ['HTTP/1.1 200 OK\r\n\r\nlogin'],
      apiSources: ['https://example.test/static/app.js -> /login'],
      evidenceStatus: 'confirmed'
    })
    assert.ok(finding.id)
    assert.ok(Array.isArray(finding.evidenceIds))
    assert.ok(finding.evidenceIds.length >= 1)
    assert.equal(finding.steps[0].response, 'HTTP/1.1 200 OK\r\n\r\nlogin')

    const audit = await call('pentest_evidence_audit')
    assert.equal(audit.evidenceCount, 1)
    assert.equal(audit.missingEvidence.length, 0)
    assert.equal(audit.hashMismatches.length, 0)

    const exported = await call('pentest_evidence_export')
    assert.equal(exported.ok, true)
    assert.equal(exported.total, 1)
    assert.equal(fs.existsSync(exported.indexPath), true)
    const index = JSON.parse(fs.readFileSync(exported.indexPath, 'utf8'))
    const blob = JSON.parse(fs.readFileSync(path.join(exported.root, index.blobs[0].file), 'utf8'))
    assert.equal(blob.record.response, 'HTTP/1.1 200 OK\r\n\r\nlogin')
    const verified = await call('pentest_evidence_verify')
    assert.equal(verified.ok, true)
    assert.equal(verified.checked, 1)

    const planAfter = await call('pentest_plan', { limit: 5 })
    assert.equal(planAfter.counts.pendingValidation, 1)
    assert.equal(planAfter.pendingValidation[0].findingId, finding.id)

    const state = await call('pentest_state')
    assert.equal(state.counts.directions, 1)
    assert.equal(state.counts.facts, 0)
    assert.equal(state.counts.findings, 1)
    assert.equal(state.counts.evidence, 1)
    assert.equal(state.counts.assets, 1)

    const links = await call('pentest_asset_links', { nodeType: 'direction' })
    assert.equal(links.total, 1)

    const validation = await call('pentest_validate_finding', {
      findingId: finding.id, verdict: 'reproduced', validator: 'manual', notes: 'full-stack'
    })
    assert.equal(validation.validation.verdict, 'reproduced')
    const auditAfterValidation = await call('pentest_evidence_audit')
    assert.equal(auditAfterValidation.ok, true)

    for (const cleanup of cleanups) cleanup()
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
