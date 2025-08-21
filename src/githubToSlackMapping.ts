import {info, warning} from '@actions/core'
import {OctokitClient} from './github/types'
import {SlackClient} from './slack/SlackClient'
import type {Member, MemberWithProfile} from './slack/types'
import * as fs from 'fs'
import type {User as GithubUser} from '@octokit/webhooks-types'

async function listOrgMembersWithNames(
  octokit: OctokitClient,
  org: string
): Promise<GithubUser[]> {
  const members = await octokit.paginate(octokit.rest.orgs.listMembers, {
    org,
    per_page: 100
  })

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
  org: string,
  outputPath: string
): Promise<void> {
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

  const slackUsers: Member[] = await slack.getRealUsers()

  const mapping: Record<
    string,
    {
      slack_user_id: string
      username: string
      icon_url: string
    }
  > = {}

  for (const ghUserDetails of Object.values(githubUsersByLogin)) {
    const slackMatch: MemberWithProfile | undefined = (slackUsers.filter(
      (user): user is MemberWithProfile =>
        Boolean(
          user.profile?.real_name?.toLowerCase() ===
            (ghUserDetails.name
              ? ghUserDetails.name.toLowerCase()
              : undefined) && user.profile?.display_name
        )
    ) ?? [undefined])[0]

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

  info(`Writing mapping to ${outputPath}`)
  fs.mkdirSync(outputPath.split('/')[0], {recursive: true})
  fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2))
}
