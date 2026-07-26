import {context} from '@actions/github'
import {OctokitClient, WorkflowJob} from './types'

/**
 * Return every job in the current workflow run.
 *
 * Jobs that have not yet been created are absent from the response, rather than
 * enumerated as queued.
 */
export async function getWorkflowJobs(
  octokit: OctokitClient
): Promise<WorkflowJob[]> {
  return octokit.paginate(octokit.rest.actions.listJobsForWorkflowRun, {
    ...context.repo,
    run_id: context.runId,
    per_page: 100
  })
}
