import {endGroup, info, isDebug, startGroup, warning} from '@actions/core'
import {context} from '@actions/github'
import type {Commit} from '@octokit/webhooks-types'
import * as yaml from 'js-yaml'
import {OctokitClient} from '../github/types'
import {GitHubSender, isPushEvent, senderFromPayload} from '../github/webhook'
import {getSlackUserFromName} from '../slack/getSlackUserFromName'
import type {SlackClient} from '../slack/SlackClient'
import {isMessageAuthor, MessageAuthor} from '../slack/types'
import {EnvironmentVariable} from './input'

export const GH_MERGE_QUEUE_BOT_USERNAME = 'github-merge-queue[bot]'

export type GetMessageAuthor = (
  options?: GetMessageAuthorOptions
) => Promise<MessageAuthor | null>

interface GetMessageAuthorOptions {
  /** `false` falls back to GitHub username, skipping a conservatively rate-limited Slack API call */
  withSlackUserId?: boolean
}

/**
 * GitHub usernames mapped to their Slack {@link MessageAuthor}.
 *
 * A `null` value indicates no matching Slack user.
 */
export type GitHubUserMapping = Record<string, MessageAuthor | null>

interface GetMessageAuthorFactoryOptions {
  /** JSON or YAML-serialized {@link GitHubUserMapping} */
  githubUserMapping: string | null
}

export function getMessageAuthorFactory(
  octokit: OctokitClient,
  slack: SlackClient,
  options: GetMessageAuthorFactoryOptions
): GetMessageAuthor {
  return async (
    {withSlackUserId}: GetMessageAuthorOptions = {withSlackUserId: false}
  ): Promise<MessageAuthor | null> => {
    return getMessageAuthor(octokit, slack, {withSlackUserId, ...options})
  }
}

type Options = GetMessageAuthorOptions & GetMessageAuthorFactoryOptions

async function getMessageAuthor(
  octokit: OctokitClient,
  slack: SlackClient,
  {withSlackUserId, githubUserMapping}: Options
): Promise<MessageAuthor | null> {
  startGroup('Getting message author')

  const githubSender = await getGitHubSender(octokit)

  if (!githubSender) {
    warning('Unexpected GitHub sender payload.')
    endGroup()
    return null
  }

  try {
    const messageAuthor = maybeGetMessageAuthorFromGithubUserMapping(
      githubSender.login,
      githubUserMapping
    )

    if (messageAuthor) {
      return messageAuthor // favor githubUserMapping if defined
    }

    if (!withSlackUserId) {
      return {
        username: githubSender.login,
        icon_url: githubSender.avatar_url
      }
    }

    if (null === messageAuthor) {
      // falls back to GitHub username below
      throw new Error(
        `GitHub user "${githubSender.login}" not mapped to Slack user in ${EnvironmentVariable.SlackGithubUsers}.`
      )
    }

    info('Fetching Slack users')
    const slackUsers = await slack.getRealUsers()

    info(`Fetching GitHub user: ${githubSender.login}`)
    const githubUser = (
      await octokit.rest.users.getByUsername({
        username: githubSender.login
      })
    ).data

    const slackUser = getSlackUserFromName(slackUsers, githubUser.name)

    return {
      slack_user_id: slackUser.id,
      username: slackUser.profile.display_name,
      icon_url: slackUser.profile.image_48
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    warning(`${message} The message author will fallback to a GitHub username.`)

    if (isDebug() && err instanceof Error && err.stack) {
      warning(err.stack)
    }

    return {
      username: githubSender.login,
      icon_url: githubSender.avatar_url
    }
  } finally {
    endGroup()
  }
}

/**
 * Return the GitHub sender, conventionally from the webhook payload.
 *
 * If the sender is {@link GH_MERGE_QUEUE_BOT_USERNAME}, an attempt will be made
 * to derive the actual sender from the originating Merge Queue pull request.
 *
 * @returns always resolved promise, falling back to webhook payload sender.
 */
async function getGitHubSender(
  octokit: OctokitClient
): Promise<GitHubSender | undefined> {
  const sender = senderFromPayload(context.payload)

  if (GH_MERGE_QUEUE_BOT_USERNAME === sender?.login) {
    try {
      info(
        `Deriving pull request merger in favor of ${GH_MERGE_QUEUE_BOT_USERNAME} sender`
      )
      return await getPullRequestMergerFromPushCommit(octokit)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      warning(
        `${message} The message author will fallback to ${GH_MERGE_QUEUE_BOT_USERNAME}.`
      )
    }
  }

  return sender
}

async function getPullRequestMergerFromPushCommit(
  octokit: OctokitClient
): Promise<GitHubSender> {
  let commit: Commit | null = null

  if (isPushEvent(context)) {
    commit = context.payload.head_commit
  } else {
    throw new Error(
      `Encountered Merge Queue Bot user in non push event: '${context.eventName}'.`
    )
  }

  if (!commit) {
    throw new Error('Unexpected push event payload (undefined head_commit).')
  }

  const matches = commit.message.match(/\(#(\d+)\)$/m)

  if (!matches) {
    throw new Error(
      `Failed to parse PR number from commit message: '${commit.message}'.`
    )
  }

  const prNumber = Number(matches[1])

  const mergedBy = (
    await octokit.rest.pulls.get({
      ...context.repo,
      pull_number: prNumber
    })
  ).data.merged_by

  if (!mergedBy) {
    throw new Error('PR details does not include `merged_by` details.')
  }

  return mergedBy
}

/**
 * Parse `githubUserMapping`, and return the Slack {@link MessageAuthor}
 * associated with the specified `username`.
 *
 * - `null` indicates no matching Slack user
 * - `undefined` indicates unknown `username`
 */
function maybeGetMessageAuthorFromGithubUserMapping(
  username: string,
  githubUserMapping: string | null
): MessageAuthor | null | undefined {
  if (!githubUserMapping) {
    return undefined
  }

  let messageAuthor: MessageAuthor | null | undefined
  let warningMessage = ''

  try {
    let mapping: unknown

    if (githubUserMapping.trim().startsWith('{')) {
      info(`Parsing ${EnvironmentVariable.SlackGithubUsers} JSON`)
      mapping = JSON.parse(githubUserMapping)
    } else {
      info(`Parsing ${EnvironmentVariable.SlackGithubUsers} YAML`)
      mapping = yaml.load(githubUserMapping)
    }

    if (!isGitHubUserMapping(mapping)) {
      throw new Error('Expected author objects, keyed by GitHub username')
    }

    messageAuthor = mapping[username]
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    warningMessage = `${EnvironmentVariable.SlackGithubUsers} is invalid: ${message}. `
  }

  if (undefined === messageAuthor) {
    warning(`${warningMessage}Falling back to name matching via Slack API.`)
  }

  return messageAuthor
}

function isGitHubUserMapping(mapping: unknown): mapping is GitHubUserMapping {
  return (
    'object' === typeof mapping &&
    null !== mapping &&
    Object.values(mapping).every(
      value => null === value || isMessageAuthor(value)
    )
  )
}
