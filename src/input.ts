export enum EnvironmentVariable {
  SlackBotToken = 'SLACK_DEPLOY_BOT_TOKEN',
  SlackChannel = 'SLACK_DEPLOY_CHANNEL',
  SlackErrorReaction = 'SLACK_DEPLOY_ERROR_REACTION'
}

/**
 * Get the value of a required environment variable.
 *
 * The value is trimmed of whitespace.
 */
export function getRequiredEnv(name: EnvironmentVariable): string {
  const env = getEnv(name)

  if (!env) {
    throw new Error(`${name} environment variable required`)
  }

  return env
}

/**
 * Get the value of an environment variable.
 *
 * The value is trimmed of whitespace.
 */
export function getEnv(name: EnvironmentVariable): string | null {
  return String(process.env[name] ?? '').trim() || null
}
