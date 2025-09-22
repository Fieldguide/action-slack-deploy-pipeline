import {
  endGroup,
  error,
  info,
  isDebug,
  startGroup,
  warning
} from '@actions/core'
import {context} from '@actions/github'
import type {Commit} from '@octokit/webhooks-types'
import {OctokitClient} from './github/types'
import {GitHubSender, isPushEvent, senderFromPayload} from './github/webhook'
import {SlackClient} from './slack/SlackClient'
import {
  isMemberWithProfile,
  isMessageAuthor,
  MessageAuthor
} from './slack/types'
import * as yaml from 'js-yaml'

export const GH_MERGE_QUEUE_BOT_USERNAME = 'github-merge-queue[bot]'

export type GetMessageAuthor = (
  options?: GetMessageAuthorOptions
) => Promise<MessageAuthor | null>

interface GetMessageAuthorOptions extends GetMessageAuthorFactoryOptions {
  /** `false` falls back to GitHub username, skipping a conservatively rate-limited Slack API call */
  withSlackUserId?: boolean
}

interface GetMessageAuthorFactoryOptions {
  githubUserMapping?: string | null
}

export function getMessageAuthorFactory(
  octokit: OctokitClient,
  slack: SlackClient,
  options: GetMessageAuthorFactoryOptions = {
    githubUserMapping: ''
  }
): GetMessageAuthor {
  return async (
    {withSlackUserId}: GetMessageAuthorOptions = {withSlackUserId: false}
  ): Promise<MessageAuthor | null> => {
    return getMessageAuthor(octokit, slack, {withSlackUserId, ...options})
  }
}

function getMessageAuthorFromGithubUserMapping(
  githubUserLogin: string,
  githubUserMapping: string
): MessageAuthor | null {
  if (!githubUserMapping) {
    return null
  }
  // Try JSON first
  let mapping: Record<string, MessageAuthor> = {}
  if (githubUserMapping.trim().startsWith('{')) {
    mapping = JSON.parse(githubUserMapping) as Record<string, MessageAuthor>
  } else {
    mapping = yaml.load(githubUserMapping) as Record<string, MessageAuthor>
  }

  // validate mapping shape
  const isValidShapeMapping = Object.values(mapping).every(isMessageAuthor)
  if (!isValidShapeMapping) {
    error('Invalid shape for GitHub to Slack user mapping.')
  }

  if (mapping[githubUserLogin]) {
    return mapping[githubUserLogin]
  }

  return null
}

async function getMessageAuthor(
  octokit: OctokitClient,
  slack: SlackClient,
  {withSlackUserId, githubUserMapping}: GetMessageAuthorOptions
): Promise<MessageAuthor | null> {
  startGroup('Getting message author')

  const githubSender = await getGitHubSender(octokit)

  if (!githubSender) {
    warning('Unexpected GitHub sender payload.')
    endGroup()
    return null
  }

  try {
    if (!withSlackUserId) {
      return {
        username: githubSender.login,
        icon_url: githubSender.avatar_url
      }
    }

    let messageAuthor: MessageAuthor | null
    if (githubUserMapping && githubUserMapping !== '') {
      messageAuthor = getMessageAuthorFromGithubUserMapping(
        githubSender.login,
        githubUserMapping
      )
      if (messageAuthor) {
        return messageAuthor
      }
      warning('No cached mapping found, fetching Slack user by GitHub name.')
    }

    info('Fetching Slack users')
    const slackUsers = await slack.getRealUsers()

    info(`Fetching GitHub user: ${githubSender.login}`)
    const githubUser = (
      await octokit.rest.users.getByUsername({
        username: githubSender.login
      })
    ).data

    const membersWithProfile = slackUsers.filter(isMemberWithProfile)

    info(`Finding Slack user by name: ${githubUser.name}`)
    const matchingSlackUser = membersWithProfile.find(
      user => user.profile.real_name === githubUser.name
    )

    if (!matchingSlackUser) {
      throw new Error(
        `Unable to match GitHub user "${githubUser.name}" to Slack user by name.`
      )
    }

    return {
      slack_user_id: matchingSlackUser.id,
      username: matchingSlackUser.profile.display_name,
      icon_url: matchingSlackUser.profile.image_48
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
