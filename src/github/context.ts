import {context} from '@actions/github'
import {ContextBlock} from '@slack/web-api'
import {link} from '../slack/mrkdwn'
import {Link} from '../slack/types'
import {isPullRequestEvent, senderFromPayload} from './webhook'

export function getContextBlock(): ContextBlock {
  const elements: ContextBlock['elements'] = []
  const textParts: string[] = []

  const sender = senderFromPayload(context.payload)
  if (sender) {
    elements.push({
      type: 'image',
      image_url: sender.avatar_url,
      alt_text: `@${sender.login}`
    })
    textParts.push(
      link({
        text: sender.login,
        url: sender.html_url
      })
    )
  }

  textParts.push(link(getWorkflow()), link(getRef()))

  elements.push({
    type: 'mrkdwn',
    text: textParts.join('  ∙  ')
  })

  return {
    type: 'context',
    elements
  }
}

function getWorkflow(): Link {
  const text = context.workflow

  if (isPullRequestEvent(context)) {
    return {
      text,
      url: `${context.payload.pull_request.html_url}/checks`
    }
  }

  return {
    text,
    url: getCommitUrl()
  }
}

function getRef(): Link {
  if (isPullRequestEvent(context)) {
    const pullRequest = context.payload.pull_request

    return {
      text: pullRequest.head.ref,
      url: pullRequest.html_url
    }
  }

  return {
    text: context.sha.substring(0, 7),
    url: getCommitUrl()
  }
}

function getCommitUrl(): string {
  const {owner, repo} = context.repo

  return `https://github.com/${owner}/${repo}/commit/${context.sha}`
}
