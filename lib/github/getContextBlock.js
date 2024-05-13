'use strict'
Object.defineProperty(exports, '__esModule', {value: true})
exports.getContextBlock = exports.EVENT_NAME_IMAGE_MAP = void 0
const github_1 = require('@actions/github')
const date_fns_1 = require('date-fns') // eslint-disable-line import/named
const mrkdwn_1 = require('../slack/mrkdwn')
const webhook_1 = require('./webhook')
exports.EVENT_NAME_IMAGE_MAP = {
  pull_request:
    'https://user-images.githubusercontent.com/847532/193414326-5aaf5449-0c81-4a66-9b19-4e5e6baeee9e.png',
  push: 'https://user-images.githubusercontent.com/847532/193413878-d5fcd559-401d-4954-a44c-36de5d6a7adf.png',
  schedule:
    'https://user-images.githubusercontent.com/847532/193414289-3b185a3b-aee8-40f9-99fe-0615d255c8dd.png',
  release:
    'https://user-images.githubusercontent.com/847532/265212273-b8c1036a-26b0-4196-bb11-0cbcb85d57c0.png',
  workflow_dispatch:
    'https://user-images.githubusercontent.com/847532/197601879-3bc8bf73-87c0-4216-8de7-c55d34993ef1.png'
}
function getContextBlock(duration) {
  const textParts = [(0, mrkdwn_1.link)(getWorkflow()), getRef()]
  if (duration) {
    textParts.push((0, date_fns_1.formatDuration)(duration) || '0 seconds')
  }
  return {
    type: 'context',
    elements: [
      Object.assign({type: 'image'}, getImage()),
      {
        type: 'mrkdwn',
        text: textParts.join('  ∙  ')
      }
    ]
  }
}
exports.getContextBlock = getContextBlock
function getImage() {
  if (!(0, webhook_1.isSupportedEvent)(github_1.context)) {
    throw new webhook_1.UnsupportedEventError(github_1.context)
  }
  return {
    alt_text: `${github_1.context.eventName} event`,
    image_url: exports.EVENT_NAME_IMAGE_MAP[github_1.context.eventName]
  }
}
/**
 * Return a link to the current workflow name.
 */
function getWorkflow() {
  const text = github_1.context.workflow
  if ((0, webhook_1.isPullRequestEvent)(github_1.context)) {
    return {
      text,
      url: `${github_1.context.payload.pull_request.html_url}/checks`
    }
  }
  if ((0, webhook_1.isReleaseEvent)(github_1.context)) {
    const {owner, repo} = github_1.context.repo
    return {
      text,
      url: `https://github.com/${owner}/${repo}/actions`
    }
  }
  return {
    text,
    url: `${getCommitUrl()}/checks`
  }
}
/**
 * Return the pull request head branch or short commit hash.
 */
function getRef() {
  if ((0, webhook_1.isPullRequestEvent)(github_1.context)) {
    return github_1.context.payload.pull_request.head.ref
  }
  return github_1.context.sha.substring(0, 7)
}
function getCommitUrl() {
  const {owner, repo} = github_1.context.repo
  return `https://github.com/${owner}/${repo}/commit/${github_1.context.sha}`
}
