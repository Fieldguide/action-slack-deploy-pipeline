import {WebClient} from '@slack/web-api'
import {PostMessageArguments, UpdateMessageArguments} from './types'

interface Dependencies {
  token: string
  channel: string
}

export class SlackClient {
  private readonly web: WebClient
  private readonly channel: string

  constructor({token, channel}: Dependencies) {
    this.web = new WebClient(token)
    this.channel = channel
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
