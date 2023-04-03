import type {
  ChatPostMessageArguments,
  ChatUpdateArguments,
  UsersListResponse
} from '@slack/web-api'

export type Member = NonNullable<UsersListResponse['members']>[0]

export interface MemberWithProfile extends Member {
  profile: Member['profile'] & {
    display_name: string
    image_48: string
  }
}

/**
 * @see https://api.slack.com/methods/chat.postMessage#authorship
 */
export interface MessageAuthor {
  /** Slack workspace user identifier */
  slack_user_id?: string
  /** bot's user name */
  username: string
  /** URL to an image to use as the icon for this message */
  icon_url: string
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
