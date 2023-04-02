import {context} from '@actions/github'
import {OctokitClient, User} from './github/types'
import {senderFromPayload} from './github/webhook'
import {SlackClient} from './slack/client'

export async function getMessageAuthor(
  octokit: OctokitClient,
  slack: SlackClient
): Promise<void> {
  try {
    const slackUsers = await slack.getUsers()
    console.log({slackUsers})

    const githubUser = await getGitHubUser(octokit)
    console.log({githubUser})

    const githubEmails = (
      await octokit.rest.users.listEmailsForAuthenticatedUser()
    ).data
    console.log({githubEmails})

    const slackUserByEmail = slackUsers.find(slackUser => {
      return githubEmails.some(({email}) => email === slackUser.email)
    })
  } catch (error) {
    console.error(error)
    throw error
  }
}

async function getGitHubUser(
  octokit: OctokitClient
): Promise<User | undefined> {
  const sender = senderFromPayload(context.payload)

  if (sender) {
    const {data} = await octokit.rest.users.getByUsername({
      username: sender.login
    })

    return data
  }
}
