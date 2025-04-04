import {beforeEach, describe, expect, it, jest} from '@jest/globals'
import {CodedError, ErrorCode} from '@slack/web-api'
import {MissingScopeError} from '../MissingScopeError'
import {SlackClient} from '../SlackClient'
import {Member} from '../types'

const listUsers = jest.fn()
const addReaction = jest.fn()

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
    reactions = {
      add: addReaction
    }
  },
  WebClientEvent: {}
}))

describe('SlackClient', () => {
  const client = new SlackClient({
    token: 'TOKEN',
    channel: 'CHANNEL',
    errorReaction: 'REACTION'
  })

  beforeEach(() => {
    jest.resetAllMocks()
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
      })

      it('should throw error', () => {
        expect(async () => client.getRealUsers()).rejects.toThrow(
          MissingScopeError
        )
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

  describe('maybeAddErrorReaction', () => {
    describe('missing scope error', () => {
      beforeEach(async () => {
        addReaction.mockImplementation(() => {
          throw new SlackCodedError(ErrorCode.PlatformError, 'already_reacted')
        })
      })

      it('should not throw error', async () => {
        await client.maybeAddErrorReaction({ts: '123'})
      })
    })

    describe('missing scope error', () => {
      beforeEach(async () => {
        addReaction.mockImplementation(() => {
          throw new SlackCodedError(ErrorCode.PlatformError, 'missing_scope')
        })
      })

      it('should throw error', () => {
        expect(async () =>
          client.maybeAddErrorReaction({ts: '123'})
        ).rejects.toThrow(MissingScopeError)
      })
    })

    describe('success', () => {
      beforeEach(async () => {
        await client.maybeAddErrorReaction({ts: '123'})
      })

      it('should add reaction', () => {
        expect(addReaction).toHaveBeenCalledWith({
          channel: 'CHANNEL',
          name: 'REACTION',
          timestamp: '123'
        })
      })
    })
  })
})

class SlackCodedError extends Error implements CodedError {
  data: unknown

  constructor(
    readonly code: ErrorCode,
    error: string
  ) {
    super(error)

    this.data = {ok: false, error}
  }
}
