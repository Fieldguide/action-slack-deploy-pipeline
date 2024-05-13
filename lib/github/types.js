'use strict'
Object.defineProperty(exports, '__esModule', {value: true})
exports.isCompletedJobStep = exports.isSuccessful = exports.JobStatus = void 0
/**
 * @see https://docs.github.com/en/actions/learn-github-actions/contexts#job-context
 */
var JobStatus
;(function (JobStatus) {
  JobStatus['Success'] = 'success'
  JobStatus['Failure'] = 'failure'
  JobStatus['Cancelled'] = 'cancelled'
})((JobStatus = exports.JobStatus || (exports.JobStatus = {})))
function isSuccessful(status) {
  return JobStatus.Success === status
}
exports.isSuccessful = isSuccessful
function isCompletedJobStep(step) {
  return Boolean(step.completed_at) && 'skipped' !== step.conclusion
}
exports.isCompletedJobStep = isCompletedJobStep
