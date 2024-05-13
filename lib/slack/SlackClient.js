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
exports.SlackClient = void 0
const core_1 = require('@actions/core')
const web_api_1 = require('@slack/web-api')
const errors_1 = require('./errors')
class SlackClient {
  constructor({token, channel}) {
    this.channel = channel
    this.web = new web_api_1.WebClient(token, {
      logLevel: (0, core_1.isDebug)()
        ? web_api_1.LogLevel.DEBUG
        : web_api_1.LogLevel.INFO
    })
    this.logRateLimits()
  }
  /**
   * Return the set of non-bot users.
   *
   * @returns `null` if the bot token is missing the required OAuth scope
   */
  getRealUsers() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const {members} = yield this.web.users.list()
        if (!members) {
          throw new Error('Error fetching users')
        }
        return members.filter(({id, is_bot}) => {
          return (
            'USLACKBOT' !== id && // USLACKBOT is a special user ID for @SlackBot
            !is_bot
          )
        })
      } catch (error) {
        if ((0, errors_1.isMissingScopeError)(error)) {
          return null
        }
        throw error
      }
    })
  }
  /**
   * @returns message timestamp ID
   */
  postMessage(options) {
    return __awaiter(this, void 0, void 0, function* () {
      const {ts} = yield this.web.chat.postMessage(
        Object.assign(Object.assign({}, options), {channel: this.channel})
      )
      if (!ts) {
        throw new Error('Response timestamp ID undefined')
      }
      return ts
    })
  }
  updateMessage(options) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.web.chat.update(
        Object.assign(Object.assign({}, options), {channel: this.channel})
      )
    })
  }
  /**
   * @see https://slack.dev/node-slack-sdk/web-api#rate-limits
   */
  logRateLimits() {
    this.web.on(web_api_1.WebClientEvent.RATE_LIMITED, numSeconds => {
      ;(0, core_1.warning)(
        `Slack API call failed due to rate limiting. Retrying in ${numSeconds} seconds.`
      )
    })
  }
}
exports.SlackClient = SlackClient
