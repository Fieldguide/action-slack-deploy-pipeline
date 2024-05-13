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
exports.getStageMessage = void 0
const github_1 = require('@actions/github')
const date_fns_1 = require('date-fns')
const mrkdwn_1 = require('../slack/mrkdwn')
const getContextBlock_1 = require('./getContextBlock')
const message_1 = require('./message')
const types_1 = require('./types')
/**
 * Return a progressed stage message, posted via threaded reply.
 */
function getStageMessage({octokit, status, now, author}) {
  return __awaiter(this, void 0, void 0, function* () {
    const text = getText(status)
    const duration = yield computeDuration(octokit, now)
    const contextBlock = (0, getContextBlock_1.getContextBlock)(duration)
    return Object.assign(
      Object.assign(
        {},
        (0, message_1.createMessage)({text, contextBlock, author})
      ),
      {reply_broadcast: !(0, types_1.isSuccessful)(status)}
    )
  })
}
exports.getStageMessage = getStageMessage
function getText(status) {
  const verb = verbFromStatus(status)
  const predicate = github_1.context.job
  const mrkdwn = [
    (0, message_1.emojiFromStatus)(status),
    verb,
    (0, mrkdwn_1.bold)(predicate)
  ].join(' ')
  return {
    plain: `${verb} ${predicate}`,
    mrkdwn
  }
}
/**
 * Return past tense verb for the specified job `status`.
 */
function verbFromStatus(status) {
  switch (status) {
    case types_1.JobStatus.Success:
      return 'Finished'
    case types_1.JobStatus.Failure:
      return 'Failed'
    case types_1.JobStatus.Cancelled:
      return 'Cancelled'
    default:
      throw new Error(`Unexpected status ${status}`)
  }
}
function computeDuration(octokit, now) {
  var _a, _b
  return __awaiter(this, void 0, void 0, function* () {
    const {data} = yield octokit.rest.actions.listJobsForWorkflowRun(
      Object.assign(Object.assign({}, github_1.context.repo), {
        run_id: github_1.context.runId
      })
    )
    const currentJob = data.jobs.find(({name}) => name === github_1.context.job)
    const slackRegex = /[^A-Za-z]slack[^A-Za-z]/i
    const lastCompletedSlackStep =
      (_a =
        currentJob === null || currentJob === void 0
          ? void 0
          : currentJob.steps) === null || _a === void 0
        ? void 0
        : _a
            .filter(types_1.isCompletedJobStep)
            .filter(({name}) => slackRegex.test(` ${name} `))
            .pop()
    const start =
      (_b =
        lastCompletedSlackStep === null || lastCompletedSlackStep === void 0
          ? void 0
          : lastCompletedSlackStep.completed_at) !== null && _b !== void 0
        ? _b
        : currentJob === null || currentJob === void 0
        ? void 0
        : currentJob.started_at
    if (start) {
      return (0, date_fns_1.intervalToDuration)({
        start: new Date(start),
        end: now
      })
    }
  })
}
