import {endGroup, info, isDebug, startGroup, warning} from '@actions/core'
import {context} from '@actions/github'
import type {Commit} from '@octokit/webhooks-types'
import {OctokitClient, User} from './github/types'
import {isPushEvent, senderFromPayload} from './github/webhook'
import {SlackClient} from './slack/SlackClient'
import {MemberWithProfile, MessageAuthor} from './slack/types'

export const GH_MERGE_QUEUE_BOT_USERNAME = 'github-merge-queue[bot]'
type FallbackToGithubContextUser = boolean

export async function getMessageAuthor(
  octokit: OctokitClient,
  slack: SlackClient
): Promise<MessageAuthor | null> {
  startGroup('Getting message author')

  try {
    info('Fetching Slack users')
    const slackUsers = await slack.getRealUsers()

    const [githubUser, fallbackToGithubContextUser] =
      await getGitHubUser(octokit)

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

    if (!fallbackToGithubContextUser && !matchingSlackUser) {
      return {
        username: githubUser.login,
        icon_url: githubUser.avatar_url
      }
    }

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

    return authorFromGitHubContext()
  } finally {
    endGroup()
  }
}

async function getGitHubUser(
  octokit: OctokitClient
): Promise<[User, FallbackToGithubContextUser]> {
  const sender = senderFromPayload(context.payload)

  if (!sender) {
    throw new Error('Unexpected GitHub sender payload.')
  }

  if (GH_MERGE_QUEUE_BOT_USERNAME === sender.login) {
    info(
      'Author is GH Merge Queue Bot User. Fetching actual author via PR info.'
    )
    return [await getGitHubPRMergerUser(octokit), false]
  }

  info(`Fetching GitHub user: ${sender.login}`)
  const {data} = await octokit.rest.users.getByUsername({
    username: sender.login
  })

  return [data, true]
}

function authorFromGitHubContext(): MessageAuthor | null {
  const sender = senderFromPayload(context.payload)

  if (!sender) {
    return null
  }

  return {
    username: sender.login,
    icon_url: sender.avatar_url
  }
}

async function getGitHubPRMergerUser(octokit: OctokitClient): Promise<User> {
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

  const matches = commit.message.match(/\(#(\d+)\)$/)

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

  info(`Fetching PR Merger GitHub user: ${mergedBy.login}`)
  const {data} = await octokit.rest.users.getByUsername({
    username: mergedBy.login
  })

  return data
}
