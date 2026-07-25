import {info, isDebug, warning} from '@actions/core'
import {
  LogLevel,
  WebClient,
  WebClientEvent,
  type RetryOptions
} from '@slack/web-api'
import {isMissingScopeError, MissingScopeError} from './MissingScopeError'
import {
  isMemberWithProfile,
  MemberWithProfile,
  type AddReactionArguments,
  type PostMessageArguments,
  type UpdateMessageArguments
} from './types'
import {isCodedPlatformError} from './utils/isCodedPlatformError'

interface Dependencies {
  token: string
  channel?: string
  errorReaction?: string | null
}

/**
 * Abandon a single request after 30 seconds.
 *
 * The SDK defaults to `0`, meaning a half-open connection hangs until the OS
 * gives up — minutes per attempt. Generous enough for an unpaginated
 * `users.list` against a large workspace, which is the slowest call we make.
 */
const REQUEST_TIMEOUT = 30 * 1000

/**
 * Give up on a request after roughly two minutes.
 *
 * The SDK defaults to `tenRetriesInAboutThirtyMinutes`, which combined with the
 * unbounded request timeout above could otherwise stall a step for ~50 minutes
 * during a network outage.
 */
const RETRY_CONFIG: RetryOptions = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 10 * 1000,
  maxRetryTime: 2 * 60 * 1000
}

export class SlackClient {
  private readonly web: WebClient
  private readonly channel?: string
  private readonly errorReaction?: string | null

  constructor({token, channel, errorReaction}: Dependencies) {
    this.channel = channel
    this.errorReaction = errorReaction

    this.web = new WebClient(token, {
      logLevel: isDebug() ? LogLevel.DEBUG : LogLevel.INFO,
      rejectRateLimitedCalls: true,
      timeout: REQUEST_TIMEOUT,
      retryConfig: RETRY_CONFIG
    })
    this.logRateLimits()
  }

  /**
   * Return the set of non-bot users with a defined profile.
   *
   * @throws {MissingScopeError} if the bot token is missing the required OAuth scope
   */
  async getRealUsers(): Promise<MemberWithProfile[]> {
    try {
      const {members} = await this.web.users.list({})

      if (!members) {
        throw new Error('Error fetching users')
      }

      return members.filter((user): user is MemberWithProfile => {
        return (
          isMemberWithProfile(user) &&
          'USLACKBOT' !== user.id && // USLACKBOT is a special user ID for @SlackBot
          !user.is_bot
        )
      })
    } catch (error) {
      if (isMissingScopeError(error)) {
        throw MissingScopeError.fromScope('users:read')
      }

      throw error
    }
  }

  /**
   * @returns message timestamp ID
   */
  async postMessage(options: PostMessageArguments): Promise<string> {
    if (!this.channel) {
      throw new Error('channel dependency is required')
    }

    const {ts} = await this.web.chat.postMessage({
      ...options,
      channel: this.channel
    })

    if (!ts) {
      throw new Error('Response timestamp ID undefined')
    }

    return ts
  }

  async updateMessage(options: UpdateMessageArguments): Promise<void> {
    if (!this.channel) {
      throw new Error('channel dependency is required')
    }

    await this.web.chat.update({...options, channel: this.channel})
  }

  /**
   * @throws {MissingScopeError} if the bot token is missing the required OAuth scope
   */
  async maybeAddErrorReaction({ts}: AddReactionArguments): Promise<void> {
    if (!this.channel) {
      throw new Error('channel dependency is required')
    }

    if (!this.errorReaction) {
      return
    }

    try {
      info(`Adding error reaction: ${this.errorReaction}`)
      await this.web.reactions.add({
        channel: this.channel,
        name: this.errorReaction,
        timestamp: ts
      })
    } catch (error) {
      if (
        isCodedPlatformError(error) &&
        'already_reacted' === error.data.error
      ) {
        info('Error reaction already added')

        return
      }

      if (isMissingScopeError(error)) {
        throw MissingScopeError.fromScope('reactions:write')
      }

      throw error
    }
  }

  /**
   * @see https://slack.dev/node-slack-sdk/web-api#rate-limits
   */
  private logRateLimits(): void {
    this.web.on(WebClientEvent.RATE_LIMITED, () => {
      warning('Slack API call failed due to rate limiting.')
    })
  }
}
