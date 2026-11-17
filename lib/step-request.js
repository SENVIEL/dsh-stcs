/**
 * Normalize the replayable request part of a finding step.
 *
 * Agents have historically submitted either:
 *   "explanation\nGET /path HTTP/1.1 ..."
 *   "explanation\n    POST /path HTTP/1.1 ..."
 * The report and evidence hash must start at the HTTP request line.
 */
export function stripStepPreamble(value) {
  const text = value === undefined || value === null ? '' : String(value)
  const match = /(^|\n)[ \t]*(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS|TRACE|CONNECT)[ \t]+\S+[ \t]+HTTP\/\d/i.exec(text)
  if (match && match.index > 0) return text.slice(match.index + (match[1] ? match[1].length : 0)).trimStart()
  return text
}

export function cleanStepRequest(note, request) {
  let value = request === undefined || request === null ? '' : String(request)
  const n = note === undefined || note === null ? '' : String(note)
  if (n !== '' && value.startsWith(n)) value = value.slice(n.length).replace(/^\s*\n?/, '')
  return stripStepPreamble(value)
}
