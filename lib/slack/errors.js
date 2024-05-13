'use strict'
Object.defineProperty(exports, '__esModule', {value: true})
exports.isCodedError = exports.isMissingScopeError = void 0
const web_api_1 = require('@slack/web-api')
function isMissingScopeError(error) {
  return (
    isCodedError(error) &&
    web_api_1.ErrorCode.PlatformError === error.code &&
    'missing_scope' === error.data.error
  )
}
exports.isMissingScopeError = isMissingScopeError
function isCodedError(error) {
  return error instanceof Error && 'string' === typeof error.code
}
exports.isCodedError = isCodedError
