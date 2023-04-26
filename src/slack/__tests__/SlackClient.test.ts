import {beforeEach, describe, expect, it, jest} from '@jest/globals'
import {CodedError, ErrorCode} from '@slack/web-api'
import {SlackClient} from '../SlackClient'
import {Member} from '../types'

const listUsers = jest.fn()

jest.mock('@slack/web-api', () => ({
  ErrorCode: {
    PlatformError: 'slack_webapi_platform_error'
  },
  LogLevel: {},
  WebClient: class MockWebClient {
    on(): void {
      // noop
    }
    users = {
      list: listUsers
    }
  },
  WebClientEvent: {}
}))

describe('SlackClient', () => {
  const client = new SlackClient({
    token: 'TOKEN',
    channel: 'CHANNEL'
  })

  describe('getRealUsers', () => {
    let users: Member[] | null

    describe('unexpected response', () => {
      let error: unknown

      beforeEach(async () => {
        listUsers.mockReturnValueOnce(Promise.resolve({}))

        try {
          await client.getRealUsers()
        } catch (err) {
          error = err
        }
      })

      it('should throw error', () => {
        expect(error).toBeInstanceOf(Error)
      })
    })

    describe('missing scope error', () => {
      beforeEach(async () => {
        listUsers.mockImplementation(() => {
          throw new SlackCodedError(ErrorCode.PlatformError, 'missing_scope')
        })

        users = await client.getRealUsers()
      })

      it('should return null', () => {
        expect(users).toBeNull()
      })
    })

    describe('success', () => {
      beforeEach(async () => {
        listUsers.mockReturnValueOnce(
          Promise.resolve({
            members: [
              {id: 'U1'},
              {id: 'U2', is_bot: false},
              {id: 'U3', is_bot: true},
              {id: 'USLACKBOT', is_bot: false}
            ]
          })
        )

        users = await client.getRealUsers()
      })

      it('should filter real users', () => {
        expect(users).toStrictEqual([{id: 'U1'}, {id: 'U2', is_bot: false}])
      })
    })
  })
})

class SlackCodedError extends Error implements CodedError {
  data: unknown

  constructor(readonly code: ErrorCode, error: string) {
    super(error)

    this.data = {ok: false, error}
  }
}
