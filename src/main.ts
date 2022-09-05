import {getInput, setFailed, setOutput} from '@actions/core'
import {getSummary} from './github/summary'
import {getEnv} from './input'
import {SlackClient} from './slack/client'

async function run(): Promise<void> {
  try {
    const botToken = getEnv('SLACK_DEPLOY_BOT_TOKEN')
    const channel = getEnv('SLACK_DEPLOY_CHANNEL')
    const slack = new SlackClient(botToken)

    const threadTs = getInput('thread_ts')

    const summary = getSummary()
    const ts = await slack.postMessage({
      ...summary,
      channel,
      unfurl_links: false
    })

    setOutput('ts', ts)
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error))
  }
}

run()
