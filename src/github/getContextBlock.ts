import {context} from '@actions/github'
import {ContextBlock} from '@slack/web-api'
import {Duration, formatDuration} from 'date-fns' // eslint-disable-line import/named
import {link} from '../slack/mrkdwn'
import {Image, Link} from '../slack/types'
import {
  SupportedEventName,
  UnsupportedEventError,
  isPullRequestEvent,
  isReleaseEvent,
  isSupportedEvent
} from './webhook'

export const EVENT_NAME_IMAGE_MAP: Record<SupportedEventName, string> = {
  pull_request:
    'https://user-images.githubusercontent.com/847532/193414326-5aaf5449-0c81-4a66-9b19-4e5e6baeee9e.png',
  push: 'https://user-images.githubusercontent.com/847532/193413878-d5fcd559-401d-4954-a44c-36de5d6a7adf.png',
  schedule:
    'https://user-images.githubusercontent.com/847532/193414289-3b185a3b-aee8-40f9-99fe-0615d255c8dd.png',
  release:
    'https://user-images.githubusercontent.com/847532/265212273-b8c1036a-26b0-4196-bb11-0cbcb85d57c0.png',
  workflow_dispatch:
    'https://user-images.githubusercontent.com/847532/197601879-3bc8bf73-87c0-4216-8de7-c55d34993ef1.png'
} as const

export function getContextBlock(duration?: Duration): ContextBlock {
  const textParts = [link(getWorkflow()), getRef()]

  if (duration) {
    textParts.push(formatDuration(duration) || '0 seconds')
  }

  return {
    type: 'context',
    elements: [
      {
        type: 'image',
        ...getImage()
      },
      {
        type: 'mrkdwn',
        text: textParts.join('  ∙  ')
      }
    ]
  }
}

function getImage(): Image {
  if (!isSupportedEvent(context)) {
    throw new UnsupportedEventError(context)
  }

  return {
    alt_text: `${context.eventName} event`,
    image_url: EVENT_NAME_IMAGE_MAP[context.eventName]
  }
}

/**
 * Return a link to the current workflow name.
 */
function getWorkflow(): Link {
  const text = context.workflow

  if (isPullRequestEvent(context)) {
    return {
      text,
      url: `${context.payload.pull_request.html_url}/checks`
    }
  }

  if (isReleaseEvent(context)) {
    const {owner, repo} = context.repo

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
