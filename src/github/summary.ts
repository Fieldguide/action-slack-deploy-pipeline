import * as github from '@actions/github'
import {intervalToDuration} from 'date-fns'
import {bold, emoji, link} from '../slack/mrkdwn'
import {Link} from '../slack/types'
import {dateFromTs} from '../slack/utils'
import {getContextBlock} from './context'
import {createMessage, emojiFromStatus} from './message'
import {
  Context,
  JobStatus,
  Message,
  OctokitClient,
  SupportedContext,
  Text
} from './types'
import {isPullRequestEvent, isPushEvent, isScheduleEvent} from './webhook'

interface Options {
  status: string
  threadTs: string
  now: Date
}

/**
 * Return the initial summary message.
 */
export async function getSummaryMessage(
  octokit: OctokitClient,
  options?: Options
): Promise<Message> {
  const text = await getText(octokit, options?.status)

  const duration = options
    ? intervalToDuration({
        start: dateFromTs(options.threadTs),
        end: options.now
      })
    : undefined

  const contextBlock = getContextBlock(duration)

  return createMessage(text, contextBlock)
}

async function getText(octokit: OctokitClient, status?: string): Promise<Text> {
  const summarySentence = getSummarySentence(status)
  const eventLink = await getEventLink(octokit)

  const mrkdwn = [
    status ? emojiFromStatus(status) : emoji('black_square_button'),
    `${summarySentence.mrkdwn}:`,
    link(eventLink)
  ].join(' ')

  return {
    plain: `${summarySentence.plain}: ${eventLink.text}`,
    mrkdwn
  }
}

function getSummarySentence(status?: string): Text {
  const verb = status ? verbFromStatus(status) : 'Deploying'
  const {repo} = github.context.repo

  return {
    plain: `${verb} ${repo}`,
    mrkdwn: `${verb} ${bold(repo)}`
  }
}

function verbFromStatus(status: string): string {
  switch (status) {
    case JobStatus.Success:
      return 'Deployed'
    case JobStatus.Failure:
      return 'Failed deploying'
    case JobStatus.Cancelled:
      return 'Cancelled deploying'
    default:
      throw new Error(`Unexpected status ${status}`)
  }
}

async function getEventLink(octokit: OctokitClient): Promise<Link> {
  const context = github.context as SupportedContext

  if (isPullRequestEvent(context)) {
    const pullRequest = context.payload.pull_request

    return {
      text: getEventLinkText(`${pullRequest.title} (#${pullRequest.number})`),
      url: pullRequest.html_url
    }
  }

  if (isPushEvent(context)) {
    const commit = context.payload.head_commit

    if (!commit) {
      throw new Error('Unexpected push event payload (undefined head_commit)')
    }

    return {
      text: getEventLinkText(commit.message),
      url: commit.url
    }
  }

  if (isScheduleEvent(context)) {
    const commit = (
      await octokit.rest.repos.getCommit({
        ...context.repo,
        ref: context.sha
      })
    ).data.commit

    return {
      text: getEventLinkText(commit.message),
      url: commit.url
    }
  }

  assertUnsupportedContext(context)
}

/**
 * Return the first `message` line, i.e. omitting the commit description.
 */
function getEventLinkText(message: string): string {
  return message.split('\n', 1)[0]
}

function assertUnsupportedContext(context: never): never {
  const eventName = (context as Context).eventName

  throw new Error(
    `Unsupported "${eventName}" event (currently supported events include: pull_request, push, schedule)`
  )
}
