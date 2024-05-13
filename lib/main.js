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
const core_1 = require('@actions/core')
const github_1 = require('@actions/github')
const getMessageAuthor_1 = require('./getMessageAuthor')
const input_1 = require('./input')
const postMessage_1 = require('./postMessage')
const SlackClient_1 = require('./slack/SlackClient')
function run() {
  return __awaiter(this, void 0, void 0, function* () {
    try {
      const octokit = createOctokitClient()
      const slack = createSlackClient()
      const author = yield (0, getMessageAuthor_1.getMessageAuthor)(
        octokit,
        slack
      )
      const ts = yield (0, postMessage_1.postMessage)({octokit, slack, author})
      if (ts) {
        ;(0, core_1.setOutput)('ts', ts)
      }
    } catch (err) {
      ;(0, core_1.setFailed)(err instanceof Error ? err : String(err))
      if ((0, core_1.isDebug)() && err instanceof Error && err.stack) {
        ;(0, core_1.error)(err.stack)
      }
    }
  })
}
function createSlackClient() {
  const token = (0, input_1.getEnv)(input_1.EnvironmentVariable.SlackBotToken)
  const channel = (0, input_1.getEnv)(input_1.EnvironmentVariable.SlackChannel)
  return new SlackClient_1.SlackClient({token, channel})
}
function createOctokitClient() {
  const token = (0, core_1.getInput)('github_token', {required: true})
  return (0, github_1.getOctokit)(token)
}
run()
