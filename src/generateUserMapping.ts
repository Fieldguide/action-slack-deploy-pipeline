import {error, getInput, isDebug, setFailed, setOutput} from '@actions/core'
import {getOctokit} from '@actions/github'
import {OctokitClient} from './github/types'
import {SlackClient} from './slack/SlackClient'
import {githubToSlackMapping} from './utils/githubToSlackMapping'
import {EnvironmentVariable, getRequiredEnv} from './utils/input'

generateUserMapping()

async function generateUserMapping(): Promise<void> {
  try {
    const octokit = createOctokitClient()
    const slack = createSlackClient()

    const github_org = getInput('github_org', {required: true})
    const mapping = await githubToSlackMapping(octokit, slack, github_org)
    const mappingJson = JSON.stringify(mapping)

    setOutput('json', mappingJson)
  } catch (err) {
    setFailed(err instanceof Error ? err : String(err))

    if (isDebug() && err instanceof Error && err.stack) {
      error(err.stack)
    }
  }
}

function createSlackClient(): SlackClient {
  const token = getRequiredEnv(EnvironmentVariable.SlackBotToken)
  return new SlackClient({token})
}

function createOctokitClient(): OctokitClient {
  const token = getInput('github_token', {required: true})
  return getOctokit(token)
}
