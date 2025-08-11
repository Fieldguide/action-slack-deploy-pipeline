/**
 * Replace special control characters in the specified `text`.
 *
 * @see https://docs.slack.dev/messaging/formatting-message-text#escaping
 */
export function escapeText(text: string): string {
  return text.replace(
    CONTROL_CHARACTER_REGEX,
    match =>
      CONTROL_CHARACTER_HTML_ENTITY_MAP[
        match as keyof typeof CONTROL_CHARACTER_HTML_ENTITY_MAP
      ]
  )
}

const CONTROL_CHARACTER_HTML_ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
} as const satisfies Record<string, string>

const CONTROL_CHARACTER_REGEX = new RegExp(
  `[${Object.keys(CONTROL_CHARACTER_HTML_ENTITY_MAP).join('')}]`,
  'g'
)
