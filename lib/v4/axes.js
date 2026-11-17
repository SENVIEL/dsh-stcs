/**
 * v4 探索轴（exploration axes）。
 *
 * 轴是覆盖检查表，不是互斥的类型枚举：一条方向可以同时属于多条轴。
 * 意图 = 一个尚未回答的问题 + 可判定的完成条件（doneWhen），
 * 而不是"验证某个已知事实"。
 */
export const AXES = [
  'surface',
  'identity',
  'config',
  'component',
  'input',
  'logic',
  'chain',
  'credential',
  'infra',
  'evidence',
  'cleanup',
  'deliver'
];

export const AXIS_LABELS = {
  surface: '攻击面发现',
  identity: '身份与会话',
  config: '配置与泄露',
  component: '组件与版本',
  input: '输入面',
  logic: '业务逻辑',
  chain: '利用链',
  credential: '凭据',
  infra: '基础设施',
  evidence: '证据工程',
  cleanup: '清理',
  deliver: '交付'
};

const RULES = [
  ['surface', /(入口|端点|接口|路径|目录|枚举|测绘|指纹|子域|资产|bundle|sourcemap|api|spa|爬虫|目录扫描)/i],
  ['identity', /(认证|登录|会话|token|jwt|cookie|session|oauth|sso|单点|身份|鉴权|授权码|扫码|短信|验证码)/i],
  ['config', /(配置|源码|泄露|debug|\.env|备份|依赖|composer|web\.config|错误页|目录遍历|源码泄露)/i],
  ['component', /(组件|版本|cve|框架|中间件|thinkphp|spring|shiro|log4j|fastjson|ruoyi|若依|struts|weblogic|tomcat|nginx|apache)/i],
  ['input', /(注入|sql|xss|csrf|ssrf|xxe|上传|反序列化|模板|ssti|命令执行|rce|文件包含|lfi|rfi|参数污染|表达式)/i],
  ['logic', /(越权|业务|金额|支付|订单|状态机|并发|竞争|重放|水平|垂直|权限|租户|多角色|idor)/i],
  ['chain', /(利用链|链条|组合|提权|横向|写文件|getshell|回显|原语|落地|rce 链)/i],
  ['credential', /(口令|密码|凭据|爆破|字典|哈希|弱口令|撞库|喷洒|credential|password)/i],
  ['infra', /(端口|服务|redis|mysql|ssh|mssql|ftp|容器|宝塔|内网|非 ?http|中间件|集群|控制面|opensearch|elasticsearch)/i],
  ['evidence', /(复现|验证|证据|对照|基线|差异|最小化|reproduce)/i],
  ['cleanup', /(清理|删除测试|恢复|回滚|close|收尾)/i],
  ['deliver', /(报告|覆盖|交付|整改|汇总|复盘)/i]
];

/** 关键词 → 轴。返回去重后的轴数组；没有命中时退回 surface。 */
export function inferAxes(input) {
  const text = String(input || '');
  const hit = [];
  for (const [axis, re] of RULES) {
    if (re.test(text)) hit.push(axis);
  }
  if (hit.length === 0) return ['surface'];
  // 单条方向最多标记 3 条轴，避免"每条都全选"。
  return hit.slice(0, 3);
}

export function normalizeAxes(value) {
  const list = Array.isArray(value) ? value : (value ? [value] : []);
  const out = [];
  for (const item of list) {
    const axis = String(item || '').trim();
    if (AXES.includes(axis) && !out.includes(axis)) out.push(axis);
  }
  return out;
}

/**
 * A coverage row is complete only when it records a tested outcome backed by
 * evidence. `blocked`/`not_tested` and auto-generated rows with no evidence
 * describe an unfinished test, not a covered axis.
 */
export function coverageIsComplete(item) {
  if (!item || !['no_issue_found', 'issue_found'].includes(item.result)) return false;
  return Array.isArray(item.evidenceIds) && item.evidenceIds.some(Boolean);
}
