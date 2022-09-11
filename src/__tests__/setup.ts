export default function setup(): void {
  process.env.GITHUB_REPOSITORY = 'namoscato/action-testing'
  process.env.SLACK_DEPLOY_BOT_TOKEN = 'abc123'
  process.env.SLACK_DEPLOY_CHANNEL = 'C0246'
}
