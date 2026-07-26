# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Commands

```bash
pnpm install               # Node 24 via `nvm install`; pnpm via `corepack enable`
pnpm all                   # format:check + lint + test:ci + bundle both entrypoints (CI equivalent)
pnpm test:ci               # jest, single run
pnpm test                  # jest --watch
pnpm test:ci src/utils/__tests__/postMessage.test.ts   # single file
pnpm test:ci -t 'summary'                              # single test by name
pnpm lint                  # eslint . --ext .ts
pnpm format:write          # prettier --write .
pnpm bundle                # format + ncc build both entrypoints into dist/
pnpm dev                   # ncc --watch for both entrypoints
```

There is no `tsc` build step — `tsconfig.json` sets `noEmit` and ncc does the bundling. Type errors surface via `pnpm lint` (typed ESLint rules) and `ts-jest`.

## dist/ is committed

`dist/notifySlack/index.js` and `dist/generateUserMapping/index.js` are the files GitHub Actions actually executes (`action.yml` → `runs.main`). They are checked in and the `check-dist` workflow fails the build if they don't match a fresh `pnpm bundle`. **Any change under `src/` must be followed by `pnpm bundle` and the resulting `dist/` changes committed.**

## Two actions, one repo

| Entrypoint                   | Action manifest                                    | Purpose                                                                                                                                       |
| ---------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/notifySlack.ts`         | `action.yml` (repo root)                           | The published action — posts/updates deploy notifications                                                                                     |
| `src/generateUserMapping.ts` | `.github/actions/generate-user-mapping/action.yml` | Periodically generates a GitHub→Slack user mapping JSON, decoupling the rate-limited `users.list` call from the high-throughput notify action |

Both construct their own `SlackClient` and Octokit client, then delegate; both wrap everything in try/catch → `setFailed`. The nested action's `runs.main` points back up at `../../../dist/generateUserMapping/index.js`.

## Message flow (`src/utils/postMessage.ts`)

A single action invocation branches on the `thread_ts` input:

- **No `thread_ts`** → first call in the workflow. Posts the _summary_ message (`github/getSummaryMessage.ts`) and returns its `ts` as the `ts` output.
- **With `thread_ts`** → posts a _stage_ message (`github/getStageMessage.ts`) as a threaded reply. `reply_broadcast` is set when the stage was unsuccessful, so failures surface in the channel. Then, if `conclusion == 'true'` **or** the status is unsuccessful, it re-renders the summary message and `chat.update`s it in place (adding total duration, derived by treating `thread_ts` as a Unix timestamp — see `slack/utils/dateFromTs.ts`). Unsuccessful statuses also get `SLACK_DEPLOY_ERROR_REACTION` added.

Stage duration is measured from the _previous Slack step_ in the same job: `getStageMessage` lists the run's jobs and finds the last completed step whose name matches `/[^A-Za-z]slack[^A-Za-z]/i`, falling back to job start. Renaming steps that use this action away from containing "Slack" silently changes reported durations.

## Message author resolution

`utils/getMessageAuthorFactory.ts` resolves the Slack identity to impersonate (`username` + `icon_url` via `chat:write.customize`, plus `slack_user_id` for an `<@…>` mention). Order of precedence:

1. `SLACK_DEPLOY_GITHUB_USERS` mapping (JSON if it starts with `{`, otherwise YAML) keyed by GitHub username. An explicit `null` value means "known to have no Slack user".
2. If `withSlackUserId` is false (stage messages), stop at the GitHub login + avatar — this deliberately skips the rate-limited Slack call.
3. Otherwise `users.list` + `getSlackUserFromName`, matching Slack `profile.real_name` against the GitHub user's full name. Ambiguous or missing matches throw.

Every failure path degrades to the GitHub username with a `warning()` rather than failing the action — preserve that. When the webhook sender is `github-merge-queue[bot]`, the real author is recovered by parsing `(#123)` out of the head commit message and reading the PR's `merged_by`.

## Event support

`github/webhook.ts` owns the supported-event list (`pull_request`, `push`, `release`, `schedule`, `workflow_dispatch`) as a const tuple plus per-event type guards over `@actions/github`'s `context`. `assertUnsupportedEvent(context: never)` makes exhaustiveness a compile error, so adding an event means updating `SUPPORTED_EVENT_NAMES`, adding a guard, and handling it in both `getEventLink` (`getSummaryMessage.ts`) and `EVENT_NAME_IMAGE_MAP` (`getContextBlock.ts`).

## Conventions

- Prettier: no semicolons, single quotes, no bracket spacing, `arrowParens: avoid`, 80 cols. ESLint extends `plugin:github/recommended` + `plugin:github/typescript`; explicit function return types are required.
- Yoda conditions throughout (`'true' === getInput('conclusion')`, `null === messageAuthor`). Match it.
- Config comes from two places and they are not interchangeable: workflow-wide settings are **environment variables** enumerated in the `EnvironmentVariable` enum (`utils/input.ts`), while per-step settings are **action inputs** read with `getInput` and declared in `action.yml`.
- User-facing text goes through `slack/mrkdwn.ts` helpers, which escape `& < >` via `slack/utils/escapeText.ts`. Don't hand-build mrkdwn.
- Slack API errors are narrowed with `instanceof WebAPIPlatformError`; missing OAuth scopes are rethrown as `MissingScopeError` naming the needed scope.
- Tests live in `__tests__/` beside the code and mock `@slack/web-api` / a fake `OctokitClient` object rather than hitting the network. `github.context` is mutated directly in `beforeEach` and restored afterward.
- Updating the README's required Slack scopes list matters — the action's error messages reference those scope names.
