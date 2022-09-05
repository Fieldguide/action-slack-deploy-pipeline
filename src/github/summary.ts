import {context} from '@actions/github'
import {bold, emoji, link} from '../slack/mrkdwn'
import {Link} from '../slack/types'
import {getContextBlock} from './context'
import {Message, Text} from './types'
import {isPullRequestEvent, isPushEvent, senderFromPayload} from './webhook'

export function getSummary(): Message {
  const text = getText()
  const contextBlock = getContextBlock()
  const sender = senderFromPayload(context.payload)

  return {
    icon_url: sender?.avatar_url,
    username: sender ? `${sender.login} via GitHub` : undefined,
    text: text.plain,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: text.mrkdwn
        }
      },
      contextBlock
    ]
  }
}

function getText(): Text {
  const gerund = 'Deploying'
  const {repo} = context.repo
  const message = getTitle()

  const mrkdwn = [
    emoji('black_square_button'),
    `${gerund} ${bold(repo)}:`,
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
