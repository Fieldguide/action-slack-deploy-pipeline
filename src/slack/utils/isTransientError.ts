import {
  WebAPIHTTPError,
  WebAPIRateLimitedError,
  WebAPIRequestError
} from '@slack/web-api'

/**
 * Lowest HTTP status code treated as a Slack-side failure.
 */
const SERVER_ERROR_STATUS = 500

/**
 * Return true if `error` reflects a transient connectivity failure rather than
 * a misconfigured app or invalid request.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof WebAPIHTTPError) {
    return error.statusCode >= SERVER_ERROR_STATUS
  }

  return (
    error instanceof WebAPIRequestError ||
    error instanceof WebAPIRateLimitedError
  )
}
