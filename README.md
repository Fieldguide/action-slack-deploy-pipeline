# Slack Deploy Pipeline Notifications

[![ci](https://github.com/Fieldguide/action-slack-deploy-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/Fieldguide/action-slack-deploy-pipeline/actions/workflows/ci.yml)

<img width="524" alt="Slack Deploy Pipeline Notifications example thread" src="https://user-images.githubusercontent.com/847532/230737887-1d18a062-af7f-4c7f-a78c-e604fc9803c2.jpg">

## Table of Contents

- [Features](#features)
- [Slack Notify Workflow](#slack-notify-workflow)
- [Generate User Mapping Workflow](#generate-user-mapping-workflow)
- [Environment Variables](#environment-variables)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [User Mapping](#user-mapping-optional)

---

## Features

- Posts a summary message at the beginning of the deploy workflow, surfacing the commit message and author
- Maps GitHub actor to Slack user by full name, mentioning them in the summary message
- Threads intermediate stage completions, notifies the channel of unexpected failures
- Adds summary message reaction to unsuccessful jobs (useful with [Reacji Channeler](https://reacji-channeler.builtbyslack.com/))
- Updates the summary message with the workflow duration at its conclusion
- Supports [`pull_request`, `push`, `release`, `schedule`, and `workflow_dispatch`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows) event types

---

## Slack Notify Workflow

### Setup

1. [Create a Slack App](https://api.slack.com/apps) for your workspace
2. Under **OAuth & Permissions**, add Bot Token Scopes:
   - [`chat:write`](https://api.slack.com/scopes/chat:write) to post messages
   - [`chat:write.customize`](https://api.slack.com/scopes/chat:write.customize) to customize messages with GitHub actor
   - [`reactions:write`](https://api.slack.com/scopes/reactions:write) to add summary message error reactions
   - [`users:read`](https://api.slack.com/scopes/users:read) to map GitHub user to Slack user
3. Install the app to your workspace
4. Copy the app's **Bot User OAuth Token** from the **OAuth & Permissions** page
5. [Create a GitHub secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets) with this token, named `SLACK_DEPLOY_BOT_TOKEN`
6. Invite the bot user into the Slack channel you will post messages to (`/invite @bot_user_name`)
7. Click the Slack channel name in the header, and copy its **Channel ID** from the bottom of the dialog

### Minimal Example

```yaml
name: Deploy
on:
  push:
    branches:
      - main
  workflow_dispatch:

env:
  SLACK_DEPLOY_BOT_TOKEN: ${{ secrets.SLACK_DEPLOY_BOT_TOKEN }}
  SLACK_DEPLOY_CHANNEL: 'C040YVCUDRR' # replace with your Slack Channel ID

jobs:
  staging:
    runs-on: ubuntu-latest
    outputs:
      slack_ts: ${{ steps.slack.outputs.ts }}
    steps:
      - name: Post summary message to Slack
        uses: Fieldguide/action-slack-deploy-pipeline@v2
        id: slack

      - name: Deploy to staging
        run: sleep 10 # replace with your deploy steps

      - name: Post threaded stage update
        uses: Fieldguide/action-slack-deploy-pipeline@v2
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

      - name: Post conclusion to Slack
        uses: Fieldguide/action-slack-deploy-pipeline@v2
        if: always()
        with:
          thread_ts: ${{ needs.staging.outputs.slack_ts }}
          conclusion: true
```

---

## Generate User Mapping Workflow

You can provide a raw mapping of GitHub logins to Slack user details to avoid Slack and GitHub API calls for user mapping. This can be done manually, or generated automatically using the included mapping action.

### Generate Mapping Automatically

Use the included composite action to generate a mapping of Slack users by GitHub login:

```yaml
name: Generate Slack User Mapping
on:
  workflow_dispatch:
  push:
    branches:
      - main
env:
  SLACK_DEPLOY_BOT_TOKEN: ${{ secrets.SLACK_DEPLOY_BOT_TOKEN }}
  SLACK_DEPLOY_CHANNEL: 'C040YVCUDRR' # replace with your Slack Channel ID
jobs:
  generate-user-mapping:
    runs-on: ubuntu-latest
    steps:
      - name: Generate user mapping
        uses: Fieldguide/action-slack-deploy-pipeline/.github/actions/generate-user-mapping
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          github_org: your-org-name
        id: user-mapping

        # Use mapping in deploy workflow
      - name: Post to Slack
        uses: Fieldguide/action-slack-deploy-pipeline@main
        id: slack
        env:
          SLACK_DEPLOY_GITHUB_USERS: ${{ steps.user-mapping.outputs.json }}
```

You can then pass `SLACK_GITHUB_MAPPING_RAW` to your deploy workflow as shown above.

---

## Environment Variables

| Variable                      | Description                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SLACK_DEPLOY_BOT_TOKEN`      | **Required** Slack bot user OAuth token                                                                                                                                                      |
| `SLACK_DEPLOY_CHANNEL`        | **Required** Slack channel ID                                                                                                                                                                |
| `SLACK_DEPLOY_ERROR_REACTION` | Optional Slack emoji name                                                                                                                                                                    |
| `SLACK_DEPLOY_GITHUB_USERS`   | Optional: Raw mapping (JSON or YAML) of Slack user details by GitHub login. If set, avoids Slack/GitHub API calls for user mapping. Can be generated automatically using the mapping action. |

## Inputs

| Input          | Description                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `thread_ts`    | Initial Slack message timestamp ID                                                                                                                                       |
| `conclusion`   | `true` denotes last stage                                                                                                                                                |
| `github_token` | Repository `GITHUB_TOKEN` or personal access token secret; defaults to [`github.token`](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context) |
| `status`       | The current status of the job; defaults to [`job.status`](https://docs.github.com/en/actions/learn-github-actions/contexts#job-context)                                  |

## Outputs

| Output             | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `ts`               | Slack message timestamp ID                            |
| `raw_mapping_json` | Raw JSON mapping of Slack user details by GitHub user |

---

## User Mapping (Optional)

To avoid Slack and GitHub API calls for mapping GitHub users to Slack users, you can provide a raw mapping as a JSON or YAML string in the `SLACK_GITHUB_MAPPING_RAW` environment variable. The mapping should be an object keyed by GitHub login, with Slack user details as values. Example:

```json
{
  "octocat": {
    "slack_user_id": "U12345678",
    "username": "Octo Cat",
    "icon_url": "https://avatars.slack-edge.com/..."
  }
}
```

Or YAML:

```yaml
octocat:
  slack_user_id: U12345678
  username: Octo Cat
  icon_url: https://avatars.slack-edge.com/...
```

You can generate this mapping automatically using the included mapping action, and pass its output to your deploy workflow as `SLACK_GITHUB_MAPPING_RAW`.
