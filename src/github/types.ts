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

export interface Message extends Omit<ChatPostMessageArguments, 'channel'> {
  text: string
  blocks: KnownBlock[]
}

export enum JobStatus {
  Success = 'success',
  Failure = 'failure',
  Cancelled = 'cancelled'
}
