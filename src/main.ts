import {error, getInput, isDebug, setFailed, setOutput} from '@actions/core'
import {getOctokit} from '@actions/github'
import {getMessageAuthorFactory} from './getMessageAuthorFactory'
import {OctokitClient} from './github/types'
import {EnvironmentVariable, getEnv, getRequiredEnv} from './input'
import {postMessage} from './postMessage'
import {SlackClient} from './slack/SlackClient'

run()

async function run(): Promise<void> {
  try {
    const octokit = createOctokitClient()
    const slack = createSlackClient()

    const getMessageAuthor = getMessageAuthorFactory(octokit, slack)
    const ts = await postMessage({octokit, slack, getMessageAuthor})

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
  const token = getRequiredEnv(EnvironmentVariable.SlackBotToken)
  const channel = getRequiredEnv(EnvironmentVariable.SlackChannel)
  const errorReaction = getEnv(EnvironmentVariable.SlackErrorReaction)

  return new SlackClient({
    token,
    channel,
    errorReaction
  })
}

function createOctokitClient(): OctokitClient {
  const token = getInput('github_token', {required: true})

  return getOctokit(token)
}
