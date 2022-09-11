import {context} from '@actions/github'
import {Duration, intervalToDuration} from 'date-fns' // eslint-disable-line import/named
import {dateFromTs} from '../slack/utils'
import {CompletedJobStep, GitHubClient, isCompletedJobStep} from './types'

export async function computeStageDuration(
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

export function durationFromTs(threadTs: string, now: Date): Duration {
  return intervalToDuration({
    start: dateFromTs(threadTs),
    end: now
  })
}
