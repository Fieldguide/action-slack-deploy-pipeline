import {context} from '@actions/github'
import {ContextBlock} from '@slack/web-api'
import {link} from '../slack/mrkdwn'
import {Link} from '../slack/types'
import {isPullRequestEvent} from './webhook'

export function getContextBlock(): ContextBlock {
  const workflow = link(getWorkflow())
  const ref = getRef()

  return {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: [workflow, ref].join('  ∙  ')
      }
    ]
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

/**
 * Return the pull request head branch or short commit hash.
 */
function getRef(): string {
  if (isPullRequestEvent(context)) {
    return context.payload.pull_request.head.ref
  }

  return context.sha.substring(0, 7)
}

function getCommitUrl(): string {
  const {owner, repo} = context.repo

  return `https://github.com/${owner}/${repo}/commit/${context.sha}`
}
