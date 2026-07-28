import {describe, expect, it} from '@jest/globals'
import {
  WebAPIHTTPError,
  WebAPIPlatformError,
  WebAPIRateLimitedError,
  WebAPIRequestError
} from '@slack/web-api'
import {MissingScopeError} from '../../MissingScopeError'
import {isTransientError} from '../isTransientError'

describe('isTransientError', () => {
  describe('transient', () => {
    it.each([
      ['request error', new WebAPIRequestError(new Error('fetch failed'))],
      ['rate limited error', new WebAPIRateLimitedError(30)],
      ['server error', httpError(503)]
    ])('should return true for %s', (_name, error) => {
      expect(isTransientError(error)).toBe(true)
    })
  })

  describe('actionable', () => {
    it.each([
      ['platform error', platformError('channel_not_found')],
      ['client error', httpError(404)],
      ['missing scope error', MissingScopeError.fromScope('chat:write')],
      ['generic error', new Error('Response timestamp ID undefined')],
      ['non-error', 'boom']
    ])('should return false for %s', (_name, error) => {
      expect(isTransientError(error)).toBe(false)
    })
  })
})

function httpError(statusCode: number): WebAPIHTTPError {
  return new WebAPIHTTPError(statusCode, 'STATUS MESSAGE', {})
}

function platformError(error: string): WebAPIPlatformError {
  return new WebAPIPlatformError({ok: false, error})
}
