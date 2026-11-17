/**
 * STCS tool guard: enforce the run policy at the tool layer.
 *
 * Root session is a read-only human interface except user-owned setup/control
 * actions. Workers/role teammates may never write the canonical v4 graph.
 * This is intentionally separate from prompts: a model cannot talk its way
 * past a guard.
 */
import { isHumanGoalCommand } from '../v4/policy.js';
import { text } from './util.js';

export const ROOT_ALLOWED_TOOLS = new Set([
  'pentest_flow_start',
  'pentest_flow_status',
  'pentest_flow_authorize',
  'pentest_pause_all',
  'pentest_resume_all',
  'pentest_stop_goal',
  'pentest_flow_prove',
  'pentest_flow_delivery',
  'pentest_flow_report',
  'pentest_flow_evidence'
]);

export const WORKER_ALLOWED_TOOLS = new Set([
  'pentest_traffic_search',
  'pentest_traffic_record',
  'pentest_traffic_stats',
  'pentest_trace_add',
  'pentest_trace_search',
  'pentest_trace_get',
  'pentest_trace_stats',
  'pentest_asset_search',
  'pentest_asset_links',
  'pentest_asset_stats'
]);

function latestUserText(agent) {
  try {
    const session = agent?.session;
    if (!session || typeof session.snapshotEvents !== 'function') return '';
    const events = session.snapshotEvents() || [];
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i];
      if (!event || event.type !== 'user/message') continue;
      const data = event.data || {};
      if ((data.source || {}).kind !== 'user') continue;
      return (Array.isArray(data.content) ? data.content : [])
        .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
        .join('\n')
        .trim();
    }
  } catch { /* guard must never crash a turn */ }
  return '';
}

export function userAskedForReport(value) {
  return /(?:生成|出|写|产|做).{0,8}报告|report\s+(?:the\s+)?(?:engagement|findings|result)/i.test(text(value));
}

export function userAskedToCompleteGoal(value) {
  return isHumanGoalCommand(value, 'complete')
    || /(?:目标|任务).{0,6}(?:完成|结束|收工)|(?:完成|结束).{0,4}(?:目标|任务)/i.test(text(value));
}

export function userAskedToResume(value) {
  return /(?:恢复|继续|接着).{0,8}(?:目标|测试|任务|扫描)|resume\s+(?:the\s+)?(?:goal|test|scan)/i.test(text(value));
}

function isRootAgent(agent, membership) {
  if (membership) return membership.role === 'lead';
  return !text(agent?.session?.header?.parentSession);
}

function headerPresetOf(agent) {
  return text(agent?.session?.header?.agentPreset);
}

function argumentObject(exec) {
  const value = exec?.arguments;
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { /* not JSON */ }
  }
  return {};
}

export const ROOT_DENIED_TOOLS = new Set([
  'pwsh', 'bash', 'browser', 'browser_instances', 'web_fetch', 'web_search',
  'terminal_open', 'terminal_send', 'terminal_read', 'terminal_signal', 'terminal_close', 'terminal_list',
  'rw_connect', 'rw_disconnect', 'rw_exec', 'rw_upload', 'rw_download', 'rw_sync', 'rw_push',
  'rw_write_file', 'rw_edit', 'rw_remove', 'rw_move', 'rw_mkdir', 'rw_pick_workspace', 'rw_info',
  'rw_list_dir', 'rw_read_file', 'rw_search', 'rw_stat', 'rw_append', 'rw_forward',
  'spawn_teammate', 'send_message', 'interrupt_agent', 'wait_agent',
  'subagent', 'subagent_fork', 'subagent_codex', 'subagent_claude_code',
  'team_task_create', 'team_task_update',
  'ralph', 'workflow', 'job_kill', 'job_output', 'job_list',
  'read_image', 'sidebar_open', 'load_workspace_dependencies',
  'glob', 'grep', 'write', 'edit', 'working_directory', 'stcs_probe',
  'session_event_read', 'session_event_search', 'session_trace', 'session_search',
  'pentest_flow_directions', 'pentest_flow_direction', 'pentest_flow_plan', 'pentest_flow_autoplan',
  'pentest_flow_dispatch', 'pentest_flow_candidate', 'pentest_flow_close', 'pentest_flow_cancel',
  'pentest_flow_role', 'pentest_flow_wait', 'pentest_runtime_probe', 'pentest_state',
  'pentest_add_fact', 'pentest_add_finding', 'pentest_flow_audit', 'pentest_evidence_audit',
  'pentest_flow_reconcile', 'pentest_queue_reconcile', 'pentest_flow_goal'
]);

/**
 * The visible planner is a read-only role: it may read the digest and write
 * its structured result file, but it must never probe the target or message
 * the Lead (that used to wake the root and turn the Lead into a planner).
 */
export const PLANNER_DENIED_TOOLS = new Set([
  'pwsh', 'bash', 'browser', 'browser_instances', 'web_fetch', 'web_search',
  'terminal_open', 'terminal_send', 'terminal_read', 'terminal_signal', 'terminal_close', 'terminal_list',
  'rw_connect', 'rw_disconnect', 'rw_exec', 'rw_upload', 'rw_download', 'rw_sync', 'rw_push',
  'rw_write_file', 'rw_edit', 'rw_remove', 'rw_move', 'rw_mkdir', 'rw_pick_workspace', 'rw_info',
  'rw_list_dir', 'rw_read_file', 'rw_search', 'rw_stat', 'rw_append', 'rw_forward',
  'spawn_teammate', 'send_message', 'interrupt_agent', 'wait_agent',
  'subagent', 'subagent_fork', 'subagent_codex', 'subagent_claude_code',
  'team_task_create', 'team_task_update',
  'ralph', 'workflow', 'job_kill', 'job_output', 'job_list',
  'read_image', 'sidebar_open', 'load_workspace_dependencies',
  'present', 'ask_user_question', 'glob', 'grep'
]);

function isPlannerAgent(agent, membership) {
  const role = text(membership?.role || membership?.memberRole);
  const name = text(membership?.name || membership?.memberName || agent?.name
    || agent?.session?.header?.teamMemberName || agent?.session?.header?.name);
  if (role === 'planner' || /planner|规划员/i.test(name)) return true;
  // An explicit membership is authoritative; only the legacy/missing-membership
  // path falls back to the planner preset marker.
  if (membership) return false;
  const header = agent?.session?.header || {};
  return text(header.parentSession) !== '' && text(header.agentPreset) === 'artex';
}

/**
 * @param {object} options
 * @param {(agent: object) => {role?: string}|undefined} [options.getMembership]
 * @param {(agent: object) => string|undefined} [options.getPreset] committed
 *   preset from the `agentPreset` session projection; the header keeps the
 *   creation-time value and must only be a fallback.
 */
export function createStcsToolGuard({ getMembership, getPreset } = {}) {
  const presetOf = (agent) => {
    if (typeof getPreset === 'function') {
      try {
        const selected = getPreset(agent);
        if (selected) return text(selected);
      } catch { /* guard must never crash a turn */ }
    }
    return headerPresetOf(agent);
  };

  return function stcsToolGuard(exec) {
    const name = text(exec?.name);
    const agent = exec?.agent;
    if (presetOf(agent) !== 'artex') return undefined;

    let membership;
    if (typeof getMembership === 'function') {
      try { membership = getMembership(agent); } catch { membership = undefined; }
    }
    const root = isRootAgent(agent, membership);
    const planner = !root && isPlannerAgent(agent, membership);

    // The planner may only read the digest and write its result file. Hiding
    // the probing tools here is deliberate: prompts alone were ignored and the
    // planner executed live RCE probes for six consecutive rounds.
    if (planner && name.startsWith('pentest_')) {
      return `STCS 规划员只读：${name} 属于 Coordinator/worker 接口，规划员不能写图、派工或提交发现。只输出方向 JSON。`;
    }
    if (planner && PLANNER_DENIED_TOOLS.has(name)) {
      return `STCS 规划员只读：${name} 不可用。规划员只读 digest + 写结果文件；不得实测目标、不得给 lead 发消息。`;
    }
    if (planner) {
      if (['read', 'glob', 'grep', 'write'].includes(name)) {
        const args = argumentObject(exec);
        const value = text(args.file_path || args.path || '');
        const ownerId = text(agent?.session?.header?.parentSession || agent?.id);
        const short = ownerId.replace(/^session-/, '').split('-')[0].slice(0, 8).toLowerCase();
        if (/^[a-z]:[\\/]/i.test(value) && short && !value.toLowerCase().includes(short)) {
          return 'STCS 规划员只读：不能读取或写入其他会话的 workdir；只能用当前会话 workdir 内的相对路径。';
        }
        if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(value)) {
          return 'STCS 规划员只读：不允许使用 .. 跳出当前 workdir。';
        }
      }
      return undefined;
    }

    // The root session is a read-only human interface: it never probes the
    // target itself, even though the Host tool set is shared with workers.
    if (!name.startsWith('pentest_')) {
      if (root && ROOT_DENIED_TOOLS.has(name)) {
        return `STCS 主会话只读：${name} 是实测工具，只能由 Coordinator 派生的 worker 使用。主会话用 artex_status 看结果；需要实测请在会话里说明目标，由 Coordinator 派工。`;
      }
      if (root && name === 'present') {
        const short = text(agent?.id).replace(/^session-/, '').split('-')[0].slice(0, 8).toLowerCase();
        const args = argumentObject(exec);
        const files = Array.isArray(args.files) ? args.files : [];
        const outside = files.find((file) => short && !text(file?.path).toLowerCase().includes(short));
        if (outside) {
          return `STCS：交付文件必须属于当前会话 workdir（${short}）；${text(outside.path)} 看起来是另一个会话的产物，不能作为本会话交付。`;
        }
      }
      if (root && ['read', 'glob', 'grep'].includes(name)) {
        const short = text(agent?.id).replace(/^session-/, '').split('-')[0].slice(0, 8).toLowerCase();
        const args = argumentObject(exec);
        const value = text(args.file_path || args.path || '');
        if (/^[a-z]:[\\/]/i.test(value) && short && !value.toLowerCase().includes(short)) {
          return 'STCS 主会话只读：不能读取其他会话的 workdir；看结果请用 artex_status。';
        }
        if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(value)) {
          return 'STCS 主会话只读：不允许使用 .. 跳出当前 workdir。';
        }
      }
      return undefined;
    }

    if (root) {
      if (name === 'pentest_add_goal' || name === 'pentest_add_intent' || name === 'pentest_dispatch') {
        return 'STCS 主会话不走 v3：目标只用 pentest_flow_start 建立。若 v4 报 "domain already open"/临时错误，等 1-2 秒重试 pentest_flow_start，绝不退回 pentest_add_goal。';
      }
      if (!ROOT_ALLOWED_TOOLS.has(name)) {
        return `STCS 主会话只读：${name} 由 Host Coordinator 负责，主会话不能生成方向、派工或写图。请看 artex_status。`;
      }
      const args = argumentObject(exec);
      if (name === 'present') {
        const short = text(agent?.id).replace(/^session-/, '').split('-')[0].slice(0, 8).toLowerCase();
        const files = Array.isArray(args.files) ? args.files : [];
        const outside = files.find((file) => short && !text(file?.path).toLowerCase().includes(short));
        if (outside) {
          return `STCS：交付文件必须属于当前会话 workdir（${short}）；${text(outside.path)} 看起来是另一个会话的产物，不能作为本会话交付。`;
        }
      }
      if (name === 'pentest_flow_report') {
        const short = text(agent?.id).replace(/^session-/, '').split('-')[0].slice(0, 8).toLowerCase();
        const reportPath = text(args.reportPath || args.path);
        if (reportPath && short && !reportPath.toLowerCase().includes(short)) {
          return `STCS：报告路径必须属于当前会话 workdir（${short}），不能引用其他会话的报告。`;
        }
      }
      if (name === 'pentest_pause_all' && !isHumanGoalCommand(latestUserText(agent), 'pause')) {
        return 'STCS：只有用户明确说「暂停/挂起目标」时才允许暂停。';
      }
      if (name === 'pentest_resume_all' && !userAskedToResume(latestUserText(agent))) {
        return 'STCS：只有用户明确说「恢复/继续目标」时才允许恢复。';
      }
      if (name === 'pentest_stop_goal' && !isHumanGoalCommand(latestUserText(agent), 'complete')) {
        return 'STCS：只有用户明确说「结束/终止目标」时才允许停止。';
      }
      if (name === 'pentest_flow_report' && !userAskedForReport(latestUserText(agent))) {
        return 'STCS：只有用户明确说「生成报告/出报告」时才允许调用 pentest_flow_report。';
      }
      if (name === 'pentest_flow_prove' && !userAskedToCompleteGoal(latestUserText(agent))) {
        return 'STCS：只有用户明确说「完成目标/结束目标/收工」时才允许证明目标。';
      }
      if (name === 'pentest_flow_delivery' && args.review === true) {
        return 'STCS：主会话只允许只读交付检查（review=false）；reviewer 角色由 Coordinator 按需启动。';
      }
      if (name === 'pentest_flow_evidence' && args.op !== 'verify') {
        return 'STCS：主会话只允许 pentest_flow_evidence(op=verify)；导出由用户明确要求时再做。';
      }
      return undefined;
    }

    if (WORKER_ALLOWED_TOOLS.has(name)) return undefined;
    return `STCS worker/role 不得写图：${name} 属于 Coordinator/主会话入口。只提交证据文件和结构化结果。`;
  };
}
