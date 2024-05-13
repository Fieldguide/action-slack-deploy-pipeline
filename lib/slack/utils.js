'use strict'
Object.defineProperty(exports, '__esModule', {value: true})
exports.dateFromTs = void 0
/**
 * Convert the Slack message timestamp ID to a Date object.
 */
function dateFromTs(ts) {
  return new Date(1000 * Number(ts))
}
exports.dateFromTs = dateFromTs
