import {ErrorCode, WebAPIPlatformError} from '@slack/web-api'
import {isCodedError} from './isCodedError'

export function isCodedPlatformError(
  error: unknown
): error is WebAPIPlatformError {
  return isCodedError(error) && ErrorCode.PlatformError === error.code
}
