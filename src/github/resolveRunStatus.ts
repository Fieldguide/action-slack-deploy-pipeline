import {info} from '@actions/core'
import {JobStatus, WorkflowJob, isSuccessfulStatus} from './types'

interface UnsuccessfulJob {
  name: string
  status: JobStatus.Failure | JobStatus.Cancelled
}

/**
 * Return the status of the workflow run as a whole, deriving unsuccessful
 * statuses from its `jobs` when the current job's `status` is successful.
 *
 * A conclusive reporting job conventionally runs with `if: always()`, so its own
 * status is successful even when a preceding job failed. Jobs depending on that
 * failure are *skipped* rather than failed, so the failure is invisible from the
 * reporting job alone.
 *
 * @see https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#job-context
 */
export function resolveRunStatus(status: string, jobs: WorkflowJob[]): string {
  if (!isSuccessfulStatus(status)) {
    return status
  }

  const unsuccessfulJob = findUnsuccessfulJob(jobs)

  if (!unsuccessfulJob) {
    return status
  }

  info(
    `Deriving ${unsuccessfulJob.status} status from job: ${unsuccessfulJob.name}`
  )

  return unsuccessfulJob.status
}

/**
 * Return the first unsuccessful `jobs` entry, favoring failures over
 * cancellations.
 *
 * Only completed jobs are considered; the reporting job itself is necessarily
 * still in progress. Skipped jobs are deliberately ignored, as a skip caused by
 * an upstream failure is indistinguishable from one caused by an unmet `if`
 * condition.
 */
function findUnsuccessfulJob(jobs: WorkflowJob[]): UnsuccessfulJob | undefined {
  let cancelledJob: UnsuccessfulJob | undefined

  for (const {name, status, conclusion} of jobs) {
    if ('completed' !== status) {
      continue
    }

    if ('failure' === conclusion || 'timed_out' === conclusion) {
      return {name, status: JobStatus.Failure}
    }

    if ('cancelled' === conclusion && !cancelledJob) {
      cancelledJob = {name, status: JobStatus.Cancelled}
    }
  }

  return cancelledJob
}
