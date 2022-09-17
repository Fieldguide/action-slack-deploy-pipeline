/**
 * Get the value of a required environment variable.
 *
 * The value is trimmed of whitespace.
 */
export function getEnv(name: string): string {
  const env = String(process.env[name] ?? '').trim()

  if (!env) {
    throw new Error(`${name} environment variable required`)
  }

  return env
}
