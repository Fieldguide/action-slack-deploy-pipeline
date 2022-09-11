import {getInput, info} from '@actions/core'
import {getStageMessage} from './github/stage'
import {getSummaryMessage} from './github/summary'
import {GitHubClient, isSuccessful} from './github/types'
import {SlackClient} from './slack/client'

/**
 * Post an initial summary message or progress reply when `thread_ts` input is set.
 *
 * Conditionally updates initial message when `conclusion` is set or stage is unsuccessful.
 *
 * @returns message timestamp ID
 */
export async function postMessage(
  github: GitHubClient,
  slack: SlackClient
): Promise<string | undefined> {
  const threadTs = getInput('thread_ts')

  if (!threadTs) {
    info('Posting summary message')

    return slack.postMessage(getSummaryMessage())
  }

  const status = getInput('status', {required: true})
  const now = new Date()
  const stageMessage = await getStageMessage({github, status, now})

  info(`Posting stage message in thread: ${threadTs}`)
  await slack.postMessage({
    ...stageMessage,
    thread_ts: threadTs
  })

  const conclusion = 'true' === getInput('conclusion')

  if (conclusion || !isSuccessful(status)) {
    info(`Updating summary message: ${status}`)
    await slack.updateMessage({
      ...getSummaryMessage({status, threadTs, now}),
      ts: threadTs
    })
  }
}
