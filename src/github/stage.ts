import {context} from '@actions/github'
import {intervalToDuration} from 'date-fns'
import {bold} from '../slack/mrkdwn'
import {getContextBlock} from './context'
import {createMessage, emojiFromStatus} from './message'
import {
  CompletedJobStep,
  GitHubClient,
  isCompletedJobStep,
  isSuccessful,
  JobStatus,
  Message,
  Text
} from './types'

interface Options {
  github: GitHubClient
  status: string
  now: Date
}

export async function getStageMessage({
  github,
  status,
  now
}: Options): Promise<Message> {
  const text = getText(status)

  const duration = await computeDuration(github, now)
  const contextBlock = getContextBlock(duration)

  return {
    ...createMessage(text, contextBlock),
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

async function computeDuration(
  github: GitHubClient,
  now: Date
): Promise<Duration | undefined> {
  const {data} = await github.rest.actions.listJobsForWorkflowRun({
    ...context.repo,
    run_id: context.runId
  })

  const slackRegex = /[^A-Za-z]slack[^A-Za-z]/i
  const lastCompletedSlackStep = data.jobs
    .flatMap<CompletedJobStep>(({steps}) => {
      if (!steps) {
        return []
      }

      return steps
        .filter(isCompletedJobStep)
        .filter(({name}) => slackRegex.test(` ${name} `))
    })
    .pop()

  if (lastCompletedSlackStep) {
    return intervalToDuration({
      start: new Date(lastCompletedSlackStep.completed_at),
      end: now
    })
  }
}
