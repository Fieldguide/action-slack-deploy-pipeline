import {CodedError, ErrorCode, WebAPIHTTPError} from '@slack/web-api'
import {isCodedError} from './isCodedError'

/**
 * Lowest HTTP status code treated as a Slack-side failure.
 */
const SERVER_ERROR_STATUS = 500

/**
 * Return true if `error` reflects a transient connectivity failure rather than
 * a misconfigured app or invalid request.
 */
export function isTransientError(error: unknown): boolean {
  if (!isCodedError(error)) {
    return false
  }

  if (isHttpError(error)) {
    return error.statusCode >= SERVER_ERROR_STATUS
  }

  return (
    ErrorCode.RequestError === error.code ||
    ErrorCode.RateLimitedError === error.code
  )
}

function isHttpError(error: CodedError): error is WebAPIHTTPError {
  return (
    ErrorCode.HTTPError === error.code &&
    'number' === typeof (error as WebAPIHTTPError).statusCode
  )
}
