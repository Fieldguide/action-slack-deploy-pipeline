import type {WebhookPayload} from '@actions/github/lib/interfaces'
import type {PullRequestEvent, PushEvent, User} from '@octokit/webhooks-types'
import type {Context, ScheduleEvent} from './types'

/**
 * @see https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#pull_request
 */
export function isPullRequestEvent(
  context: Context
): context is Context<PullRequestEvent> {
  return 'pull_request' === context.eventName
}

/**
 * @see https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#push
 */
export function isPushEvent(context: Context): context is Context<PushEvent> {
  return 'push' === context.eventName
}

/**
 * @see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule
 */
export function isScheduleEvent(
  context: Context
): context is Context<ScheduleEvent> {
  return 'schedule' === context.eventName
}

export function senderFromPayload({sender}: WebhookPayload): User | undefined {
  if (sender?.login && sender.avatar_url) {
    return sender as User
  }
}
