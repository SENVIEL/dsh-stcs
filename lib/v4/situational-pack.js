/**
 * P0-2 worker situational pack.
 *
 * A v4 worker used to receive only one `direction.question`. On a second
 * dispatch for the same direction it re-curled the same URLs, lost the chain
 * from upstream conclusions, and could not build multi-step findings. This
 * module assembles a bounded, read-only "what the engagement already knows"
 * block from canonical v4 state. It is pure: no I/O, no state mutation.
 */

const MAX_FACTS = 12;
const MAX_ASSETS = 10;
const MAX_CONCLUSIONS = 6;
const MAX_SIBLINGS = 4;
const MAX_URLS = 16;
const MAX_LINE = 220;

function text(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function line(value, max = MAX_LINE) {
  const flat = text(value).replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function tokens(value) {
  return new Set(
    text(value).toLowerCase().split(/[^a-z0-9\u4e00-\u9fff._/-]+/i)
      .filter((item) => item.length >= 3)
  );
}

function relevance(value, seeds) {
  const hay = text(value).toLowerCase();
  let score = 0;
  for (const token of seeds) if (hay.includes(token)) score += 1;
  return score;
}

/** Extract HTTP(S) targets from free text and normalise a replayable URL key. */
export function extractTestedUrls(state) {
  const urls = new Map();
  const base = (() => {
    const raw = text(state?.goal?.target || state?.goal?.targets?.[0]).trim();
    if (!/^https?:\/\//i.test(raw)) return '';
    try { return new URL(raw).origin; } catch { return raw.replace(/\/$/, ''); }
  })();
  const add = (raw) => {
    let value = text(raw).trim();
    if (!/^https?:\/\//i.test(value)) {
      // Workers often record "METHOD /path" or bare "/path" instead of a full
      // URL. Rebuild it against the engagement target so the fingerprint is
      // still usable for "do not curl this again" checks.
      const pathPart = value.match(/(?:^|\s)(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)?\s*(\/[A-Za-z0-9._~%!$&'*+,;=:@/{}[\]-]*)/i)?.[1];
      if (!pathPart || !base) return;
      value = `${base}${pathPart}`;
    }
    // Ignore query values (tokens, timestamps) so a replay with fresh query
    // params is still recognised as the same endpoint.
    const clean = value.replace(/[),.;]+$/, '');
    let key = clean;
    try {
      const parsed = new URL(clean);
      key = `${parsed.host}${parsed.pathname}`;
    } catch {
      key = clean.split('?')[0];
    }
    if (!urls.has(key)) urls.set(key, clean);
  };
  const scan = (value) => {
    for (const match of text(value).matchAll(/https?:\/\/[^\s"'<>)]+/gi)) add(match[0]);
    if (!/https?:\/\//i.test(text(value))) add(text(value));
  };
  for (const item of state?.evidence || []) {
    scan(item?.summary);
    scan(item?.path);
  }
  for (const task of state?.tasks || []) {
    scan(task?.result?.conclusion);
    scan(task?.error);
  }
  for (const fact of state?.facts || []) scan(fact?.answer);
  for (const asset of state?.assets || []) {
    if (asset?.type === 'endpoint') scan(asset?.value);
  }
  return [...urls.values()].sort().slice(0, MAX_URLS);
}

function confirmedFacts(state, direction) {
  const seeds = tokens(`${direction?.question || ''} ${direction?.doneWhen || ''}`);
  return (state?.facts || [])
    .filter((fact) => fact?.answer && fact?.deleted !== true)
    .map((fact) => ({
      fact,
      score: (fact.confidence === 'observed' ? 3 : 0)
        + (fact.directionId === direction?.id ? 2 : 0)
        + relevance(fact.answer, seeds)
    }))
    .sort((a, b) => b.score - a.score || b.fact.createdAt - a.fact.createdAt)
    .slice(0, MAX_FACTS)
    .map(({ fact }) => `- [${line(fact.confidence || 'unknown', 12)}] ${line(fact.answer)}`);
}

function relatedAssets(state, direction) {
  const seeds = tokens(`${direction?.question || ''} ${direction?.doneWhen || ''}`);
  const rows = (state?.assets || [])
    .filter((asset) => asset && asset.value && asset.deleted !== true)
    .map((asset) => ({
      asset,
      score: (/endpoint|param|api|interface/i.test(`${asset.type} ${asset.meta}`) ? 2 : 0)
        + relevance(`${asset.type} ${asset.value} ${asset.meta}`, seeds)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ASSETS)
    .map(({ asset }) => `- [${line(asset.type, 24)}] ${line(asset.value, 140)}${asset.meta ? ` — ${line(asset.meta, 80)}` : ''}`);
  return rows;
}

function upstreamConclusions(state, direction) {
  const rows = [];
  for (const item of state?.directions || []) {
    if (!item?.conclusion?.answer || item.id === direction?.id) continue;
    rows.push(`- ${line(item.conclusion.answer)}${item.question ? ` （源于：${line(item.question, 80)}）` : ''}`);
  }
  return rows.slice(-MAX_CONCLUSIONS);
}

function siblingTraces(state, direction) {
  const tasks = (state?.tasks || [])
    .filter((task) => task?.directionId === direction?.id)
    .filter((task) => task?.result?.conclusion || task?.error)
    .sort((a, b) => (b.completedAt || b.updatedAt || 0) - (a.completedAt || a.updatedAt || 0))
    .slice(0, MAX_SIBLINGS)
    .map((task) => `- ${line(task.result?.conclusion || task.error || '')}${task.state ? ` [${line(task.state, 16)}]` : ''}`);
  return tasks;
}

/**
 * Build the bounded situational block for one worker prompt.
 * Returns '' when there is nothing useful, so first-dispatch prompts stay lean.
 */
export function buildSituationalPack(state, direction) {
  if (!state || !direction) return '';
  const sections = [];
  const facts = confirmedFacts(state, direction);
  const assets = relatedAssets(state, direction);
  const conclusions = upstreamConclusions(state, direction);
  const siblings = siblingTraces(state, direction);
  const urls = extractTestedUrls(state);

  if (facts.length) sections.push(`【已确认事实（最多 ${MAX_FACTS} 条，优先 observed）】\n${facts.join('\n')}`);
  if (assets.length) sections.push(`【相关接口/参数资产】\n${assets.join('\n')}`);
  if (conclusions.length) sections.push(`【上游方向结论（用于串链式漏洞）】\n${conclusions.join('\n')}`);
  if (siblings.length) sections.push(`【本方向既往 worker 轨迹】\n${siblings.join('\n')}`);
  if (urls.length) {
    sections.push(`【已测 URL 指纹（按 host+path 去重）】\n${urls.slice(0, MAX_URLS).map((url) => `- ${line(url, 160)}`).join('\n')}`);
  }
  if (sections.length === 0) return '';
  return [
    '',
    '=== 全局态势（只读；由已提交状态生成，不要重复验证这些事实） ===',
    ...sections,
    urls.length
      ? '重复探测纪律：不要对上面「已测 URL 指纹」里的 host+path 再发完全相同的请求；如需复查，必须改变方法、参数、身份或头部，并在结论里说明差异。优先沿着「上游结论」和「已确认事实」构造下一跳链式验证。'
      : '优先沿着「上游结论」和「已确认事实」构造下一跳链式验证。',
    '=== 态势结束 ===',
    ''
  ].join('\n');
}
