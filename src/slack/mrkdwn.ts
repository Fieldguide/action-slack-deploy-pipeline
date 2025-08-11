import {Link} from './types'
import {escapeText} from './utils/escapeText'

/**
 * Bold and escape the specified `text`.
 *
 * @see https://api.slack.com/reference/surfaces/formatting#visual-styles
 */
export function bold(text: string): string {
  return `*${escapeText(text)}*`
}

/**
 * Return an emoji with the specified `name`.
 *
 * @see https://api.slack.com/reference/surfaces/formatting#emoji
 */
export function emoji(name: string): string {
  return `:${name}:`
}

/**
 * Return a link with the specified `text` and `url`.
 *
 * The `text` is escaped.
 *
 * @see https://api.slack.com/reference/surfaces/formatting#linking-urls
 */
export function link({text, url}: Link): string {
  return `<${url}|${escapeText(text)}>`
}
