import type {GitHub} from '@actions/github/lib/utils'
import type {Endpoints} from '@octokit/types'
import type {KnownBlock} from '@slack/web-api'

export type OctokitClient = InstanceType<typeof GitHub>

export interface Text {
  plain: string
  mrkdwn: string
}

export interface Message {
  icon_url: string | undefined
  username: string | undefined
  unfurl_links: boolean
  text: string
  blocks: KnownBlock[]
}

export interface StageMessage extends Message {
  successful: boolean
}

/**
 * @see https://docs.github.com/en/actions/learn-github-actions/contexts#job-context
 */
export enum JobStatus {
  Success = 'success',
  Failure = 'failure',
  Cancelled = 'cancelled'
}

export function isSuccessfulStatus(
  status: string
): status is JobStatus.Success {
  return JobStatus.Success === status
}

export type JobStep = NonNullable<
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs']['response']['data']['jobs'][0]['steps']
>[0]

export interface CompletedJobStep extends JobStep {
  completed_at: string
}

export function isCompletedJobStep(step: JobStep): step is CompletedJobStep {
  return Boolean(step.completed_at) && 'skipped' !== step.conclusion
}

export type User = Endpoints['GET /users/{username}']['response']['data']
