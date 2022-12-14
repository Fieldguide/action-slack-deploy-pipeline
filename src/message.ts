import {getInput, info} from '@actions/core'
import {getStageMessage} from './github/stage'
import {getSummaryMessage} from './github/summary'
import {OctokitClient, isSuccessful} from './github/types'
import {SlackClient} from './slack/client'

/**
 * Post an initial summary message or progress reply when `thread_ts` input is set.
 *
 * Conditionally updates initial message when `conclusion` is set or stage is unsuccessful.
 *
 * @returns message timestamp ID
 */
export async function postMessage(
  octokit: OctokitClient,
  slack: SlackClient
): Promise<string | undefined> {
  const threadTs = getInput('thread_ts')

  if (!threadTs) {
    info('Posting summary message')
    const message = await getSummaryMessage(octokit)

    return slack.postMessage(message)
  }

  const status = getInput('status', {required: true})
  const now = new Date()
  const stageMessage = await getStageMessage({octokit, status, now})

  info(`Posting stage message in thread: ${threadTs}`)
  await slack.postMessage({
    ...stageMessage,
    thread_ts: threadTs
  })

  const conclusion = 'true' === getInput('conclusion')

  if (conclusion || !isSuccessful(status)) {
    info(`Updating summary message: ${status}`)
    const message = await getSummaryMessage(octokit, {status, threadTs, now})

    await slack.updateMessage({
      ...message,
      ts: threadTs
    })
  }
}
