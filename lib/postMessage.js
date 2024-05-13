'use strict'
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value)
          })
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value))
        } catch (e) {
          reject(e)
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value))
        } catch (e) {
          reject(e)
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected)
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next())
    })
  }
Object.defineProperty(exports, '__esModule', {value: true})
exports.postMessage = void 0
const core_1 = require('@actions/core')
const getStageMessage_1 = require('./github/getStageMessage')
const getSummaryMessage_1 = require('./github/getSummaryMessage')
const types_1 = require('./github/types')
/**
 * Post an initial summary message or progress reply when `thread_ts` input is set.
 *
 * Conditionally updates initial message when `conclusion` is set or stage is unsuccessful.
 *
 * @returns message timestamp ID
 */
function postMessage({octokit, slack, author}) {
  return __awaiter(this, void 0, void 0, function* () {
    const threadTs = (0, core_1.getInput)('thread_ts')
    if (!threadTs) {
      ;(0, core_1.info)('Posting summary message')
      const message = yield (0, getSummaryMessage_1.getSummaryMessage)({
        octokit,
        author
      })
      return slack.postMessage(message)
    }
    const status = (0, core_1.getInput)('status', {required: true})
    const now = new Date()
    const stageMessage = yield (0, getStageMessage_1.getStageMessage)({
      octokit,
      status,
      now,
      author
    })
    ;(0, core_1.info)(`Posting stage message in thread: ${threadTs}`)
    yield slack.postMessage(
      Object.assign(Object.assign({}, stageMessage), {thread_ts: threadTs})
    )
    const conclusion = 'true' === (0, core_1.getInput)('conclusion')
    if (conclusion || !(0, types_1.isSuccessful)(status)) {
      ;(0, core_1.info)(`Updating summary message: ${status}`)
      const message = yield (0, getSummaryMessage_1.getSummaryMessage)({
        octokit,
        options: {status, threadTs, now},
        author
      })
      yield slack.updateMessage(
        Object.assign(Object.assign({}, message), {ts: threadTs})
      )
    }
    return null
  })
}
exports.postMessage = postMessage
