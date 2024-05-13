'use strict'
Object.defineProperty(exports, '__esModule', {value: true})
exports.emojiFromStatus = exports.createMessage = void 0
const mrkdwn_1 = require('../slack/mrkdwn')
const types_1 = require('./types')
function createMessage({text, contextBlock, author}) {
  return {
    icon_url: author === null || author === void 0 ? void 0 : author.icon_url,
    username: (author === null || author === void 0 ? void 0 : author.username)
      ? `${author.username} (via GitHub)`
      : undefined,
    unfurl_links: false,
    text: text.plain,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: text.mrkdwn
        }
      },
      contextBlock
    ]
  }
}
exports.createMessage = createMessage
function emojiFromStatus(status) {
  switch (status) {
    case types_1.JobStatus.Success:
      return (0, mrkdwn_1.emoji)('white_check_mark')
    case types_1.JobStatus.Failure:
      return (0, mrkdwn_1.emoji)('x')
    case types_1.JobStatus.Cancelled:
      return (0, mrkdwn_1.emoji)('no_entry_sign')
    default:
      throw new Error(`Unexpected status ${status}`)
  }
}
exports.emojiFromStatus = emojiFromStatus
