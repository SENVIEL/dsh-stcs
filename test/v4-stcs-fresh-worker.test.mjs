import assert from 'node:assert/strict'
import test from 'node:test'

import { buildStcsProtocol, buildStcsWorkerPrompt } from '../lib/artex/prompt.js'
import { formatAttachment } from '../lib/artex/attachment.js'
import { V4Dispatcher } from '../lib/v4/dispatch.js'

test('STCS worker prompt carries one hypothesis and a bounded attachment, not the global situational pack', () => {
  const attachment = {
    items: [{ evidenceId: 'e1', path: 'evidence/login.txt', kind: 'response', role: 'proof', summary: 'login response', excerpt: 'HTTP/1.1 200 OK' }],
    bytes: 15,
    note: 'only this hypothesis'
  }
  const prompt = buildStcsWorkerPrompt({
    direction: { question: 'GET /api/user/list 是否越权？', doneWhen: '取响应并判定' },
    target: 'https://example.com',
    workdir: 'C:/work/stcs',
    taskId: 'task-1',
    attachment
  })
  assert.match(prompt, /只回答下面这一个假设/)
  assert.match(prompt, /最小证据附件/)
  assert.match(prompt, /evidence\/login\.txt/)
  assert.doesNotMatch(prompt, /全局态势/)
  assert.doesNotMatch(prompt, /【已确认事实/)
  assert.doesNotMatch(prompt, /上游方向结论/)
  assert.doesNotMatch(prompt, /本方向既往 worker 轨迹/)
})

test('STCS protocol overrides the legacy dispatch protocol and keeps the root read-only', () => {
  const protocol = buildStcsProtocol()
  assert.match(protocol, /最终裁决/)
  assert.match(protocol, /优先级高于 pentest:protocol/)
  assert.match(protocol, /主会话·只读/)
  assert.match(protocol, /artex_status/)
  assert.match(protocol, /禁止.*pentest_flow_dispatch/)
  assert.match(protocol, /只有用户本人/)
})

test('STCS attachment formatter exposes only the supplied minimal rows', () => {
  const text = formatAttachment({ items: [{ evidenceId: 'e1', kind: 'response', role: 'proof', path: 'evidence/a.txt', summary: 's', excerpt: 'HTTP/1.1 200' }], note: 'n' })
  assert.match(text, /evidence\/a\.txt/)
  assert.match(text, /HTTP\/1\.1 200/)
  assert.doesNotMatch(text, /全局态势/)
})

class FakeSession {
  constructor(state) {
    this.state = state
    this.seq = 0
  }
  async read() { return structuredClone(this.state) }
  async run(cmd) {
    if (cmd.type === 'task' && cmd.op === 'assign') {
      const task = { id: `task-${++this.seq}`, directionId: cmd.directionId, state: 'queued' }
      this.state.tasks.push(task)
      return structuredClone(this.state)
    }
    if (cmd.type === 'task' && cmd.op === 'start') {
      const task = this.state.tasks.find((item) => item.id === cmd.id)
      if (task) task.state = 'running'
      return structuredClone(this.state)
    }
    if (cmd.type === 'worker' && cmd.op === 'commit') {
      const task = this.state.tasks.find((item) => item.id === cmd.taskId)
      if (task) task.state = 'done'
      return structuredClone(this.state)
    }
    return structuredClone(this.state)
  }
}

test('V4Dispatcher honors promptBuilder, worker preset and retireOnSettle without changing defaults', async () => {
  const state = {
    version: 4,
    revision: 1,
    sessionId: 's1',
    goal: { target: 'https://example.com', targets: ['https://example.com'], objective: 'test', authorization: 'authorized', workdir: 'C:/work/stcs', phase: 'active' },
    settings: { workerLimit: 6 },
    directions: [{ id: 'direction-1', state: 'open', question: 'GET /api/user/list 是否越权？', doneWhen: '取响应', stage: 'probe' }],
    facts: [], findings: [], assets: [], evidence: [], validations: [], coverage: [], tasks: [], planner: { candidates: [] }, goals: []
  }
  const session = new FakeSession(state)
  let promptText = ''
  let preset = ''
  let disposed = 0
  let committed = false
  const subagents = {
    getProvider: () => ({ capabilities: { outputSchema: true } }),
    startActivation: async (spec) => {
      promptText = spec.request.prompt[0].text
      preset = spec.request.agentPreset || ''
      return {
        childId: 'child-1',
        result: Promise.resolve({
          stopReason: 'completed',
          structured: { conclusion: 'done', directionState: 'done', evidence: [], facts: [], findings: [] }
        }),
        dispose: async () => { disposed += 1 }
      }
    }
  }
  const dispatcher = new V4Dispatcher({
    session,
    subagents,
    agent: { id: 's1', session: { header: { agentPreset: 'artex' } } },
    cwd: 'C:/work/stcs',
    promptBuilder: (args) => {
      promptText = buildStcsWorkerPrompt({ ...args, attachment: { items: [], note: 'none' } })
      return promptText
    },
    retireOnSettle: true,
    onCommit: () => { committed = true }
  })
  const out = await dispatcher.assign('direction-1', { agentPreset: 'standard' })
  assert.equal(out.directionId, 'direction-1')
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(preset, 'standard')
  assert.match(promptText, /最小证据附件/)
  assert.equal(disposed, 1)
  assert.equal(committed, true)
})
