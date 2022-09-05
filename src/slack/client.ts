import {ChatPostMessageArguments, WebClient} from '@slack/web-api'

export class SlackClient {
  private web: WebClient

  constructor(token: string) {
    this.web = new WebClient(token)
  }

  /**
   * @returns message timestamp ID
   */
  async postMessage(options: ChatPostMessageArguments): Promise<string> {
    const {ts} = await this.web.chat.postMessage(options)

    if (!ts) {
      throw new Error('Response timestamp ID undefined')
    }

    return ts
  }
}
