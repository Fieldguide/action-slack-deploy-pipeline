import {beforeEach, describe, expect, it, jest} from '@jest/globals'
import {WebAPIPlatformError} from '@slack/web-api'
import {MissingScopeError} from '../MissingScopeError'
import {SlackClient} from '../SlackClient'
import {Member} from '../types'

const listUsers = jest.fn()
const addReaction = jest.fn()
const constructWebClient = jest.fn()

// stub only the transport, preserving real error classes for `instanceof` narrowing
jest.mock('@slack/web-api', () => ({
  ...jest.requireActual<object>('@slack/web-api'),
  WebClient: class MockWebClient {
    constructor(token: string, options: unknown) {
      constructWebClient(token, options)
    }
    on(): void {
      // noop
    }
    users = {
      list: listUsers
    }
    reactions = {
      add: addReaction
    }
  }
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

  describe('web client', () => {
    it('should bound request timeout and retries', () => {
      expect(constructWebClient).toHaveBeenCalledWith(
        'TOKEN',
        expect.objectContaining({
          timeout: 30000,
          retryConfig: expect.objectContaining({
            retries: 3,
            maxRetryTime: 120000
          })
        })
      )
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
          throw platformError('missing_scope')
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
          throw platformError('already_reacted')
        })
      })

      it('should not throw error', async () => {
        await client.maybeAddErrorReaction({ts: '123'})
      })
    })

    describe('missing scope error', () => {
      beforeEach(async () => {
        addReaction.mockImplementation(() => {
          throw platformError('missing_scope')
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

function platformError(error: string): WebAPIPlatformError {
  return new WebAPIPlatformError({ok: false, error})
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
