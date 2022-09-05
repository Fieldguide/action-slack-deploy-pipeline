import {context} from '@actions/github'
import {ContextBlock} from '@slack/web-api'
import {emoji} from '../slack/mrkdwn'
import {Message, Text} from './types'
import {senderFromPayload} from './webhook'

export function createMessage(text: Text, contextBlock: ContextBlock): Message {
  const sender = senderFromPayload(context.payload)

  return {
    icon_url: sender?.avatar_url,
    username: sender ? `${sender.login} (via GitHub)` : undefined,
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

/**
 * Return past tense verb for the specified job `status`.
 *
 * @see https://docs.github.com/en/actions/learn-github-actions/contexts#job-context
 */
export function verbFromStatus(
  status: string,
  successful = 'Finished'
): string {
  switch (status) {
    case 'success':
      return successful
    case 'failure':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
    default:
      throw new Error(`Unexpected status ${status}`)
  }
}

export function emojiFromStatus(status: string): string {
  switch (status) {
    case 'success':
      return emoji('white_check_mark')
    case 'failure':
      return emoji('x')
    case 'cancelled':
      return emoji('no_entry_sign')
    default:
      throw new Error(`Unexpected status ${status}`)
  }
}
