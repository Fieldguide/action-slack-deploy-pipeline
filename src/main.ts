import {getInput, setFailed, setOutput} from '@actions/core'
import {getSummary} from './github/summary'
import {SlackClient} from './slack/client'

async function run(): Promise<void> {
  try {
    const slackToken = process.env.SLACK_TOKEN

    if (!slackToken) {
      throw new Error('SLACK_TOKEN environment variable required')
    }

    const slack = new SlackClient(slackToken)
    const channel = getInput('channel', {required: true})

    // context.payload.sender?.avatar_url

    const summary = getSummary()
    const ts = await slack.postMessage({
      channel,
      text: summary.text,
      blocks: [summary.block]
    })

    setOutput('ts', ts)
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error))
  }
}

run()
