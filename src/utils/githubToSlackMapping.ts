import {info, warning} from '@actions/core'
import {GitHubUserMapping} from './getMessageAuthorFactory'
import {OctokitClient} from '../github/types'
import {getSlackUserFromName} from '../slack/getSlackUserFromName'
import {SlackClient} from '../slack/SlackClient'

/**
 * Return all GitHub usernames from the specified `github_org`, mapped to their Slack user.
 *
 * The users are matched by full name. If a match is not found, the value will be `null`.
 */
export async function githubToSlackMapping(
  octokit: OctokitClient,
  slack: SlackClient,
  github_org: string
): Promise<GitHubUserMapping> {
  const githubUsers = await fetchGitHubUsers(octokit, github_org)
  if (githubUsers.length === 0) {
    warning('No GitHub members found.')
    return {}
  }

  info('Fetching Slack users')
  const slackUsers = await slack.getRealUsers()
  if (slackUsers.length === 0) {
    warning('No Slack users found.')
    return {}
  }

  const result: GitHubUserMapping = {}

  for (const githubUser of githubUsers) {
    try {
      const slackUser = getSlackUserFromName(slackUsers, githubUser.name)

      result[githubUser.login] = {
        slack_user_id: slackUser.id,
        username: slackUser.profile.display_name,
        icon_url: slackUser.profile.image_48
      }
    } catch (err) {
      warning(err instanceof Error ? err.message : String(err))

      result[githubUser.login] = null
    }
  }

  return result
}

/**
 * Fetch the GitHub user profiles for the specified `org`.
 */
async function fetchGitHubUsers(
  octokit: OctokitClient,
  org: string
): Promise<GitHubUser[]> {
  info(`Fetching GitHub members for org: ${org}`)
  const members = await octokit.paginate(octokit.rest.orgs.listMembers, {
    org,
    per_page: 100
  })

  return await Promise.all<GitHubUser>(
    members
      .filter(member => member.type === 'User')
      .map(async member => {
        info(`Fetching GitHub user: ${member.login}`)
        const {data} = await octokit.rest.users.getByUsername({
          username: member.login
        })

        return data
      })
  )
}

type GitHubUser = Awaited<
  ReturnType<OctokitClient['rest']['users']['getByUsername']>
>['data']
