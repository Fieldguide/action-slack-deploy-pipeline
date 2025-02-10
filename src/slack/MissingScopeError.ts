import {EnvironmentVariable} from '../input'
import {isCodedPlatformError} from './utils/isCodedPlatformError'

export class MissingScopeError extends Error {
  static fromScope(scope: string): MissingScopeError {
    return new MissingScopeError(
      `${EnvironmentVariable.SlackBotToken} does not include "${scope}" OAuth scope.`
    )
  }
}

export function isMissingScopeError(error: unknown): boolean {
  return isCodedPlatformError(error) && 'missing_scope' === error.data.error
}
