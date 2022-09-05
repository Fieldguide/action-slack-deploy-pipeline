import type {context} from '@actions/github'

export interface Context<T = unknown> extends Omit<typeof context, 'payload'> {
  payload: T
}

export interface Text {
  plain: string
  mrkdwn: string
}
