import {CodedError, ErrorCode, WebAPIPlatformError} from '@slack/web-api'
import {EnvironmentVariable} from '../input'

export class MissingScopeError extends Error {
  static fromScope(scope: string): MissingScopeError {
    return new MissingScopeError(
      `${EnvironmentVariable.SlackBotToken} does not include "${scope}" OAuth scope.`
    )
  }
}

export function isMissingScopeError(
  error: unknown
): error is WebAPIPlatformError {
  return (
    isCodedError(error) &&
    ErrorCode.PlatformError === error.code &&
    'missing_scope' === (error as WebAPIPlatformError).data.error
  )
}

function isCodedError(error: unknown): error is CodedError {
  return (
    error instanceof Error && 'string' === typeof (error as CodedError).code
  )
}
