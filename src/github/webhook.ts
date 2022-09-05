import type {PullRequestEvent, PushEvent} from '@octokit/webhooks-types'
import type {Context} from './types'

export function isPullRequestEvent(
  context: Context
): context is Context<PullRequestEvent> {
  return 'pull_request' === context.eventName
}

export function isPushEvent(context: Context): context is Context<PushEvent> {
  return 'push' === context.eventName
}
