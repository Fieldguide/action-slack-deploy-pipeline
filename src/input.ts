export function getEnv(name: string): string {
  const env = String(process.env[name] ?? '').trim()

  if (!env) {
    throw new Error(`${name} environment variable required`)
  }

  return env
}
