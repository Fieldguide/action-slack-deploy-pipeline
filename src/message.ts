import {getInput, info} from '@actions/core'
import {computeStageDuration, durationFromTs} from './github/duration'
import {getStageMessage} from './github/stage'
import {getSummaryMessage} from './github/summary'
import {GitHubClient, isSuccessful} from './github/types'
import {SlackClient} from './slack/client'

interface Dependencies {
  github: GitHubClient
  slack: SlackClient
}

/**
 * @returns message timestamp ID
 */
export async function postMessage({
  github,
  slack
}: Dependencies): Promise<string | undefined> {
  const threadTs = getInput('thread_ts')

  if (!threadTs) {
    info('Posting summary message')

    return slack.postMessage(getSummaryMessage())
  }

  const status = getInput('status', {required: true})

  const now = new Date()
  const duration = await computeStageDuration(github, now)

  info(`Posting stage message in thread: ${threadTs}`)
  await slack.postMessage({
    ...getStageMessage({status, duration}),
    thread_ts: threadTs
  })

  const conclusion = 'true' === getInput('conclusion')

  if (conclusion || !isSuccessful(status)) {
    const totalDuration = durationFromTs(threadTs, now)

    info(`Updating summary message: ${status}`)
    await slack.updateMessage({
      ...getSummaryMessage({status, duration: totalDuration}),
      ts: threadTs
    })
  }
}
