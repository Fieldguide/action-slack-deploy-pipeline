import {CodedError, ErrorCode, WebAPIPlatformError} from '@slack/web-api'

export function isMissingScopeError(
  error: unknown
): error is WebAPIPlatformError {
  return (
    isCodedError(error) &&
    ErrorCode.PlatformError === error.code &&
    'missing_scope' === (error as WebAPIPlatformError).data.error
  )
}

export function isCodedError(error: unknown): error is CodedError {
  return (
    error instanceof Error && 'string' === typeof (error as CodedError).code
  )
}
