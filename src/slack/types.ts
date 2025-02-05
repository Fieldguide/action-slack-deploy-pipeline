import type {KnownBlock, UsersListResponse} from '@slack/web-api'

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

export type PostMessageArguments = MessageArguments & ReplyInThread

export interface UpdateMessageArguments extends MessageArguments {
  /** Timestamp of the message. */
  ts: string
}

/** Stricter and compatible with `ChatPostMessageArguments` / `ChatUpdateArguments` */
interface MessageArguments {
  /** URL to an image to use as the icon for this message */
  icon_url: string | undefined
  /** Set your bot's username */
  username: string | undefined
  /** Pass `true` to enable unfurling of primarily text-based content. */
  unfurl_links: boolean
  /** Fallback notification text. */
  text: string
  /** An array of structured Blocks. */
  blocks: KnownBlock[]
}

/** Copied from `@slack/web-api` source types */
type ReplyInThread = WithinThreadReply | BroadcastedThreadReply

interface WithinThreadReply extends Partial<ThreadTS> {
  reply_broadcast?: false
}

interface BroadcastedThreadReply extends ThreadTS {
  reply_broadcast: true
}

interface ThreadTS {
  thread_ts: string
}

export interface AddReactionArguments {
  /** Timestamp of the message to add reaction to. */
  ts: string
}
