import test from 'node:test';
import assert from 'node:assert/strict';
import { createV4State, ensureV4Collections } from '../lib/v4/state.js';
import { reduceV4 } from '../lib/v4/reduce.js';

function settledState() {
  let state = createV4State({ sessionId: 'goal-life-1', target: 'https://t.test', objective: 'o', now: 1 });
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'request', role: 'proof', sha256: 'a'.repeat(64), path: 'e.txt', summary: 'proof' }],
    now: 2
  });
  state = reduceV4(state, {
    type: 'direction', op: 'add', axis: ['input'], question: 'input?', doneWhen: 'proof', now: 3
  });
  state = reduceV4(state, {
    type: 'fact', op: 'add', directionId: 'direction-1',
    answer: 'observed input behavior', confidence: 'observed', evidenceIds: ['evidence-1'], now: 4
  });
  state = reduceV4(state, {
    type: 'direction', op: 'update', id: 'direction-1', state: 'done',
    conclusion: { answer: 'observed input behavior', evidenceIds: ['evidence-1'] }, now: 5
  });
  return reduceV4(state, {
    type: 'goal', op: 'prove', goalId: 'goal-1', evidenceId: 'fact-1', reason: 'observed fact proves it', now: 6
  });
}

test('root goal refuses an unresolved/unobserved proof fact', () => {
  let state = createV4State({ sessionId: 'goal-life-2', target: 'https://t.test', objective: 'o', now: 1 });
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'request', role: 'proof', sha256: 'b'.repeat(64), path: 'e.txt', summary: 'proof' }],
    now: 2
  });
  state = reduceV4(state, {
    type: 'direction', op: 'add', axis: ['input'], question: 'input?', doneWhen: 'proof', now: 3
  });
  state = reduceV4(state, {
    type: 'fact', op: 'add', directionId: 'direction-1',
    answer: '积分兑换链路未验证，不能作为无漏洞结论', confidence: 'inferred', evidenceIds: ['evidence-1'], now: 4
  });
  state = reduceV4(state, {
    type: 'direction', op: 'update', id: 'direction-1', state: 'done',
    conclusion: { answer: 'not tested', evidenceIds: ['evidence-1'] }, now: 5
  });
  assert.throws(
    () => reduceV4(state, {
      type: 'goal', op: 'prove', goalId: 'goal-1', evidenceId: 'fact-1', reason: 'unreachable', now: 6
    }),
    (error) => error.code === 'goal/unverified'
  );
});

test('ensureV4Collections reopens a done root goal when a candidate direction is still pending', () => {
  const state = settledState();
  assert.equal(state.goals[0].state, 'met');
  assert.equal(state.goal.phase, 'done');
  state.planner.candidates.push({
    id: 'candidate-1',
    question: 'still pending?',
    doneWhen: 'answered',
    state: 'proposed',
    createdAt: 7
  });
  const next = ensureV4Collections(state);
  assert.equal(next.goals[0].state, 'open');
  assert.equal(next.goal.phase, 'active');
  assert.equal(next.goals[0].proofs[0].invalidated, true);
});
