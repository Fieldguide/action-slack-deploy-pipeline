'use strict'
Object.defineProperty(exports, '__esModule', {value: true})
exports.getEnv = exports.EnvironmentVariable = void 0
var EnvironmentVariable
;(function (EnvironmentVariable) {
  EnvironmentVariable['SlackBotToken'] = 'SLACK_DEPLOY_BOT_TOKEN'
  EnvironmentVariable['SlackChannel'] = 'SLACK_DEPLOY_CHANNEL'
})(
  (EnvironmentVariable =
    exports.EnvironmentVariable || (exports.EnvironmentVariable = {}))
)
/**
 * Get the value of a required environment variable.
 *
 * The value is trimmed of whitespace.
 */
function getEnv(name) {
  var _a
  const env = String(
    (_a = process.env[name]) !== null && _a !== void 0 ? _a : ''
  ).trim()
  if (!env) {
    throw new Error(`${name} environment variable required`)
  }
  return env
}
exports.getEnv = getEnv
