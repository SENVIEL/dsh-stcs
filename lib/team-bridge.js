/**
 * Team → pentest graph bridge.
 *
 * The Lead model is not guaranteed to call `pentest_add_fact` after a teammate
 * finishes. DSH delivers a teammate message into the Lead inbox as an
 * `agent/inbox/spliced` event whose text starts with one of:
 *
 *   Agent <child-id> sent a message: ...
 *   Team message from <name>: ...
 *
 * Extract those texts so the plugin can persist them as facts without relying
 * on the model to remember a second tool call.
 */

const RELAY_PREFIX = /^(?:Agent\s+([0-9a-fA-F-]{8,})\s+sent a message:|Team message from\s+([^:\n]+):)\s*([\s\S]*)$/;

export function extractRelayedMessages(inserted) {
  if (!Array.isArray(inserted)) return [];
  const messages = [];
  for (const item of inserted) {
    if (!item || !Array.isArray(item.content)) continue;
    const text = item.content
      .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n')
      .trim();
    if (text === '') continue;
    const match = text.match(RELAY_PREFIX);
    if (!match) continue;
    const author = String(match[1] || match[2] || 'teammate').trim();
    const detail = String(match[3] || '').trim();
    if (detail === '') continue;
    messages.push({ author, detail });
  }
  return messages;
}
