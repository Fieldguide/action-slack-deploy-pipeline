import {error, getInput, isDebug, setFailed, setOutput} from '@actions/core'
import {getOctokit} from '@actions/github'
import {getMessageAuthorFactory} from './getMessageAuthorFactory'
import {OctokitClient} from './github/types'
import {EnvironmentVariable, getEnv, getRequiredEnv} from './input'
import {postMessage} from './postMessage'
import {SlackClient} from './slack/SlackClient'
import {generateGithubToSlackMapping} from './githubToSlackMapping'

run()

type ModeInput = 'notify' | 'generate-mapping'

async function run(): Promise<void> {
  try {
    const mode = getInput('__mode') as ModeInput

    const octokit = createOctokitClient()
    const slack = createSlackClient()

    switch (mode) {
      case 'notify':
        await notifySlack(octokit, slack)
        break

      case 'generate-mapping':
        await generateMapping(octokit, slack)
        break

      default:
        throw new Error(
          `Unknown mode: ${mode}. Expected 'notify' or 'generate-mapping'.`
        )
    }
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
  const org = getInput('org', {required: true})
  const outputPath = getInput('output_path')

  await generateGithubToSlackMapping(octokit, slack, org, outputPath)
  setOutput('output_path', outputPath)
}

async function notifySlack(
  octokit: OctokitClient,
  slack: SlackClient
): Promise<void> {
  const getMessageAuthor = getMessageAuthorFactory(octokit, slack, {userMappingFilepath: getInput(user_mapping_filepath)})
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
