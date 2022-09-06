import {getInput, info, setFailed, setOutput} from '@actions/core'
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
        thread_ts: threadTs,
        unfurl_links: false
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
        channel,
        unfurl_links: false
      })

      setOutput('ts', ts)
    }
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error))
  }
}

run()
