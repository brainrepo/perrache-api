/**
 * Environment variable validation
 * Ensures required environment variables are set before the application starts
 */

export interface EnvironmentConfig {
  DATABASE_URL: string
  DB_POOL_SIZE?: string
  NODE_ENV: string
  PORT?: string
  HOST?: string
  CORS_ORIGIN?: string
  LOG_LEVEL?: string
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
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    LOG_LEVEL: process.env.LOG_LEVEL
  }
}
