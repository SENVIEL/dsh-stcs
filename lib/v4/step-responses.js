/**
 * Attach the ACTUAL response to every reproduction step.
 *
 * Workers often store only the request packet in `finding.steps`; the observed
 * result is either in evidence files (`### RESPONSE HEADERS ...`), in the
 * evidence summary, or already written into `stepNotes` as "返回 200 且…".
 * A finding detail with a request but no response is unreadable. This module
 * is projection-only: canonical state is never mutated.
 *
 * Long responses are kept but trimmed to the KEY part (status line + key
 * headers + body excerpt), never dropped entirely.
 */
import fs from 'node:fs';
import path from 'node:path';

const MAX_RESPONSE_CHARS = 1400;

function keyPart(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return '';
  const lines = raw.split('\n');
  const statusAt = lines.findIndex((l) => /^HTTP\/[\d.]+\s+[1-5]\d\d/.test(l.trim()));
  const keyHeader = /^(content-type|www-authenticate|location|set-cookie|server|x-|block-|allow|access-control-|transfer-encoding)/i;
  const out = [];
  if (statusAt >= 0) out.push(lines[statusAt].trim());
  for (let i = statusAt + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === '') { if (out.length > 1) break; continue; }
    if (keyHeader.test(l)) out.push(l);
  }
  // Body / prose: everything after the header block, trimmed if long.
  const restAt = statusAt >= 0
    ? lines.findIndex((l, i) => i > statusAt && l.trim() === '')
    : -1;
  const rest = (restAt >= 0 ? lines.slice(restAt + 1) : (statusAt >= 0 ? [] : lines)).join('\n').trim();
  if (rest) out.push(rest);
  let joined = out.join('\n').trim();
  if (!joined) joined = raw;
  return joined.length > MAX_RESPONSE_CHARS
    ? joined.slice(0, MAX_RESPONSE_CHARS).trimEnd() + '\n…（响应体已截断，以上为关键部分）'
    : joined;
}

function responseFromFile(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) return { body: '', request: '' };
    const raw = fs.readFileSync(file, 'utf8');
    const reqLine = requestLineOf((raw.match(/^\s*(?:===\s*REQUEST\s*===|###\s*REQUEST)\s*([\s\S]*?)(?=^\s*(?:===\s*RESPONSE|###\s*RESPONSE))/im)?.[1]) || '');
    const at = raw.search(/^\s*(?:###\s*RESPONSE(?:\s+HEADERS)?|===\s*RESPONSE\s*===)/im);
    if (at < 0) return { body: '', request: reqLine };
    const body = raw.slice(at)
      .replace(/^\s*(?:###\s*RESPONSE(?:\s+HEADERS)?\s*[:\-]?|===\s*RESPONSE\s*===)\s*/i, '')
      .trim();
    return { body, request: reqLine };
  } catch {
    return { body: '', request: '' };
  }
}

function requestLineOf(step) {
  const m = String(step || '').match(/^\s*([A-Z]+)\s+(\S+)/);
  return m ? `${m[1]} ${m[2]}` : '';
}

/** Pull the observed result out of a step note ("返回 200 且…"). */
function resultFromNote(note) {
  const raw = String(note || '').trim();
  if (!raw) return '';
  const m = raw.match(/(?:返回|响应(?:中|体)?|服务端(?:返回|响应)?)[^。；\n]*/);
  if (m && m[0].trim().length > 6) return m[0].trim();
  return '';
}

export function attachStepResponses(finding, state) {
  if (!finding || !Array.isArray(finding.steps) || finding.steps.length === 0) return finding;
  const root = path.resolve(String(state?.goal?.workdir || '.'));
  const byId = new Map((state?.evidence || []).map((item) => [item.id, item]));
  const pool = [];
  for (const id of finding.evidenceIds || []) {
    const ev = byId.get(id);
    if (!ev) continue;
    let body = '', fileRequest = '';
    if (ev.path) {
      const file = path.resolve(root, String(ev.path));
      if (file === root || file.startsWith(root + path.sep)) {
        const got = responseFromFile(file);
        body = got.body; fileRequest = got.request;
      }
    }
    const summary = String(ev.summary || '').trim();
    const text = body || summary;
    if (text) pool.push({
      line: fileRequest || requestLineOf(summary || body),
      text, summary, fromFile: Boolean(body)
    });
  }
  const notes = Array.isArray(finding.stepNotes) ? finding.stepNotes.map(String) : [];
  const count = finding.steps.length;
  const steps = finding.steps.map((rawStep, i) => {
    const step = String(rawStep);
    if (/实际响应|HTTP\/1\.[01]\s+[1-5]\d\d|###\s*RESPONSE/i.test(step)) return step;
    const wanted = requestLineOf(step);
    let text = '';
    // Exact request-line match wins, preferring an entry that actually has a
    // raw response file over a mere prose summary.
    const exact = wanted
      ? pool.filter((r) => r.line === wanted).sort((a, b) => Number(b.fromFile) - Number(a.fromFile))[0]
      : undefined;
    if (exact?.text) text = exact.text;
    else {
      const withFile = pool.filter((r) => r.fromFile);
      const fallback = withFile[i] || withFile[Math.min(i, withFile.length - 1)] || pool[Math.min(i, pool.length - 1)];
      if (fallback?.text) text = fallback.text;
    }
    // Last resort: the observed result is often already in the step note.
    if (!text) text = resultFromNote(notes[i]);
    const key = keyPart(text);
    if (!key) return step;
    return `${step.trimEnd()}\n\n实际响应：\n${key}`;
  });
  return { ...finding, steps };
}

export function attachAllStepResponses(state) {
  if (!state || !Array.isArray(state.findings)) return state;
  return { ...state, findings: state.findings.map((f) => attachStepResponses(f, state)) };
}
