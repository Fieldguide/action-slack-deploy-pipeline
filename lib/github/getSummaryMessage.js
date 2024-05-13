'use strict'
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        var desc = Object.getOwnPropertyDescriptor(m, k)
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k]
            }
          }
        }
        Object.defineProperty(o, k2, desc)
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        o[k2] = m[k]
      })
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', {enumerable: true, value: v})
      }
    : function (o, v) {
        o['default'] = v
      })
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod
    var result = {}
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k)
    __setModuleDefault(result, mod)
    return result
  }
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
exports.getSummaryMessage = void 0
const github = __importStar(require('@actions/github'))
const date_fns_1 = require('date-fns')
const mrkdwn_1 = require('../slack/mrkdwn')
const utils_1 = require('../slack/utils')
const getContextBlock_1 = require('./getContextBlock')
const message_1 = require('./message')
const types_1 = require('./types')
const webhook_1 = require('./webhook')
/**
 * Return the initial summary message.
 */
function getSummaryMessage({octokit, options, author}) {
  var _a
  return __awaiter(this, void 0, void 0, function* () {
    const text = yield getText(
      octokit,
      (_a =
        options === null || options === void 0 ? void 0 : options.status) !==
        null && _a !== void 0
        ? _a
        : null,
      author
    )
    const duration = options
      ? (0, date_fns_1.intervalToDuration)({
          start: (0, utils_1.dateFromTs)(options.threadTs),
          end: options.now
        })
      : undefined
    const contextBlock = (0, getContextBlock_1.getContextBlock)(duration)
    return (0, message_1.createMessage)({text, contextBlock, author})
  })
}
exports.getSummaryMessage = getSummaryMessage
function getText(octokit, status, author) {
  return __awaiter(this, void 0, void 0, function* () {
    const summarySentence = getSummarySentence(status, author)
    const eventLink = yield getEventLink(octokit)
    const mrkdwn = [
      status
        ? (0, message_1.emojiFromStatus)(status)
        : (0, mrkdwn_1.emoji)('black_square_button'),
      `${summarySentence.mrkdwn}:`,
      (0, mrkdwn_1.link)(eventLink)
    ].join(' ')
    return {
      plain: `${summarySentence.plain}: ${eventLink.text}`,
      mrkdwn
    }
  })
}
function getSummarySentence(status, author) {
  const subject = {plain: '', mrkdwn: ''}
  let verb = status ? verbFromStatus(status) : 'Deploying'
  if (author === null || author === void 0 ? void 0 : author.slack_user_id) {
    subject.plain = author.username
    subject.mrkdwn = `<@${author.slack_user_id}>`
    verb = status ? ` ${verb.toLowerCase()}` : ` is ${verb.toLowerCase()}`
  }
  const {repo} = github.context.repo
  return {
    plain: `${subject.plain}${verb} ${repo}`,
    mrkdwn: `${subject.mrkdwn}${verb} ${(0, mrkdwn_1.bold)(repo)}`
  }
}
function verbFromStatus(status) {
  switch (status) {
    case types_1.JobStatus.Success:
      return 'Deployed'
    case types_1.JobStatus.Failure:
      return 'Failed deploying'
    case types_1.JobStatus.Cancelled:
      return 'Cancelled deploying'
    default:
      throw new Error(`Unexpected status ${status}`)
  }
}
function getEventLink(octokit) {
  return __awaiter(this, void 0, void 0, function* () {
    const context = github.context
    if ((0, webhook_1.isPullRequestEvent)(context)) {
      const pullRequest = context.payload.pull_request
      return {
        text: getEventLinkText(`${pullRequest.title} (#${pullRequest.number})`),
        url: pullRequest.html_url
      }
    }
    if ((0, webhook_1.isPushEvent)(context)) {
      const commit = context.payload.head_commit
      if (!commit) {
        throw new Error('Unexpected push event payload (undefined head_commit)')
      }
      return {
        text: getEventLinkText(commit.message),
        url: commit.url
      }
    }
    if ((0, webhook_1.isReleaseEvent)(context)) {
      return {
        text: context.payload.release.name,
        url: context.payload.release.html_url
      }
    }
    if (
      (0, webhook_1.isScheduleEvent)(context) ||
      (0, webhook_1.isWorkflowDispatchEvent)(context)
    ) {
      const commit = (yield octokit.rest.repos.getCommit(
        Object.assign(Object.assign({}, context.repo), {ref: context.sha})
      )).data.commit
      return {
        text: getEventLinkText(commit.message),
        url: commit.url
      }
    }
    ;(0, webhook_1.assertUnsupportedEvent)(context)
  })
}
/**
 * Return the first `message` line, i.e. omitting the commit description.
 */
function getEventLinkText(message) {
  return message.split('\n', 1)[0]
}
