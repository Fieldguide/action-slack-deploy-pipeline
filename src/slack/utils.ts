/**
 * Convert the Slack message timestamp ID to a Date object.
 */
export function dateFromTs(ts: string): Date {
  return new Date(1000 * Number(ts))
}
