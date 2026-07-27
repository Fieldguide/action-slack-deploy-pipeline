import {getInput, info, warning} from '@actions/core'
import {getStageMessage} from '../github/getStageMessage'
import {getSummaryMessage} from '../github/getSummaryMessage'
import {OctokitClient, isSuccessfulStatus} from '../github/types'
import type {SlackClient} from '../slack/SlackClient'
import type {GetMessageAuthor} from './getMessageAuthorFactory'

interface Dependencies {
  octokit: OctokitClient
  slack: SlackClient
  getMessageAuthor: GetMessageAuthor
}

/**
 * Default `thread_ts` input value, denoting the initial summary message.
 *
 * The runner materializes every declared input, so an omitted `thread_ts` and
 * one set to an empty string are otherwise indistinguishable. Declaring a
 * default in `action.yml` separates them: the default only applies when the
 * caller omits the input entirely.
 *
 * @see https://github.com/actions/runner/blob/main/src/Runner.Worker/ActionRunner.cs
 */
export const SUMMARY_THREAD_TS = 'summary'

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
  const threadTs = getThreadTs()

  if (null === threadTs) {
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

/**
 * @returns thread timestamp ID, or null to post a summary message
 */
function getThreadTs(): string | null {
  const threadTs = getInput('thread_ts')

  if (SUMMARY_THREAD_TS === threadTs) {
    return null
  }

  if (!threadTs) {
    warning(
      'Empty thread_ts input; posting an unthreaded summary message. An earlier step likely failed to post the summary.'
    )

    return null
  }

  return threadTs
}
