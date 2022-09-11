import {context} from '@actions/github'
import {intervalToDuration} from 'date-fns'
import {bold, emoji, link} from '../slack/mrkdwn'
import {Link} from '../slack/types'
import {dateFromTs} from '../slack/utils'
import {getContextBlock} from './context'
import {createMessage, emojiFromStatus} from './message'
import {JobStatus, Message, Text} from './types'
import {isPullRequestEvent, isPushEvent} from './webhook'

interface Options {
  status: string
  threadTs: string
  now: Date
}

export function getSummaryMessage(options?: Options): Message {
  const text = getText(options?.status)

  const duration = options
    ? intervalToDuration({
        start: dateFromTs(options.threadTs),
        end: options.now
      })
    : undefined

  const contextBlock = getContextBlock(duration)

  return createMessage(text, contextBlock)
}

function getText(status?: string): Text {
  const summarySentence = getSummarySentence(status)
  const eventTitle = getEventTitle()

  const mrkdwn = [
    status ? emojiFromStatus(status) : emoji('black_square_button'),
    `${summarySentence.mrkdwn}:`,
    link(eventTitle)
  ].join(' ')

  return {
    plain: `${summarySentence.plain}: ${eventTitle.text}`,
    mrkdwn
  }
}

function getSummarySentence(status?: string): Text {
  const verb = status ? verbFromStatus(status) : 'Deploying'
  const {repo} = context.repo

  return {
    plain: `${verb} ${repo}`,
    mrkdwn: `${verb} ${bold(repo)}`
  }
}

/**
 * @see https://docs.github.com/en/actions/learn-github-actions/contexts#job-context
 */
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

function getEventTitle(): Link {
  if (isPullRequestEvent(context)) {
    const pullRequest = context.payload.pull_request

    return {
      text: `${pullRequest.title} (#${pullRequest.number})`,
      url: pullRequest.html_url
    }
  }

  if (isPushEvent(context) && context.payload.head_commit) {
    const commit = context.payload.head_commit

    return {
      text: commit.message,
      url: commit.url
    }
  }

  throw new Error(
    `Unsupported event ${context.eventName} (currently supported events include: pull_request, push)`
  )
}
