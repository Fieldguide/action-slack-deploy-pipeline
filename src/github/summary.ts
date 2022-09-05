import {context} from '@actions/github'
import {bold, emoji, link} from '../slack/mrkdwn'
import {Link} from '../slack/types'
import {getContextBlock} from './context'
import {createMessage} from './message'
import {Message, Text} from './types'
import {isPullRequestEvent, isPushEvent} from './webhook'

export function getSummaryMessage(): Message {
  const text = getText()
  const contextBlock = getContextBlock()

  return createMessage(text, contextBlock)
}

function getText(): Text {
  const gerund = 'Deploying'
  const {repo} = context.repo
  const message = getTitle()

  const mrkdwn = [
    emoji('black_square_button'),
    gerund,
    `${bold(repo)}:`,
    link(message)
  ].join(' ')

  return {
    plain: `${gerund} ${repo}: ${message.text}`,
    mrkdwn
  }
}

function getTitle(): Link {
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
