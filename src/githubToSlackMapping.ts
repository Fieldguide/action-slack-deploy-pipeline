import {error, info, warning} from '@actions/core'
import type {User as GithubUser} from '@octokit/webhooks-types'
import {OctokitClient} from './github/types'
import {getSlackUserFromName} from './slack/getSlackUserFromName'
import {SlackClient} from './slack/SlackClient'
import {type MessageAuthor} from './slack/types'

/**
 * Fetch all GitHub users for the organization, match to Slack users, and output mapping as JSON.
 * @param octokit OctokitClient instance
 * @param slack SlackClient instance
 * @param github_org GitHub organization name
 */
export async function githubToSlackMapping(
  octokit: OctokitClient,
  slack: SlackClient,
  github_org: string
): Promise<Record<string, MessageAuthor>> {
  info(`Fetching GitHub users for org: ${github_org}`)

  // Fetch from GitHub and save
  const githubOrgUsers = await listOrgMembersWithNames(octokit, github_org)
  const githubUsersByLogin = githubOrgUsers.reduce(
    (acc: Record<GithubUser['login'], GithubUser>, user: GithubUser) => ({
      ...acc,
      [user.login]: user
    }),
    {}
  )

  const mapping: Record<string, MessageAuthor> = {}

  const slackUsers = await slack.getRealUsers()
  if (slackUsers.length === 0) {
    error('No Slack users found. Exiting mapping generation.')
    return mapping
  }

  for (const githubUser of Object.values(githubUsersByLogin)) {
    try {
      const slackUser = getSlackUserFromName(slackUsers, githubUser.name)

      mapping[githubUser.login] = {
        slack_user_id: slackUser.id,
        username: slackUser.profile.display_name,
        icon_url: slackUser.profile.image_48
      }
    } catch (err) {
      warning(err instanceof Error ? err.message : String(err))
    }
  }

  return mapping
}

async function listOrgMembersWithNames(
  octokit: OctokitClient,
  org: string
): Promise<GithubUser[]> {
  const members = await octokit.paginate(octokit.rest.orgs.listMembers, {
    org,
    per_page: 100
  })

  if (!members || members.length === 0) {
    error(`No members found for organization: ${org}`)
    return []
  }

  const humanUsers = (
    await Promise.all(
      members
        .filter(user => user.type === 'User')
        .map(async m => {
          const getUserResponse = await octokit.rest.users.getByUsername({
            username: m.login
          })
          if (getUserResponse.status !== 200) {
            warning(`Failed to fetch user details for ${m.login}`)
            return null
          }
          return getUserResponse.data
        })
    )
  ).filter(Boolean) as GithubUser[]

  return humanUsers
}
