import {info, isDebug, warning} from '@actions/core'
import {LogLevel, WebClient, WebClientEvent} from '@slack/web-api'
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

export class SlackClient {
  private readonly web: WebClient
  private readonly channel?: string
  private readonly errorReaction?: string | null

  constructor({token, channel, errorReaction}: Dependencies) {
    this.channel = channel
    this.errorReaction = errorReaction

    this.web = new WebClient(token, {
      logLevel: isDebug() ? LogLevel.DEBUG : LogLevel.INFO,
      rejectRateLimitedCalls: true
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
