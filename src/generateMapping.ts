import {error, getInput, isDebug, setFailed, setOutput} from '@actions/core'
import {getOctokit} from '@actions/github'
import {OctokitClient} from './github/types'
import {SlackClient} from './slack/SlackClient'
import {EnvironmentVariable, getEnv, getRequiredEnv} from './input'
import {githubToSlackMapping} from './githubToSlackMapping'

run()

async function run(): Promise<void> {
  try {
    const octokit = createOctokitClient()
    const slack = createSlackClient()
    await generateMapping(octokit, slack)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    error(`Error: ${errMsg}`)
    setFailed(errMsg)
    if (isDebug() && err instanceof Error && err.stack) {
      error(err.stack)
    }
  }
}

async function generateMapping(
  octokit: OctokitClient,
  slack: SlackClient
): Promise<void> {
  const github_org = getInput('github_org', {required: true})
  const mapping = await githubToSlackMapping(octokit, slack, github_org)
  const mappingJson = JSON.stringify(mapping, null, 2)

  setOutput('json', mappingJson)
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
