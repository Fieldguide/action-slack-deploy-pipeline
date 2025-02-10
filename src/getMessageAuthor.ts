import {endGroup, info, isDebug, startGroup, warning} from '@actions/core'
import {context} from '@actions/github'
import {OctokitClient, User} from './github/types'
import {senderFromPayload} from './github/webhook'
import {SlackClient} from './slack/SlackClient'
import {MemberWithProfile, MessageAuthor} from './slack/types'

export async function getMessageAuthor(
  octokit: OctokitClient,
  slack: SlackClient
): Promise<MessageAuthor | null> {
  startGroup('Getting message author')

  try {
    info('Fetching Slack users')
    const slackUsers = await slack.getRealUsers()

    const githubUser = await getGitHubUser(octokit)

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

    return authorFromGitHubContext()
  } finally {
    endGroup()
  }
}

async function getGitHubUser(octokit: OctokitClient): Promise<User> {
  const sender = senderFromPayload(context.payload)

  if (!sender) {
    throw new Error('Unexpected GitHub sender payload.')
  }

  info(`Fetching GitHub user: ${sender.login}`)
  const {data} = await octokit.rest.users.getByUsername({
    username: sender.login
  })

  return data
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
