import {getInput, info, setFailed, setOutput} from '@actions/core'
import {getStageMessage} from './github/stage'
import {getSummaryMessage} from './github/summary'
import {Message} from './github/types'
import {getEnv} from './input'
import {SlackClient} from './slack/client'

async function run(): Promise<void> {
  try {
    const botToken = getEnv('SLACK_DEPLOY_BOT_TOKEN')
    const channel = getEnv('SLACK_DEPLOY_CHANNEL')

    const slack = new SlackClient(botToken)

    const threadTs = getInput('thread_ts') || undefined
    let message: Message

    if (threadTs) {
      const status = getInput('status', {required: true})
      message = getStageMessage(status)
    } else {
      message = getSummaryMessage()
    }

    info(`Posting message${threadTs ? ` in thread: ${threadTs}` : ''}`)
    const ts = await slack.postMessage({
      ...message,
      channel,
      thread_ts: threadTs,
      unfurl_links: false
    })

    if (!threadTs) {
      // avoid exposing reply's `ts` value
      setOutput('ts', ts)
    }
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error))
  }
}

run()
