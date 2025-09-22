import {info, warning, error} from '@actions/core'
import {OctokitClient} from './github/types'
import {SlackClient} from './slack/SlackClient'
import {
  isMemberWithProfile,
  type Member,
  type MessageAuthor
} from './slack/types'
import type {User as GithubUser} from '@octokit/webhooks-types'

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

/**
 * Fetch all GitHub users for the organization, match to Slack users, and output mapping as JSON.
 * @param octokit OctokitClient instance
 * @param slack SlackClient instance
 * @param org GitHub organization name
 * @param outputPath Path to output JSON file
 */
export async function generateGithubToSlackMapping(
  octokit: OctokitClient,
  slack: SlackClient,
  org: string
): Promise<Record<string, MessageAuthor>> {
  info(`Fetching GitHub users for org: ${org}`)

  // Fetch from GitHub and save
  const githubOrgUsers = await listOrgMembersWithNames(octokit, org)
  const githubUsersByLogin = githubOrgUsers.reduce(
    (acc: Record<GithubUser['login'], GithubUser>, user: GithubUser) => ({
      ...acc,
      [user.login]: user
    }),
    {}
  )

  const mapping: Record<string, MessageAuthor> = {}

  const slackUsers: Member[] = await slack.getRealUsers()
  if (slackUsers.length === 0) {
    error('No Slack users found. Exiting mapping generation.')
    return mapping
  }

  const membersWithProfile = slackUsers.filter(isMemberWithProfile)

  for (const ghUserDetails of Object.values(githubUsersByLogin)) {
    const slackMatch = membersWithProfile.find(
      user => user.profile.real_name === ghUserDetails.name
    )

    if (slackMatch !== undefined) {
      mapping[ghUserDetails.login] = {
        slack_user_id: slackMatch?.id || '',
        username: slackMatch?.profile.display_name || '',
        icon_url: slackMatch?.profile.image_48 || ''
      }
    } else {
      warning(
        `No matching Slack user found for GitHub user: ${ghUserDetails.login} (${ghUserDetails.name ?? ''})`
      )
    }
  }

  return mapping
}
