import {getInput, info} from '@actions/core'
import {intervalToDuration} from 'date-fns'
import {getStageMessage} from './github/stage'
import {getSummaryMessage} from './github/summary'
import {isSuccessful} from './github/types'
import {SlackClient} from './slack/client'
import {dateFromTs} from './slack/utils'

interface Dependencies {
  slack: SlackClient
}

/**
 * @returns message timestamp ID
 */
export async function postMessage({
  slack
}: Dependencies): Promise<string | undefined> {
  const threadTs = getInput('thread_ts')

  if (!threadTs) {
    info('Posting summary message')

    return slack.postMessage(getSummaryMessage())
  }

  const duration = intervalToDuration({
    start: dateFromTs(threadTs),
    end: new Date()
  })
  const status = getInput('status', {required: true})
  const conclusion = 'true' === getInput('conclusion')

  info(`Posting stage message in thread: ${threadTs}`)
  await slack.postMessage({
    ...getStageMessage({status, duration}),
    thread_ts: threadTs
  })

  if (conclusion || !isSuccessful(status)) {
    info(`Updating summary message: ${status}`)
    await slack.updateMessage({
      ...getSummaryMessage({status, duration}),
      ts: threadTs
    })
  }
}
