import type {context} from '@actions/github'
import type {WebhookPayload} from '@actions/github/lib/interfaces'
import type {PullRequestEvent, PushEvent, User} from '@octokit/webhooks-types'

export const SUPPORTED_EVENT_NAMES = [
  'pull_request',
  'push',
  'schedule'
] as const

export type SupportedEventName = typeof SUPPORTED_EVENT_NAMES[number]

export type GitHubContext = Omit<typeof context, 'payload'>

export interface Context<E extends SupportedEventName, P = unknown>
  extends GitHubContext {
  eventName: E
  payload: P
}

export interface ScheduleEvent {
  schedule: string
}

export type PullRequestContext = Context<'pull_request', PullRequestEvent>

export type PushContext = Context<'push', PushEvent>

export type ScheduleContext = Context<'schedule', ScheduleEvent>

export type SupportedContext =
  | PullRequestContext
  | PushContext
  | ScheduleContext

/**
 * @see https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#pull_request
 */
export function isPullRequestEvent(
  context: GitHubContext
): context is PullRequestContext {
  return 'pull_request' === context.eventName
}

/**
 * @see https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#push
 */
export function isPushEvent(context: GitHubContext): context is PushContext {
  return 'push' === context.eventName
}

/**
 * @see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule
 */
export function isScheduleEvent(
  context: GitHubContext
): context is ScheduleContext {
  return 'schedule' === context.eventName
}

export function isSupportedEvent(
  context: GitHubContext
): context is SupportedContext {
  return SUPPORTED_EVENT_NAMES.includes(context.eventName as SupportedEventName)
}

export class UnsupportedEventError extends Error {
  constructor(context: GitHubContext) {
    const supportedEvents = SUPPORTED_EVENT_NAMES.join(', ')

    super(
      `Unsupported "${context.eventName}" event (currently supported events include: ${supportedEvents})`
    )
  }
}

export function assertUnsupportedEvent(context: never): never {
  throw new UnsupportedEventError(context as GitHubContext)
}

export function senderFromPayload({sender}: WebhookPayload): User | undefined {
  if (sender?.login && sender.avatar_url) {
    return sender as User
  }
}
