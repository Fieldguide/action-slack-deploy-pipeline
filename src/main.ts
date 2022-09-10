import {debug, getInput, info, setFailed, setOutput} from '@actions/core'
import {context, getOctokit} from '@actions/github'
import {intervalToDuration} from 'date-fns'
import {getStageMessage} from './github/stage'
import {getSummaryMessage} from './github/summary'
import {getEnv} from './input'
import {SlackClient} from './slack/client'
import {dateFromTs} from './slack/utils'

async function run(): Promise<void> {
  try {
    const botToken = getEnv('SLACK_DEPLOY_BOT_TOKEN')
    const channel = getEnv('SLACK_DEPLOY_CHANNEL')

    const githubToken = getInput('github_token', {required: true})
    const githubClient = getOctokit(githubToken)

    debug(JSON.stringify(context, null, 2))

    debug('listJobsForWorkflowRun')
    const jobs = await githubClient.rest.actions.listJobsForWorkflowRun({
      ...context.repo,
      run_id: context.runId
    })
    debug(JSON.stringify(jobs, null, 2))

    debug('listJobsForWorkflowRunAttempt')
    const attemptJobs =
      await githubClient.rest.actions.listJobsForWorkflowRunAttempt({
        ...context.repo,
        run_id: context.runId,
        attempt_number: context.runNumber
      })
    debug(JSON.stringify(attemptJobs, null, 2))

    const slack = new SlackClient(botToken)
    const threadTs = getInput('thread_ts')

    if (threadTs) {
      const duration = intervalToDuration({
        start: dateFromTs(threadTs),
        end: new Date()
      })
      const status = getInput('status', {required: true})

      info(`Posting message in thread: ${threadTs}`)
      await slack.postMessage({
        ...getStageMessage({status, duration}),
        channel,
        thread_ts: threadTs
      })

      info(`Updating summary message: ${threadTs}`)
      await slack.updateMessage({
        ...getSummaryMessage({status, duration}),
        channel,
        ts: threadTs
      })
    } else {
      info('Posting message')
      const ts = await slack.postMessage({
        ...getSummaryMessage(),
        channel
      })

      setOutput('ts', ts)
    }
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error))

    if (error instanceof Error && error.stack) {
      debug(error.stack)
    }
  }
}

run()
