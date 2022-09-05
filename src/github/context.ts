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
    textParts.push(sender.login)
  }

  textParts.push(link(getWorkflow()), getRef())

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
    url: `${getCommitUrl()}/checks`
  }
}

function getRef(): string {
  if (isPullRequestEvent(context)) {
    return context.payload.pull_request.head.ref
  }

  return context.sha.substring(0, 7)
}

// todo necessary?
function getCommitUrl(): string {
  const {owner, repo} = context.repo

  return `https://github.com/${owner}/${repo}/commit/${context.sha}`
}
