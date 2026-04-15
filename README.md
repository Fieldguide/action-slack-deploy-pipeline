[![ci](https://github.com/Fieldguide/action-slack-deploy-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/Fieldguide/action-slack-deploy-pipeline/actions/workflows/ci.yml)

# Slack Deploy Pipeline Notifications

Post [GitHub Action](https://github.com/features/actions) deploy workflow progress notifications to [Slack](https://slack.com/).

<br />

<img width="524" alt="Slack Deploy Pipeline Notifications example thread" src="https://user-images.githubusercontent.com/847532/230737887-1d18a062-af7f-4c7f-a78c-e604fc9803c2.jpg">

## Features

- Posts summary message at beginning of the deploy workflow, surfacing commit message and author
- Maps GitHub actor to Slack user by full name or mapping, mentioning them in the summary message
- Threads intermediate stage completions, sending unexpected failures back to the channel
- Adds summary message reaction to unsuccessful jobs (useful with [Reacji Channeler](https://reacji-channeler.builtbyslack.com/))
- Updates summary message with workflow duration at its conclusion
- Supports `pull_request`, `push`, `release`, `schedule`, and `workflow_dispatch` [event types](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)

## Setup

1. [Create a Slack App](https://api.slack.com/apps) for your workspace
1. Under **OAuth & Permissions**, add Bot Token Scopes:
   - [`chat:write`](https://api.slack.com/scopes/chat:write) to post messages
   - [`chat:write.customize`](https://api.slack.com/scopes/chat:write.customize) to customize messages with GitHub actor
   - [`reactions:write`](https://api.slack.com/scopes/reactions:write) to add summary message error reactions
   - [`users:read`](https://api.slack.com/scopes/users:read) to map GitHub user to Slack user
1. Install the app to your workspace
1. Copy the app's **Bot User OAuth Token** from the **OAuth & Permissions** page
1. [Create a GitHub secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets) with this token, named `SLACK_DEPLOY_BOT_TOKEN`
1. Invite the bot user into the Slack channel you will post messages to (`/invite @bot_user_name`)
1. Click the Slack channel name in the header, and copy its **Channel ID** from the bottom of the dialog

## Usage

```yaml
name: Deploy

on:
  push:
    branches:
      - main

# 1. Configure environment variables
env:
  SLACK_DEPLOY_BOT_TOKEN: ${{ secrets.SLACK_DEPLOY_BOT_TOKEN }} # required
  SLACK_DEPLOY_CHANNEL: 'C040YVCUDRR' # required - replace with your Slack Channel ID
  SLACK_DEPLOY_ERROR_REACTION: 'x' # optional emoji name added as non-successful summary message reaction

jobs:
  staging:
    runs-on: ubuntu-latest
    outputs:
      slack_ts: ${{ steps.slack.outputs.ts }}
    steps:
      # 2. Post summary message at the beginning of your workflow
      - name: Post to Slack
        uses: Fieldguide/action-slack-deploy-pipeline@v3
        id: slack

      - name: Deploy to staging
        run: sleep 10 # replace with your deploy steps

      # 3. Post threaded stage updates throughout
      - name: Post to Slack
        uses: Fieldguide/action-slack-deploy-pipeline@v3
        if: always()
        with:
          thread_ts: ${{ steps.slack.outputs.ts }}

  production:
    needs:
      - staging
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: sleep 5 # replace with your deploy steps

      # 4. Post last "conclusion" stage
      - name: Post to Slack
        uses: Fieldguide/action-slack-deploy-pipeline@v3
        if: always()
        with:
          thread_ts: ${{ needs.staging.outputs.slack_ts }}
          conclusion: true
```

1. Configure required `SLACK_DEPLOY_BOT_TOKEN` and `SLACK_DEPLOY_CHANNEL` [environment variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables).
1. Use this action at the beginning of your workflow to post a "Deploying" message in your configured channel.
1. As your workflow progresses, use this action with the `thread_ts` input to post threaded replies.
1. Denote the last step with the `conclusion` input to update the initial message's status.

## Configuration

### Environment Variables

Global configuration to be used across all Slack Deploy actions within the workflow.

| variable                      | description                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `SLACK_DEPLOY_BOT_TOKEN`      | **Required** Slack bot user OAuth token                                                                      |
| `SLACK_DEPLOY_CHANNEL`        | **Required** Slack channel ID                                                                                |
| `SLACK_DEPLOY_ERROR_REACTION` | Optional Slack emoji name                                                                                    |
| `SLACK_DEPLOY_GITHUB_USERS`   | [Optional mapping](#predefined-user-mapping) of Slack user details by GitHub username in JSON or YAML format |

### Inputs

Optional step-specific input enables threading and denotes the conclusion.

| input          | description                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `thread_ts`    | Initial Slack message timestamp ID                                                                                                                                       |
| `conclusion`   | `true` denotes last stage                                                                                                                                                |
| `github_token` | Repository `GITHUB_TOKEN` or personal access token secret; defaults to [`github.token`](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context) |
| `status`       | The current status of the job; defaults to [`job.status`](https://docs.github.com/en/actions/learn-github-actions/contexts#job-context)                                  |

### Outputs

| output | description                |
| ------ | -------------------------- |
| `ts`   | Slack message timestamp ID |

## Slack User Mapping

By default, this GitHub Action attempts to [mention](https://slack.com/help/articles/205240127-Use-mentions-in-Slack) the Slack user corresponding to the GitHub actor by full name. This process depends on a conservatively rate limited [Slack API method](https://docs.slack.dev/reference/methods/users.list/); depending on your deploy throughput, it might fail and gracefully fallback to the GitHub username.

To improve reliability, the action can be provided a predefined user mapping via a `SLACK_DEPLOY_GITHUB_USERS` environment variable. The data should be an object keyed by GitHub username mapped to Slack user detail values in JSON or YAML format.

The data is conventionally JSON generated by the [Generate Slack Deploy User Mapping](./.github/actions/generate-user-mapping/README.md) GitHub Action. However, it can also be provided as inline YAML as in the example below:

```yaml
- uses: Fieldguide/action-slack-deploy-pipeline@v3
  env:
    SLACK_DEPLOY_GITHUB_USERS: |
      namoscato:
        slack_user_id: U0411GE5J9J
        username: Nick
        icon_url: "https://secure.gravatar.com/avatar/d79555502b4c47fc9d31144af55dc3e5.jpg"
```
