import {Link} from './types'

export function bold(text: string): string {
  return `*${text}*`
}

export function emoji(name: string): string {
  return `:${name}:`
}

/**
 * @see https://api.slack.com/reference/surfaces/formatting#linking-urls
 */
export function link({text, url}: Link): string {
  return `<${url}|${text}>`
}
