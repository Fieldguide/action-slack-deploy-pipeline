import {WebClient} from '@slack/web-api'
import {isMissingScopeError} from './errors'
import type {
  MessageAuthor,
  PostMessageArguments,
  UpdateMessageArguments,
  User
} from './types'

interface Dependencies {
  token: string
  channel: string
  fallbackAuthor?: MessageAuthor
}

export class SlackClient {
  private readonly web: WebClient
  private readonly channel: string
  private readonly fallbackAuthor?: MessageAuthor

  constructor({token, channel, fallbackAuthor}: Dependencies) {
    this.web = new WebClient(token)
    this.channel = channel
    // this.fallbackAuthor = fallbackAuthor
  }

  /**
   * @returns `null` if the bot token is missing the required OAuth scope
   */
  async getUsers(): Promise<User[] | null> {
    try {
      const {members} = await this.web.users.list()

      if (!members) {
        throw new Error('Error fetching users')
      }

      return members
    } catch (error) {
      if (isMissingScopeError(error)) {
        return null
      }

      throw error
    }
  }

  /**
   * @returns message timestamp ID
   */
  async postMessage(options: PostMessageArguments): Promise<string> {
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
    await this.web.chat.update({...options, channel: this.channel})
  }
}
