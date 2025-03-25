import * as github from '@actions/github'
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals'
import {
  getMessageAuthor,
  GH_MERGE_QUEUE_BOT_USERNAME
} from '../getMessageAuthor'
import {OctokitClient} from '../github/types'
import {SlackClient} from '../slack/SlackClient'
import {Member, MessageAuthor} from '../slack/types'

describe('getMessageAuthor', () => {
  let octokit: OctokitClient
  let slack: SlackClient
  let messageAuthor: MessageAuthor | null

  const OLD_CONTEXT_PAYLOAD = github.context.payload

  beforeEach(() => {
    github.context.payload = {
      sender: {
        type: 'user',
        login: 'namoscato',
        avatar_url: 'github.com/namoscato'
      }
    }

    octokit = {
      rest: {
        users: {
          getByUsername: jest.fn(async () => ({
            data: {
              name: 'Miles Davis'
            }
          }))
        },
        pulls: {
          get: jest.fn(async () => ({
            data: {
              merged_by: {
                login: 'namoscato',
                avatar_url: 'github.com/namoscato'
              }
            }
          }))
        }
      }
    } as unknown as OctokitClient

    slack = {
      getRealUsers: jest.fn()
    } as unknown as SlackClient
  })

  afterEach(() => {
    github.context.payload = OLD_CONTEXT_PAYLOAD
  })

  describe('missing Slack OAuth scope', () => {
    beforeEach(async () => {
      messageAuthor = await getMessageAuthor(octokit, slack)
    })

    it('should fetch Slack users', () => {
      expect(slack.getRealUsers).toHaveBeenCalledTimes(1)
    })

    it('should fallback to GitHub username', () => {
      expect(messageAuthor).toStrictEqual({
        username: 'namoscato',
        icon_url: 'github.com/namoscato'
      })
    })
  })

  describe('Slack user not found', () => {
    beforeEach(async () => {
      jest.mocked(slack.getRealUsers).mockReturnValue(
        Promise.resolve<Member[]>([
          {
            profile: {
              real_name: 'first last 1',
              display_name: 'name 1',
              image_48: 'slack.com/img1'
            }
          },
          {
            profile: {
              real_name: 'first last 2',
              display_name: 'name 2',
              image_48: 'slack.com/img2'
            }
          }
        ])
      )
    })

    describe('with GitHub context', () => {
      beforeEach(async () => {
        messageAuthor = await getMessageAuthor(octokit, slack)
      })

      it('should fallback to GitHub username', () => {
        expect(messageAuthor?.username).toBe('namoscato')
      })
    })

    describe('without GitHub context', () => {
      beforeEach(async () => {
        github.context.payload = {}

        messageAuthor = await getMessageAuthor(octokit, slack)
      })

      it('should return null', () => {
        expect(messageAuthor).toBeNull()
      })
    })
  })

  describe('multiple Slack users with same name', () => {
    beforeEach(async () => {
      jest.mocked(slack.getRealUsers).mockReturnValue(
        Promise.resolve<Member[]>([
          {
            id: 'U1',
            profile: {
              real_name: 'Miles Davis',
              display_name: 'Miles 1',
              image_48: 'slack.com/img-miles1'
            }
          },
          {
            id: 'U2',
            profile: {
              real_name: 'Miles Davis',
              display_name: 'Miles 2',
              image_48: 'slack.com/img-miles2'
            }
          }
        ])
      )

      messageAuthor = await getMessageAuthor(octokit, slack)
    })

    it('should fallback to GitHub username', () => {
      expect(messageAuthor?.username).toBe('namoscato')
    })
  })

  describe('Slack user found', () => {
    beforeEach(async () => {
      jest.mocked(slack.getRealUsers).mockReturnValue(
        Promise.resolve<Member[]>([
          {
            id: 'U1',
            profile: {
              real_name: 'first last 1',
              display_name: 'name 1',
              image_48: 'slack.com/img1'
            }
          },
          {
            id: 'U2',
            profile: {
              real_name: 'Miles Davis',
              display_name: 'Miles',
              image_48: 'slack.com/img-miles'
            }
          }
        ])
      )

      messageAuthor = await getMessageAuthor(octokit, slack)
    })

    it('should return Slack user', () => {
      expect(messageAuthor).toStrictEqual({
        slack_user_id: 'U2',
        username: 'Miles',
        icon_url: 'slack.com/img-miles'
      })
    })
  })

  describe('merged by the GH merge queue', () => {
    beforeEach(async () => {
      github.context.payload = {
        sender: {
          type: 'bot',
          login: GH_MERGE_QUEUE_BOT_USERNAME,
          avatar_url: 'BOT_AVATAR_URL'
        },
        head_commit: {
          message: 'Some Awesome New Feature (#123)'
        },
        repository: {
          name: 'REPO_NAME',
          organization: 'OWNER'
        } as never
      }
    })

    it('falls back on user who merged the PR', async () => {
      expect((await getMessageAuthor(octokit, slack))?.username).toBe(
        'namoscato'
      )
    })

    describe('when the head commit message does not include PR number', () => {
      beforeEach(() => {
        github.context.payload.head_commit.message = 'Some new feature'
      })

      it('falls back on merge queue user', async () => {
        expect((await getMessageAuthor(octokit, slack))?.username).toBe(
          GH_MERGE_QUEUE_BOT_USERNAME
        )
      })
    })

    describe('when the webhook payload is missing repo info', () => {
      beforeEach(() => {
        delete github.context.payload.repository
      })

      it('falls back on merge queue user', async () => {
        expect((await getMessageAuthor(octokit, slack))?.username).toBe(
          GH_MERGE_QUEUE_BOT_USERNAME
        )
      })
    })

    describe('when the request for PR info fails/does not include required info', () => {
      beforeEach(() => {
        ;(octokit.rest.pulls.get as unknown as jest.Mock).mockImplementation(
          () => {
            throw new Error('oh noes')
          }
        )
      })

      it('falls back on merge queue user', async () => {
        expect((await getMessageAuthor(octokit, slack))?.username).toBe(
          GH_MERGE_QUEUE_BOT_USERNAME
        )
      })
    })
  })
})
