import {context} from '@actions/github'
import {bold} from '../slack/mrkdwn'
import {getContextBlock} from './context'
import {createMessage, emojiFromStatus} from './message'
import {JobStatus, Message, MessageOptions, Text} from './types'

export function getStageMessage({status, duration}: MessageOptions): Message {
  const text = getText(status)
  const contextBlock = getContextBlock(duration)

  return {
    ...createMessage(text, contextBlock),
    reply_broadcast: JobStatus.Success !== status
  }
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

/**
 * Return past tense verb for the specified job `status`.
 *
 * @see https://docs.github.com/en/actions/learn-github-actions/contexts#job-context
 */
function verbFromStatus(status: string): string {
  switch (status) {
    case JobStatus.Success:
      return 'Finished'
    case JobStatus.Failure:
      return 'Failed'
    case JobStatus.Cancelled:
      return 'Cancelled'
    default:
      throw new Error(`Unexpected status ${status}`)
  }
}
