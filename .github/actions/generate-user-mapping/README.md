# Generate Slack Deploy User Mapping

This action generates a mapping of Slack user details by GitHub username for use in [Slack Deploy Pipeline Notifications](../../../README.md). It intends to decouple the user mapping process, dependent on a conservatively rate limited [Slack API method](https://docs.slack.dev/reference/methods/users.list/), from the higher throughput notification action.

## Setup

### GitHub Token

A fine-grained personal access token must be configured as the default `GITHUB_TOKEN` does not include adequate permissions:

1. [Create a fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)
2. Under **Resource owner**, select your GitHub organization
3. Under **Permissions**, select "Members" (read-only)
4. [Create a GitHub secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets) with this token, named `GH_ORG_MEMBERS_TOKEN`

### Slack Token

If you have not already provisioned a Slack Bot Token:

5. [Create a Slack App](https://api.slack.com/apps) for your workspace
6. Under **OAuth & Permissions**, add the [`users:read`](https://api.slack.com/scopes/users:read) Bot Token Scope
7. Copy the app's **Bot User OAuth Token**
8. [Create a GitHub secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets) with this token, named `SLACK_DEPLOY_BOT_TOKEN`

## Usage

In a conventional setup, the user mapping is periodically uploaded as a GitHub workflow artifact and downloaded within deploy workflows.

### Schedule Workflow

Create a [`schedule`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) event-triggered workflow that [uploads](https://github.com/actions/upload-artifact) the generated user mapping as a `slack-deploy-user-mapping.json` [workflow artifact](https://docs.github.com/en/actions/tutorials/store-and-share-data):

```yaml
name: Generate Slack Deploy User Mapping

on:
  schedule:
    - cron: '0 0 * * *' # midnight UTC

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Generate user mapping
        uses: Fieldguide/action-slack-deploy-pipeline/.github/actions/generate-user-mapping@v2
        id: user-mapping
        env:
          SLACK_DEPLOY_BOT_TOKEN: ${{ secrets.SLACK_DEPLOY_BOT_TOKEN }}
        with:
          github_token: ${{ secrets.GH_ORG_MEMBERS_TOKEN }}
          github_org: your-org # replace with your GitHub organization name

      - name: Write to file
        run: |
          cat << 'EOF' > slack-deploy-user-mapping.json
          ${{ steps.user-mapping.outputs.json }}
          EOF

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: slack-deploy-user-mapping
          path: slack-deploy-user-mapping.json
          if-no-files-found: 'error'
          retention-days: 2
          overwrite: true
```

### Deploy Workflow

In your deploy workflows, [download the artifact](https://github.com/dawidd6/action-download-artifact) and set the `SLACK_DEPLOY_GITHUB_USERS` environment variable before using the [Slack Deploy Pipeline Notifications](../../../README.md) action:

```yaml
name: Deploy

on:
  push:
    branches:
      - main

env:
  SLACK_DEPLOY_BOT_TOKEN: ${{ secrets.SLACK_DEPLOY_BOT_TOKEN }}
  SLACK_DEPLOY_CHANNEL: 'C040YVCUDRR' # replace with your Slack Channel ID

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Download Slack deploy user mapping artifact
        uses: dawidd6/action-download-artifact@v6
        with:
          workflow: slack_deploy_user_mapping.yaml
          name: slack-deploy-user-mapping

      - name: Set Slack deploy user mapping environment variable
        run: |
          echo "SLACK_DEPLOY_GITHUB_USERS<<EOF" >> $GITHUB_ENV
          cat slack-deploy-user-mapping.json >> $GITHUB_ENV
          echo "EOF" >> $GITHUB_ENV

      - name: Post to Slack
        uses: Fieldguide/action-slack-deploy-pipeline@v2
        id: slack

      - name: Deploy code
        run: sleep 10 # replace with your deploy steps

      - name: Post to Slack
        uses: Fieldguide/action-slack-deploy-pipeline@v2
        if: always()
        with:
          thread_ts: ${{ steps.slack.outputs.ts }}
          conclusion: true
```

## Configuration

### Environment Variables

| variable                 | description                             |
| ------------------------ | --------------------------------------- |
| `SLACK_DEPLOY_BOT_TOKEN` | **Required** Slack bot user OAuth token |

### Inputs

| input          | description                                             |
| -------------- | ------------------------------------------------------- |
| `github_token` | GitHub organization personal access token secret        |
| `github_org`   | GitHub organization name from which members are fetched |

### Outputs

| output | description                                                      |
| ------ | ---------------------------------------------------------------- |
| `json` | JSON-serialized mapping of Slack user details by GitHub username |
