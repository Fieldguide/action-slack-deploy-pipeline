import {error, getInput, isDebug, setFailed, setOutput} from '@actions/core'
import {getOctokit} from '@actions/github'
import {GitHubClient} from './github/types'
import {getEnv} from './input'
import {postMessage} from './message'
import {SlackClient} from './slack/client'

async function run(): Promise<void> {
  try {
    const github = createGitHubClient()
    const slack = createSlackClient()

    const ts = await postMessage({github, slack})

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

function createGitHubClient(): GitHubClient {
  const token = getInput('github_token', {required: true})

  return getOctokit(token)
}

run()
