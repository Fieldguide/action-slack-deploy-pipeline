import {warning} from '@actions/core'
import {context} from '@actions/github'
import {OctokitClient, User} from './github/types'
import {senderFromPayload} from './github/webhook'
import {EnvironmentVariable} from './input'
import {SlackClient} from './slack/client'
import {MessageAuthor} from './slack/types'

export async function getMessageAuthor(
  octokit: OctokitClient,
  slack: SlackClient
): Promise<MessageAuthor | null> {
  try {
    const githubSender = senderFromPayload(context.payload)
    const slackUsers = await slack.getUsers()
    console.log({slackUsers})

    if (!slackUsers) {
      warning(
        `${EnvironmentVariable.SlackBotToken} does not include "users:read" OAuth scope, and the message author will fallback to a GitHub username.`
      )

      return githubSender
        ? {
            username: githubSender.login,
            icon_url: githubSender.avatar_url
          }
        : null
    }

    const githubUser = await getGitHubUser(octokit)
    console.log({githubUser})

    const githubEmails = (
      await octokit.rest.users.listEmailsForAuthenticatedUser()
    ).data
    console.log({githubEmails})

    const slackUserByEmail = slackUsers.find(slackUser => {
      return githubEmails.some(({email}) => email === slackUser.email)
    })

    return null
  } catch (error) {
    console.error(error)
    throw error
  }
}

async function getGitHubUser(octokit: OctokitClient): Promise<User | null> {
  const sender = senderFromPayload(context.payload)

  if (!sender) {
    return null
  }

  const {data} = await octokit.rest.users.getByUsername({
    username: sender.login
  })

  return data
}
