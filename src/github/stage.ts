import {context} from '@actions/github'
import {bold} from '../slack/mrkdwn'
import {getContextBlock} from './context'
import {createMessage, emojiFromStatus, verbFromStatus} from './message'
import {Message, MessageOptions, Text} from './types'

export function getStageMessage({status, duration}: MessageOptions): Message {
  const text = getText(status)
  const contextBlock = getContextBlock(duration)

  return createMessage(text, contextBlock)
}

function getText(status: string): Text {
  const verb = verbFromStatus(status)
  const predicate = context.job

  const mrkdwn = [emojiFromStatus(status), verb, bold(predicate)].join(' ')

  return {
    plain: `${verb} ${predicate}`,
    mrkdwn
  }
}
