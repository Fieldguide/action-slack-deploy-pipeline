import {CodedError} from '@slack/web-api'

export function isCodedError(error: unknown): error is CodedError {
  return (
    error instanceof Error && 'string' === typeof (error as CodedError).code
  )
}
