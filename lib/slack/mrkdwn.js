'use strict'
Object.defineProperty(exports, '__esModule', {value: true})
exports.link = exports.emoji = exports.bold = void 0
function bold(text) {
  return `*${text}*`
}
exports.bold = bold
function emoji(name) {
  return `:${name}:`
}
exports.emoji = emoji
/**
 * @see https://api.slack.com/reference/surfaces/formatting#linking-urls
 */
function link({text, url}) {
  return `<${url}|${text}>`
}
exports.link = link
