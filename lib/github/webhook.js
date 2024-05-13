'use strict'
Object.defineProperty(exports, '__esModule', {value: true})
exports.senderFromPayload =
  exports.assertUnsupportedEvent =
  exports.UnsupportedEventError =
  exports.isSupportedEvent =
  exports.isWorkflowDispatchEvent =
  exports.isScheduleEvent =
  exports.isReleaseEvent =
  exports.isPushEvent =
  exports.isPullRequestEvent =
  exports.SUPPORTED_EVENT_NAMES =
    void 0
exports.SUPPORTED_EVENT_NAMES = [
  'pull_request',
  'push',
  'release',
  'schedule',
  'workflow_dispatch'
]
/**
 * @see https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#pull_request
 */
function isPullRequestEvent(context) {
  return 'pull_request' === context.eventName
}
exports.isPullRequestEvent = isPullRequestEvent
/**
 * @see https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#push
 */
function isPushEvent(context) {
  return 'push' === context.eventName
}
exports.isPushEvent = isPushEvent
/**
 * @see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#release
 */
function isReleaseEvent(context) {
  return 'release' === context.eventName
}
exports.isReleaseEvent = isReleaseEvent
/**
 * @see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule
 */
function isScheduleEvent(context) {
  return 'schedule' === context.eventName
}
exports.isScheduleEvent = isScheduleEvent
/**
 * @see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch
 */
function isWorkflowDispatchEvent(context) {
  return 'workflow_dispatch' === context.eventName
}
exports.isWorkflowDispatchEvent = isWorkflowDispatchEvent
function isSupportedEvent(context) {
  return exports.SUPPORTED_EVENT_NAMES.includes(context.eventName)
}
exports.isSupportedEvent = isSupportedEvent
class UnsupportedEventError extends Error {
  constructor(context) {
    const supportedEvents = exports.SUPPORTED_EVENT_NAMES.join(', ')
    super(
      `Unsupported "${context.eventName}" event (currently supported events include: ${supportedEvents})`
    )
  }
}
exports.UnsupportedEventError = UnsupportedEventError
function assertUnsupportedEvent(context) {
  throw new UnsupportedEventError(context)
}
exports.assertUnsupportedEvent = assertUnsupportedEvent
function senderFromPayload({sender}) {
  if (
    (sender === null || sender === void 0 ? void 0 : sender.login) &&
    sender.avatar_url
  ) {
    return sender
  }
}
exports.senderFromPayload = senderFromPayload
