import type {
  ChatPostMessageArguments,
  ChatUpdateArguments
} from '@slack/web-api'

export interface Link {
  text: string
  url: string
}

export type PostMessageArguments = Omit<
  RemoveIndex<ChatPostMessageArguments>,
  'channel'
>

export type UpdateMessageArguments = Omit<
  RemoveIndex<ChatUpdateArguments>,
  'channel'
>

/**
 * Remove `WebAPICallOptions` index signature from Slack argument types.
 *
 * @see https://stackoverflow.com/a/51956054
 */
type RemoveIndex<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
    ? never
    : K]: T[K]
}
