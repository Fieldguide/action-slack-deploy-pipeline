/* eslint-disable @typescript-eslint/no-explicit-any */
import * as github from '@actions/github'
import {afterAll, beforeEach, describe, expect, it, jest} from '@jest/globals'
import {GitHubClient} from '../github/types'
import {postMessage} from '../message'
import {SlackClient} from '../slack/client'

describe('postMessage', () => {
  let githubClient: GitHubClient
  let slack: SlackClient
  let ts: string | undefined

  const OLD_CONTEXT = github.context
  const OLD_ENV = process.env

  beforeEach(() => {
    githubClient = {
      rest: {
        actions: {}
      }
    } as any

    slack = {
      postMessage: jest.fn(async () => 'TS'),
      updateMessage: jest.fn(async () => undefined)
    } as any

    jest.resetModules()

    process.env = {...OLD_ENV}
    process.env.GITHUB_REPOSITORY = 'namoscato/action-testing'

    github.context.workflow = 'Deploy App'
    github.context.eventName = OLD_CONTEXT.eventName
    github.context.payload = OLD_CONTEXT.payload

    jest.useFakeTimers().setSystemTime(new Date('2022-09-10T00:00:15.000Z'))
  })

  afterAll(() => {
    process.env = OLD_ENV

    github.context.eventName = OLD_CONTEXT.eventName
    github.context.payload = OLD_CONTEXT.payload
  })

  describe('first summary', () => {
    beforeEach(async () => {
      github.context.eventName = 'pull_request'
      github.context.payload = {
        pull_request: {
          title: 'PR-TITLE',
          number: 1,
          html_url: 'github.com/PR-1',
          head: {
            ref: 'my-pr'
          }
        },
        sender: {
          type: 'user',
          login: 'namoscato',
          avatar_url: 'github.com/namoscato'
        }
      }

      ts = await postMessage(githubClient, slack)
    })

    it('should post slack message', () => {
      expect(slack.postMessage).toHaveBeenCalledTimes(1)
      expect(slack.postMessage).toHaveBeenCalledWith({
        icon_url: 'github.com/namoscato',
        username: 'namoscato (via GitHub)',
        unfurl_links: false,
        text: 'Deploying action-testing: PR-TITLE (#1)',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: ':black_square_button: Deploying *action-testing*: <github.com/PR-1|PR-TITLE (#1)>'
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '<github.com/PR-1/checks|Deploy App>  ∙  my-pr'
              }
            ]
          }
        ]
      })
    })

    it('should return timestamp ID', () => {
      expect(ts).toStrictEqual('TS')
    })
  })

  describe('stage', () => {
    beforeEach(async () => {
      process.env.INPUT_THREAD_TS = '1662768000' // 2022-09-10T00:00:00.000Z

      github.context.eventName = 'push'
      github.context.job = 'JOB 2'
      github.context.sha = '05b16c3beb3a07dceaf6cf964d0be9eccbc026e8'
      github.context.payload = {
        head_commit: {
          message:
            'COMMIT-MESSAGE\n\nCo-authored-by: Nick <namoscato@users.noreply.github.com>',
          url: 'github.com/commit'
        },
        sender: {
          type: 'user',
          login: 'namoscato',
          avatar_url: 'github.com/namoscato'
        }
      }

      githubClient.rest.actions.listJobsForWorkflowRun = jest.fn(async () => ({
        data: {
          jobs: [
            {
              name: 'JOB 1',
              started_at: '2022-09-10T00:00:04.000Z',
              steps: [
                {
                  name: 'Post to Slack',
                  completed_at: '2022-09-10T00:00:05.000Z'
                }
              ]
            },
            {
              name: 'JOB 2',
              started_at: '2022-09-10T00:00:06.000Z',
              steps: [
                {
                  name: 'Run namoscato/action-slack-deploy-pipeline',
                  completed_at: null
                }
              ]
            }
          ]
        }
      })) as any
    })

    describe('intermediate success', () => {
      beforeEach(async () => {
        process.env.INPUT_STATUS = 'success'

        ts = await postMessage(githubClient, slack)
      })

      it('should post slack message', () => {
        expect(slack.postMessage).toHaveBeenCalledTimes(1)
        expect(slack.postMessage).toHaveBeenCalledWith({
          icon_url: 'github.com/namoscato',
          username: 'namoscato (via GitHub)',
          unfurl_links: false,
          text: 'Finished JOB 2',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: ':white_check_mark: Finished *JOB 2*'
              }
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '<https://github.com/namoscato/action-testing/commit/05b16c3beb3a07dceaf6cf964d0be9eccbc026e8/checks|Deploy App>  ∙  05b16c3  ∙  9 seconds' // from job.started_at = 00:06
                }
              ]
            }
          ],
          reply_broadcast: false,
          thread_ts: '1662768000' // 2022-09-10T00:00:00.000Z
        })
      })

      it('should not update summary message', () => {
        expect(slack.updateMessage).not.toHaveBeenCalled()
      })

      it('should not return timestamp ID', () => {
        expect(ts).toBeUndefined()
      })
    })

    describe('intermediate cancelled', () => {
      beforeEach(async () => {
        process.env.INPUT_STATUS = 'cancelled'

        ts = await postMessage(githubClient, slack)
      })

      it('should post slack message', () => {
        expect(slack.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Cancelled JOB 2',
            blocks: expect.arrayContaining([
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: ':no_entry_sign: Cancelled *JOB 2*'
                }
              }
            ]),
            reply_broadcast: true
          })
        )
      })

      it('should update summary message', () => {
        expect(slack.updateMessage).toHaveBeenCalledTimes(1)
        expect(slack.updateMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Cancelled deploying action-testing: COMMIT-MESSAGE',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: ':no_entry_sign: Cancelled deploying *action-testing*: <github.com/commit|COMMIT-MESSAGE>'
                }
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: '<https://github.com/namoscato/action-testing/commit/05b16c3beb3a07dceaf6cf964d0be9eccbc026e8/checks|Deploy App>  ∙  05b16c3  ∙  15 seconds'
                  }
                ]
              }
            ],
            ts: '1662768000' // 2022-09-10T00:00:00.000Z
          })
        )
      })
    })

    describe('conclusion success', () => {
      beforeEach(async () => {
        process.env.INPUT_STATUS = 'success'
        process.env.INPUT_CONCLUSION = 'true'

        ts = await postMessage(githubClient, slack)
      })

      it('should post slack message', () => {
        expect(slack.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Finished JOB 2',
            reply_broadcast: false
          })
        )
      })

      it('should update summary message', () => {
        expect(slack.updateMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Deployed action-testing: COMMIT-MESSAGE',
            blocks: expect.arrayContaining([
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: '<https://github.com/namoscato/action-testing/commit/05b16c3beb3a07dceaf6cf964d0be9eccbc026e8/checks|Deploy App>  ∙  05b16c3  ∙  15 seconds'
                  }
                ]
              }
            ]),
            ts: '1662768000' // 2022-09-10T00:00:00.000Z
          })
        )
      })
    })

    describe('conclusion failed', () => {
      beforeEach(async () => {
        process.env.INPUT_STATUS = 'failure'
        process.env.INPUT_CONCLUSION = 'true'

        ts = await postMessage(githubClient, slack)
      })

      it('should post slack message', () => {
        expect(slack.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Failed JOB 2',
            reply_broadcast: true
          })
        )
      })

      it('should update summary message', () => {
        expect(slack.updateMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Failed deploying action-testing: COMMIT-MESSAGE'
          })
        )
      })
    })

    describe('multiple slack steps in job', () => {
      beforeEach(async () => {
        githubClient.rest.actions.listJobsForWorkflowRun = jest.fn(
          async () => ({
            data: {
              jobs: [
                {
                  name: 'JOB 2',
                  started_at: '2022-09-10T00:00:04.000Z',
                  steps: [
                    {
                      name: 'Post to Slack',
                      completed_at: '2022-09-10T00:00:05.000Z'
                    },
                    {
                      name: 'Run namoscato/action-slack-deploy-pipeline',
                      completed_at: null
                    }
                  ]
                }
              ]
            }
          })
        ) as any

        process.env.INPUT_STATUS = 'success'

        ts = await postMessage(githubClient, slack)
      })

      it('should post slack message', () => {
        expect(slack.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Finished JOB 2',
            blocks: expect.arrayContaining([
              {
                type: 'context',
                elements: [
                  {
                    text: '<https://github.com/namoscato/action-testing/commit/05b16c3beb3a07dceaf6cf964d0be9eccbc026e8/checks|Deploy App>  ∙  05b16c3  ∙  10 seconds', // from step.completed_at = 00:05
                    type: 'mrkdwn'
                  }
                ]
              }
            ])
          })
        )
      })
    })

    describe('0 second duration', () => {
      beforeEach(async () => {
        jest.useFakeTimers().setSystemTime(new Date('2022-09-10T00:00:06.000Z')) // same as job.started_at = 00:06

        process.env.INPUT_STATUS = 'success'

        ts = await postMessage(githubClient, slack)
      })

      it('should post slack message', () => {
        expect(slack.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Finished JOB 2',
            blocks: expect.arrayContaining([
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: '<https://github.com/namoscato/action-testing/commit/05b16c3beb3a07dceaf6cf964d0be9eccbc026e8/checks|Deploy App>  ∙  05b16c3  ∙  0 seconds'
                  }
                ]
              }
            ])
          })
        )
      })
    })
  })
})
