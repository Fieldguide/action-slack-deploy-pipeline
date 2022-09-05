import type {WebhookPayload} from '@actions/github/lib/interfaces'
import type {PullRequestEvent, PushEvent, User} from '@octokit/webhooks-types'
import type {Context} from './types'

export function isPullRequestEvent(
  context: Context
): context is Context<PullRequestEvent> {
  return 'pull_request' === context.eventName
}

export function isPushEvent(context: Context): context is Context<PushEvent> {
  return 'push' === context.eventName
}

export function senderFromPayload({sender}: WebhookPayload): User | undefined {
  if (sender?.login && sender.avatar_url) {
    return sender as User
  }
}
