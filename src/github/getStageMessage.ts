import {context} from '@actions/github'
import {type Duration, intervalToDuration} from 'date-fns'
import type {GetMessageAuthor} from '../utils/getMessageAuthorFactory'
import {bold} from '../slack/mrkdwn'
import {getContextBlock} from './getContextBlock'
import {createMessage, emojiFromStatus} from './message'
import {
  JobStatus,
  StageMessage,
  Text,
  WorkflowJob,
  isCompletedJobStep,
  isSuccessfulStatus
} from './types'

interface Dependencies {
  jobs: WorkflowJob[]
  status: string
  now: Date
  getMessageAuthor: GetMessageAuthor
}

/**
 * Return a progressed stage message, posted via threaded reply.
 */
export async function getStageMessage({
  jobs,
  status,
  now,
  getMessageAuthor
}: Dependencies): Promise<StageMessage> {
  const text = getText(status)

  const duration = computeDuration(jobs, now)
  const contextBlock = getContextBlock(duration)
  const author = await getMessageAuthor()

  return {
    ...createMessage({text, contextBlock, author}),
    successful: isSuccessfulStatus(status)
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

function computeDuration(jobs: WorkflowJob[], now: Date): Duration | undefined {
  const currentJob = jobs.find(({name}) => name === context.job)

  const slackRegex = /[^A-Za-z]slack[^A-Za-z]/i
  const lastCompletedSlackStep = currentJob?.steps
    ?.filter(isCompletedJobStep)
    .filter(({name}) => slackRegex.test(` ${name} `))
    .pop()

  const start = lastCompletedSlackStep?.completed_at ?? currentJob?.started_at

  if (start) {
    return intervalToDuration({
      start: new Date(start),
      end: now
    })
  }
}
