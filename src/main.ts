import {error, getInput, isDebug, setFailed, setOutput} from '@actions/core'
import {getOctokit} from '@actions/github'
import {OctokitClient} from './github/types'
import {getEnv} from './input'
import {postMessage} from './message'
import {SlackClient} from './slack/client'

async function run(): Promise<void> {
  try {
    const octokit = createOctokitClient()
    const slack = createSlackClient()

    const ts = await postMessage(octokit, slack)

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

function createOctokitClient(): OctokitClient {
  const token = getInput('github_token', {required: true})

  return getOctokit(token)
}

run()
