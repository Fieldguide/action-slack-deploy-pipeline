import {WebClient} from '@slack/web-api'
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

  async getUsers(): Promise<User[]> {
    const {members} = await this.web.users.list()

    if (!members) {
      throw new Error('Error fetching users')
    }

    return members
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
