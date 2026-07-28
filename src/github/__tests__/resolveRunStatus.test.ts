import {describe, expect, it} from '@jest/globals'
import {resolveRunStatus} from '../resolveRunStatus'
import type {WorkflowJob} from '../types'

describe('resolveRunStatus', () => {
  describe('successful job status', () => {
    it('should remain successful without jobs', () => {
      expect(resolveRunStatus('success', [])).toBe('success')
    })

    it('should remain successful with successful jobs', () => {
      expect(
        resolveRunStatus('success', [
          createJob('JOB 1', 'completed', 'success'),
          createJob('JOB 2', 'completed', 'success')
        ])
      ).toBe('success')
    })

    it('should derive failure from failed job', () => {
      expect(
        resolveRunStatus('success', [
          createJob('JOB 1', 'completed', 'success'),
          createJob('build-lambda', 'completed', 'failure')
        ])
      ).toBe('failure')
    })

    it('should derive failure from timed out job', () => {
      expect(
        resolveRunStatus('success', [
          createJob('build-lambda', 'completed', 'timed_out')
        ])
      ).toBe('failure')
    })

    it('should derive cancellation from cancelled job', () => {
      expect(
        resolveRunStatus('success', [
          createJob('build-lambda', 'completed', 'cancelled')
        ])
      ).toBe('cancelled')
    })

    it('should favor failure over cancellation', () => {
      expect(
        resolveRunStatus('success', [
          createJob('JOB 1', 'completed', 'cancelled'),
          createJob('JOB 2', 'completed', 'failure')
        ])
      ).toBe('failure')
    })

    // an upstream failure and an unmet `if` condition are indistinguishable
    it('should ignore skipped jobs', () => {
      expect(
        resolveRunStatus('success', [
          createJob('deploy-staging', 'completed', 'skipped'),
          createJob('deploy-production', 'completed', 'skipped')
        ])
      ).toBe('success')
    })

    it('should ignore incomplete jobs', () => {
      expect(
        resolveRunStatus('success', [
          createJob('JOB 1', 'in_progress', null),
          createJob('JOB 2', 'queued', null)
        ])
      ).toBe('success')
    })

    it('should ignore inconclusive job conclusions', () => {
      expect(
        resolveRunStatus('success', [
          createJob('JOB 1', 'completed', 'neutral'),
          createJob('JOB 2', 'completed', 'action_required')
        ])
      ).toBe('success')
    })
  })

  describe('unsuccessful job status', () => {
    it('should remain failed', () => {
      expect(
        resolveRunStatus('failure', [
          createJob('JOB 1', 'completed', 'success')
        ])
      ).toBe('failure')
    })

    it('should remain cancelled despite failed job', () => {
      expect(
        resolveRunStatus('cancelled', [
          createJob('JOB 1', 'completed', 'failure')
        ])
      ).toBe('cancelled')
    })
  })
})

function createJob(
  name: string,
  status: WorkflowJob['status'],
  conclusion: WorkflowJob['conclusion']
): WorkflowJob {
  return {name, status, conclusion} as WorkflowJob
}
