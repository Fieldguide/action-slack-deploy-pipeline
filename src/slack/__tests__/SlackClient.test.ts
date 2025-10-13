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
  let client: SlackClient

  beforeEach(() => {
    jest.resetAllMocks()

    client = new SlackClient({
      token: 'TOKEN',
      channel: 'CHANNEL',
      errorReaction: 'REACTION'
    })
  })

  describe('getRealUsers', () => {
    let users: Member[] | null

    beforeEach(() => {
      client = new SlackClient({token: 'TOKEN'}) // inherently assert optional dependencies
    })

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
              createMockMember({id: 'U1'}),
              createMockMember({id: 'U2', is_bot: false}),
              createMockMember({id: 'U3', is_bot: true}),
              createMockMember({id: 'USLACKBOT', is_bot: false}),
              createMockMember({id: 'U4', profile: undefined})
            ]
          })
        )

        users = await client.getRealUsers()
      })

      it('should filter real users', () => {
        expect(users).toStrictEqual([
          expect.objectContaining({id: 'U1'}),
          expect.objectContaining({id: 'U2', is_bot: false})
        ])
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

/**
 * Create a mock Slack user with a defined `profile`.
 */
function createMockMember(overrides: Member): Member {
  return {
    profile: {
      display_name: 'John Doe',
      image_48: 'https://example.com/image.png'
    },
    ...overrides
  }
}
