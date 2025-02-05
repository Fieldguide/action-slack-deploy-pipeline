import {CodedError, ErrorCode, WebAPIPlatformError} from '@slack/web-api'

export function isCodedPlatformError(
  error: unknown
): error is WebAPIPlatformError {
  return isCodedError(error) && ErrorCode.PlatformError === error.code
}

function isCodedError(error: unknown): error is CodedError {
  return (
    error instanceof Error && 'string' === typeof (error as CodedError).code
  )
}
