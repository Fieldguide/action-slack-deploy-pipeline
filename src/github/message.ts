import {context} from '@actions/github'
import {ContextBlock} from '@slack/web-api'
import {emoji} from '../slack/mrkdwn'
import {JobStatus, Message, Text} from './types'
import {senderFromPayload} from './webhook'

export function createMessage(text: Text, contextBlock: ContextBlock): Message {
  const sender = senderFromPayload(context.payload)

  return {
    icon_url: sender?.avatar_url,
    username: sender ? `${sender.login} (via GitHub)` : undefined,
    unfurl_links: false,
    text: text.plain,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: text.mrkdwn
        }
      },
      contextBlock
    ]
  }
}

export function emojiFromStatus(status: string): string {
  switch (status) {
    case JobStatus.Success:
      return emoji('white_check_mark')
    case JobStatus.Failure:
      return emoji('x')
    case JobStatus.Cancelled:
      return emoji('no_entry_sign')
    default:
      throw new Error(`Unexpected status ${status}`)
  }
}
