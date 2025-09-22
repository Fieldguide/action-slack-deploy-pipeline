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
    await notifySlack(octokit, slack)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    error(`Error: ${errMsg}`)
    setFailed(errMsg)
    if (isDebug() && err instanceof Error && err.stack) {
      error(err.stack)
    }
  }
}

async function notifySlack(
  octokit: OctokitClient,
  slack: SlackClient
): Promise<void> {
  const githubUserMapping = getEnv(EnvironmentVariable.SlackGithubUsers)
  const getMessageAuthor = getMessageAuthorFactory(octokit, slack, {
    githubUserMapping
  })
  const ts = await postMessage({octokit, slack, getMessageAuthor})
  if (ts) {
    setOutput('ts', ts)
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
