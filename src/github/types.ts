import type {context} from '@actions/github'
import type {GitHub} from '@actions/github/lib/utils'
import type {Endpoints} from '@octokit/types'
import type {PullRequestEvent, PushEvent} from '@octokit/webhooks-types'
import type {KnownBlock} from '@slack/web-api'
import type {PostMessageArguments} from '../slack/types'

export type OctokitClient = InstanceType<typeof GitHub>

/* #region context */
export interface Context<T = unknown> extends Omit<typeof context, 'payload'> {
  payload: T
}

export interface ScheduleEvent {
  schedule: string
}

export type SupportedContext =
  | Context<PullRequestEvent>
  | Context<PushEvent>
  | Context<ScheduleEvent>
/* #endregion */

export interface Text {
  plain: string
  mrkdwn: string
}

export interface Message extends PostMessageArguments {
  text: string
  blocks: KnownBlock[]
}

/**
 * @see https://docs.github.com/en/actions/learn-github-actions/contexts#job-context
 */
export enum JobStatus {
  Success = 'success',
  Failure = 'failure',
  Cancelled = 'cancelled'
}

export function isSuccessful(status: string): status is JobStatus.Success {
  return JobStatus.Success === status
}

export type JobStep = NonNullable<
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs']['response']['data']['jobs'][0]['steps']
>[0]

export interface CompletedJobStep extends JobStep {
  completed_at: string
}

export function isCompletedJobStep(step: JobStep): step is CompletedJobStep {
  return Boolean(step.completed_at)
}
