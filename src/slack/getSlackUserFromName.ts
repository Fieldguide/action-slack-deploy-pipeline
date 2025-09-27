import {info} from '@actions/core'
import {MemberWithProfile} from './types'

/**
 * Return the Slack user with the specified GitHub `name`.
 *
 * @throws {Error} if a user is not found, or if multiple users have the same `name`
 */
export function getSlackUserFromName(
  users: MemberWithProfile[],
  name: string | null | undefined
): MemberWithProfile {
  info(`Finding Slack user by name: ${name}`)
  const matchingUsers = users.filter(user => user.profile.real_name === name)

  const matchingUser = matchingUsers[0]

  if (!matchingUser) {
    throw new Error(
      `Unable to match GitHub user "${name}" to Slack user by name.`
    )
  }

  if (matchingUsers.length > 1) {
    throw new Error(
      `${matchingUsers.length} Slack users match GitHub user name "${name}".`
    )
  }

  return matchingUser
}
