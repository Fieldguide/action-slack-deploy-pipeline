import {endGroup, info, isDebug, startGroup, warning} from '@actions/core'
import {context} from '@actions/github'
import type {Commit} from '@octokit/webhooks-types'
import {OctokitClient} from './github/types'
import {GitHubSender, isPushEvent, senderFromPayload} from './github/webhook'
import {SlackClient} from './slack/SlackClient'
import {MemberWithProfile, MessageAuthor} from './slack/types'

export const GH_MERGE_QUEUE_BOT_USERNAME = 'github-merge-queue[bot]'

export async function getMessageAuthor(
  octokit: OctokitClient,
  slack: SlackClient
): Promise<MessageAuthor | null> {
  startGroup('Getting message author')

  const githubSender = await getGitHubSender(octokit)

  if (!githubSender) {
    warning('Unexpected GitHub sender payload.')
    return null
  }

  try {
    info('Fetching Slack users')
    const slackUsers = await slack.getRealUsers()

    info(`Fetching GitHub user: ${githubSender.login}`)
    const githubUser = (
      await octokit.rest.users.getByUsername({
        username: githubSender.login
      })
    ).data

    info(`Finding Slack user by name: ${githubUser.name}`)
    const matchingSlackUsers = slackUsers.filter(
      (user): user is MemberWithProfile => {
        return Boolean(
          user.profile?.real_name === githubUser.name &&
            user.profile.display_name &&
            user.profile.image_48
        )
      }
    )

    const matchingSlackUser = matchingSlackUsers[0]

    if (!matchingSlackUser) {
      throw new Error(
        `Unable to match GitHub user "${githubUser.name}" to Slack user by name.`
      )
    }

    if (matchingSlackUsers.length > 1) {
      throw new Error(
        `${matchingSlackUsers.length} Slack users match GitHub user name "${githubUser.name}".`
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
