import {getInput, info} from '@actions/core'
import type {GetMessageAuthor} from './getMessageAuthorFactory'
import {getStageMessage} from './github/getStageMessage'
import {getSummaryMessage} from './github/getSummaryMessage'
import {OctokitClient, isSuccessfulStatus} from './github/types'
import type {SlackClient} from './slack/SlackClient'

interface Dependencies {
  octokit: OctokitClient
  slack: SlackClient
  getMessageAuthor: GetMessageAuthor
}

/**
 * Post an initial summary message or progress reply when `thread_ts` input is set.
 *
 * Conditionally updates initial message when `conclusion` is set or stage is unsuccessful.
 *
 * @returns message timestamp ID
 */
export async function postMessage({
  octokit,
  slack,
  getMessageAuthor
}: Dependencies): Promise<string | null> {
  const threadTs = getInput('thread_ts')

  if (!threadTs) {
    info('Posting summary message')
    const message = await getSummaryMessage({octokit, getMessageAuthor})

    return slack.postMessage(message)
  }

  const status = getInput('status', {required: true})
  const now = new Date()
  const {successful, ...stageMessage} = await getStageMessage({
    octokit,
    status,
    now,
    getMessageAuthor
  })

  info(`Posting stage message in thread: ${threadTs}`)
  await slack.postMessage({
    ...stageMessage,
    reply_broadcast: !successful,
    thread_ts: threadTs
  })

  const isConclusion = 'true' === getInput('conclusion')
  const isSuccessful = isSuccessfulStatus(status)

  if (isConclusion || !isSuccessful) {
    info(`Updating summary message: ${status}`)
    const summaryMessage = await getSummaryMessage({
      octokit,
      options: {status, threadTs, now},
      getMessageAuthor
    })

    await slack.updateMessage({
      ...summaryMessage,
      ts: threadTs
    })
  }

  if (!isSuccessful) {
    await slack.maybeAddErrorReaction({ts: threadTs})
  }

  return null
}
