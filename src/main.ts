import {error, getInput, isDebug, setFailed, setOutput} from '@actions/core'
import {getOctokit} from '@actions/github'
import {getMessageAuthor} from './getMessageAuthor'
import {OctokitClient} from './github/types'
import {EnvironmentVariable, getEnv} from './input'
import {postMessage} from './postMessage'
import {SlackClient} from './slack/client'

async function run(): Promise<void> {
  try {
    const octokit = createOctokitClient()
    const slack = createSlackClient()

    await getMessageAuthor(octokit, slack)

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
  const token = getEnv(EnvironmentVariable.SlackBotToken)
  const channel = getEnv(EnvironmentVariable.SlackChannel)

  return new SlackClient({token, channel})
}

function createOctokitClient(): OctokitClient {
  const token = getInput('github_token', {required: true})

  return getOctokit(token)
}

run()
