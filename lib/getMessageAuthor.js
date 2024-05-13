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
exports.getMessageAuthor = void 0
const core_1 = require('@actions/core')
const github_1 = require('@actions/github')
const webhook_1 = require('./github/webhook')
const input_1 = require('./input')
function getMessageAuthor(octokit, slack) {
  return __awaiter(this, void 0, void 0, function* () {
    ;(0, core_1.startGroup)('Getting message author')
    try {
      ;(0, core_1.info)('Fetching Slack users')
      const slackUsers = yield slack.getRealUsers()
      if (!slackUsers) {
        throw new Error(
          `${input_1.EnvironmentVariable.SlackBotToken} does not include "users:read" OAuth scope.`
        )
      }
      const githubUser = yield getGitHubUser(octokit)
      ;(0, core_1.info)(`Finding Slack user by name: ${githubUser.name}`)
      const matchingSlackUsers = slackUsers.filter(user => {
        var _a
        return Boolean(
          ((_a = user.profile) === null || _a === void 0
            ? void 0
            : _a.real_name) === githubUser.name &&
            user.profile.display_name &&
            user.profile.image_48
        )
      })
      const matchingSlackUser = matchingSlackUsers[0]
      if (!matchingSlackUser) {
        throw new Error(
          `Unable to match GitHub user "${githubUser.name}" to Slack user by name.`
        )
      }
      if (matchingSlackUsers.length > 1) {
        throw new Error(
          `${matchingSlackUsers.length} Slack users match GitHub user name "${githubUser.name}".`
        )
      }
      return {
        slack_user_id: matchingSlackUser.id,
        username: matchingSlackUser.profile.display_name,
        icon_url: matchingSlackUser.profile.image_48
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      ;(0, core_1.warning)(
        `${message} The message author will fallback to a GitHub username.`
      )
      if ((0, core_1.isDebug)() && err instanceof Error && err.stack) {
        ;(0, core_1.warning)(err.stack)
      }
      return authorFromGitHubContext()
    } finally {
      ;(0, core_1.endGroup)()
    }
  })
}
exports.getMessageAuthor = getMessageAuthor
function getGitHubUser(octokit) {
  return __awaiter(this, void 0, void 0, function* () {
    const sender = (0, webhook_1.senderFromPayload)(github_1.context.payload)
    if (!sender) {
      throw new Error('Unexpected GitHub sender payload.')
    }
    ;(0, core_1.info)(`Fetching GitHub user: ${sender.login}`)
    const {data} = yield octokit.rest.users.getByUsername({
      username: sender.login
    })
    return data
  })
}
function authorFromGitHubContext() {
  const sender = (0, webhook_1.senderFromPayload)(github_1.context.payload)
  if (!sender) {
    return null
  }
  return {
    username: sender.login,
    icon_url: sender.avatar_url
  }
}
