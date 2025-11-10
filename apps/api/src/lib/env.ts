/**
 * Environment variable validation
 * Ensures required environment variables are set before the application starts
 */

interface EnvironmentConfig {
  DATABASE_URL: string
  DB_POOL_SIZE?: string
  NODE_ENV?: string
  API_PORT?: string
  API_HOST?: string
  FRONTEND_URL?: string
}

const requiredEnvVars = ['DATABASE_URL'] as const

export function validateEnvironment(): EnvironmentConfig {
  const missing: string[] = []

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables:\n  ${missing.join('\n  ')}\n\nPlease check your .env file.`
    )
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    DB_POOL_SIZE: process.env.DB_POOL_SIZE,
    NODE_ENV: process.env.NODE_ENV || 'development',
    API_PORT: process.env.API_PORT,
    API_HOST: process.env.API_HOST,
    FRONTEND_URL: process.env.FRONTEND_URL
  }
}
