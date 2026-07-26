import {context} from '@actions/github'
import {OctokitClient, WorkflowJob} from './types'

/**
 * Return every workflow job that has been created in the current run.
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
