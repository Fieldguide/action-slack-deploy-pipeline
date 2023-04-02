import type {
  ChatPostMessageArguments,
  ChatUpdateArguments,
  UsersListResponse
} from '@slack/web-api'

type Member = NonNullable<UsersListResponse['members']>[0]

export interface User extends Member {
  /**
   * The `users:read.email` OAuth scope is required to access this field.
   *
   * @see https://api.slack.com/methods/users.list#email-addresses
   */
  email?: string
}

export interface Link {
  text: string
  url: string
}

export interface Image {
  alt_text: string
  image_url: string
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

/**
 * @see https://api.slack.com/methods/chat.postMessage#authorship
 */
export interface MessageAuthor {
  /** bot's user name */
  username: string
  /** URL to an image to use as the icon for this message */
  icon_url: string
}
