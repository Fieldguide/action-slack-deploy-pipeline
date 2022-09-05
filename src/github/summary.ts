import {context} from '@actions/github'
import {SectionBlock} from '@slack/web-api'
import {bold, emoji, link} from '../slack/mrkdwn'
import {Link} from '../slack/types'
import {Text} from './types'
import {isPullRequestEvent, isPushEvent} from './webhook'

interface Summary {
  text: string
  block: SectionBlock
}

export function getSummary(): Summary {
  const text = getText()

  return {
    text: text.plain,
    block: {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: text.mrkdwn
      }
    }
  }
}

function getText(): Text {
  const summary = `Deploying ${context.repo.repo}:`
  const message = getTitle()

  const mrkdwn = [
    emoji('white_medium_square'),
    bold(`Deploying ${context.repo.repo}:`),
    link(message)
  ].join(' ')

  return {
    plain: `${summary} ${message.text}`,
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
