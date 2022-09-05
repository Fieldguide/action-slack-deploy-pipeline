import type {context} from '@actions/github'
import type {ChatPostMessageArguments, KnownBlock} from '@slack/web-api'

export interface Context<T = unknown> extends Omit<typeof context, 'payload'> {
  payload: T
}

export interface Text {
  plain: string
  mrkdwn: string
}

export interface Message
  extends Pick<ChatPostMessageArguments, 'username' | 'icon_url'> {
  text: string
  blocks: KnownBlock[]
}
