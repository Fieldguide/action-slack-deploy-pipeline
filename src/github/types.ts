import type {context} from '@actions/github'
import type {ChatPostMessageArguments, KnownBlock} from '@slack/web-api'
import type {Duration} from 'date-fns'

export interface Context<T = unknown> extends Omit<typeof context, 'payload'> {
  payload: T
}

export interface Text {
  plain: string
  mrkdwn: string
}

export interface MessageOptions {
  status: string
  duration: Duration
}

export interface Message
  extends Pick<ChatPostMessageArguments, 'username' | 'icon_url'> {
  text: string
  blocks: KnownBlock[]
}
