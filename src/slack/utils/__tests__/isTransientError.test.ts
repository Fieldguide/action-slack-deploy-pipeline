import {describe, expect, it} from '@jest/globals'
import {CodedError, ErrorCode} from '@slack/web-api'
import {MissingScopeError} from '../../MissingScopeError'
import {isTransientError} from '../isTransientError'

describe('isTransientError', () => {
  describe('transient', () => {
    it.each([
      ['request error', createCodedError(ErrorCode.RequestError)],
      ['rate limited error', createCodedError(ErrorCode.RateLimitedError)],
      ['server error', createCodedError(ErrorCode.HTTPError, {statusCode: 503})]
    ])('should return true for %s', (_name, error) => {
      expect(isTransientError(error)).toBe(true)
    })
  })

  describe('actionable', () => {
    it.each([
      ['platform error', createCodedError(ErrorCode.PlatformError)],
      [
        'client error',
        createCodedError(ErrorCode.HTTPError, {statusCode: 404})
      ],
      ['http error without a status', createCodedError(ErrorCode.HTTPError)],
      ['missing scope error', MissingScopeError.fromScope('chat:write')],
      ['generic error', new Error('Response timestamp ID undefined')],
      ['non-error', 'boom']
    ])('should return false for %s', (_name, error) => {
      expect(isTransientError(error)).toBe(false)
    })
  })
})

function createCodedError(
  code: ErrorCode,
  properties: Record<string, unknown> = {}
): CodedError {
  return Object.assign(new Error(code), {code}, properties)
}
