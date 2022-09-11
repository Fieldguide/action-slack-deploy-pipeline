import {
  debug,
  error,
  getInput,
  isDebug,
  setFailed,
  setOutput
} from '@actions/core'
import {context, getOctokit} from '@actions/github'
import {GitHub} from '@actions/github/lib/utils'
import {getEnv} from './input'
import {postMessage} from './message'
import {SlackClient} from './slack/client'

async function run(): Promise<void> {
  try {
    const github = createGitHubClient()

    debug('listJobsForWorkflowRun')
    const jobs = await github.rest.actions.listJobsForWorkflowRun({
      ...context.repo,
      run_id: context.runId
    })
    debug(JSON.stringify(jobs, null, 2))

    const slack = createSlackClient()
    const ts = await postMessage({slack})

    if (ts) {
      setOutput('ts', ts)
    }
  } catch (err) {
    setFailed(err instanceof Error ? err : String(err))

    if (isDebug() && err instanceof Error && err.stack) {
      error(err.stack)
    }
  }
}

function createSlackClient(): SlackClient {
  const token = getEnv('SLACK_DEPLOY_BOT_TOKEN')
  const channel = getEnv('SLACK_DEPLOY_CHANNEL')

  return new SlackClient({token, channel})
}

function createGitHubClient(): InstanceType<typeof GitHub> {
  const token = getInput('github_token', {required: true})

  return getOctokit(token)
}

run()
