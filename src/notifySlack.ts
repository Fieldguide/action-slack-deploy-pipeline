import {error, getInput, isDebug, setFailed, setOutput} from '@actions/core'
import {getOctokit} from '@actions/github'
import {OctokitClient} from './github/types'
import {SlackClient} from './slack/SlackClient'
import {isTransientError} from './slack/utils/isTransientError'
import {getMessageAuthorFactory} from './utils/getMessageAuthorFactory'
import {EnvironmentVariable, getEnv, getRequiredEnv} from './utils/input'
import {postMessage} from './utils/postMessage'

notifySlack()

async function notifySlack(): Promise<void> {
  try {
    const octokit = createOctokitClient()
    const slack = createSlackClient()

    const githubUserMapping = getEnv(EnvironmentVariable.SlackGithubUsers)
    const getMessageAuthor = getMessageAuthorFactory(octokit, slack, {
      githubUserMapping
    })
    const ts = await postMessage({octokit, slack, getMessageAuthor})

    if (ts) {
      setOutput('ts', ts)
    }
  } catch (err) {
    const message = err instanceof Error ? err : String(err)

    if (isTransientError(err)) {
      // Slack being unreachable is not a deploy failure
      error(message)
    } else {
      setFailed(message)
    }

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
