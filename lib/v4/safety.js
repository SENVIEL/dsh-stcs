/**
 * Red-line classification for verification actions.
 *
 * The ONLY user-defined red line: 严禁测试删除和篡改原有数据的接口
 * (do not test interfaces that DELETE or TAMPER with EXISTING data).
 *
 * Everything else is in scope. In particular, prose that merely mentions
 * words like "覆盖"/"重启"/"崩溃"/"DoS"/"持久化", or a negative statement
 * such as "本测试不删除原有数据", must NOT trigger an approval gate. Only an
 * explicit destructive API action on existing data does.
 */
const DESTRUCTIVE_API = /\b(?:DELETE|PUT|PATCH|POST)\s+\/[^\s"']*\/(?:delete|remove|del|drop|truncate|erase|wipe|update|modify|alter|overwrite)\b/i;
// A DELETE against a concrete resource path deletes existing data.
const DELETE_RESOURCE = /\bDELETE\s+\/[^\s"']*\/\d+\b|\bDELETE\s+\/[^\s"']*\?[^\s"']*(?:id|key)=/i;
const CN_DESTRUCTIVE = /(?:删除|清空|篡改|修改|覆盖)(?:原有|现有|生产|业务)[^。；\n]{0,12}(?:数据|记录|文件|表|配置|资源|用户|接口)/;

// A negated safety sentence ("不删除原有数据" / "严禁篡改原有记录") is a
// policy statement, not a proposed destructive action. Keep the negation
// tight so phrases like "未授权删除原有数据" still count as a real red line.
const NEGATED = /(?:不|禁止|严禁|不得|不会|没有)\s{0,2}(?:删除|清空|篡改|修改|覆盖)(?:原有|现有|生产|业务)/;

export function redLineReason(value) {
  const text = String(value || '');
  // Strip negated safety sentences before matching.
  const candidates = text.split(/[。；\n]/).filter((part) => !NEGATED.test(part));
  const scan = candidates.join(' ');
  const match = scan.match(DESTRUCTIVE_API) || scan.match(DELETE_RESOURCE) || scan.match(CN_DESTRUCTIVE);
  return match ? `red-line action detected: ${match[0]}` : '';
}
