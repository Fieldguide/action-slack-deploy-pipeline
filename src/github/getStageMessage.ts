import {context} from '@actions/github'
import {intervalToDuration} from 'date-fns'
import {bold} from '../slack/mrkdwn'
import {MessageAuthor} from '../slack/types'
import {getContextBlock} from './getContextBlock'
import {createMessage, emojiFromStatus} from './message'
import {
  JobStatus,
  Message,
  OctokitClient,
  Text,
  isCompletedJobStep,
  isSuccessful
} from './types'

interface Dependencies {
  octokit: OctokitClient
  status: string
  now: Date
  author: MessageAuthor | null
}

/**
 * Return a progressed stage message, posted via threaded reply.
 */
export async function getStageMessage({
  octokit,
  status,
  now,
  author
}: Dependencies): Promise<Message> {
  const text = getText(status)

  const duration = await computeDuration(octokit, now)
  const contextBlock = getContextBlock(duration)

  return {
    ...createMessage({text, contextBlock, author}),
    reply_broadcast: !isSuccessful(status)
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

async function computeDuration(
  octokit: OctokitClient,
  now: Date
): Promise<Duration | undefined> {
  const {data} = await octokit.rest.actions.listJobsForWorkflowRun({
    ...context.repo,
    run_id: context.runId
  })

  const currentJob = data.jobs.find(({name}) => name === context.job)

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
