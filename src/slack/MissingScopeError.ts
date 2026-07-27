import {WebAPIPlatformError} from '@slack/web-api'
import {EnvironmentVariable} from '../utils/input'

export class MissingScopeError extends Error {
  static fromScope(scope: string): MissingScopeError {
    return new MissingScopeError(
      `${EnvironmentVariable.SlackBotToken} does not include "${scope}" OAuth scope.`
    )
  }
}

export function isMissingScopeError(error: unknown): boolean {
  return (
    error instanceof WebAPIPlatformError && 'missing_scope' === error.data.error
  )
}
