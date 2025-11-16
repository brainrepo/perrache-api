/**
 * Environment variable validation using @fastify/env
 * JSON Schema-based validation with automatic type coercion
 */

export interface EnvironmentConfig {
  DATABASE_URL: string
  DB_POOL_SIZE: number
  NODE_ENV: string
  PORT: number
  HOST: string
  CORS_ORIGIN: string
  LOG_LEVEL: string
  API_KEY_SECRET: string
}

/**
 * JSON Schema for environment variables
 * Used by @fastify/env for validation and type coercion
 */
export const envSchema = {
  type: 'object',
  required: ['DATABASE_URL', 'API_KEY_SECRET'],
  properties: {
    DATABASE_URL: {
      type: 'string',
      description: 'Database connection URL'
    },
    DB_POOL_SIZE: {
      type: 'number',
      default: 10,
      description: 'Database connection pool size'
    },
    NODE_ENV: {
      type: 'string',
      default: 'development',
      enum: ['development', 'production', 'test'],
      description: 'Node environment'
    },
    PORT: {
      type: 'number',
      default: 3001,
      description: 'Server port'
    },
    HOST: {
      type: 'string',
      default: '0.0.0.0',
      description: 'Server host'
    },
    CORS_ORIGIN: {
      type: 'string',
      default: 'http://localhost:3001',
      description: 'CORS allowed origin'
    },
    LOG_LEVEL: {
      type: 'string',
      default: 'info',
      enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
      description: 'Pino log level'
    },
    API_KEY_SECRET: {
      type: 'string',
      minLength: 32,
      description: 'Secret key for HMAC-SHA-256 API key hashing (min 32 chars)'
    }
  }
} as const

/**
 * @fastify/env plugin options
 */
export const envOptions = {
  confKey: 'config',
  schema: envSchema,
  dotenv: true,
  data: process.env
}

// Augment FastifyInstance to include config property
declare module 'fastify' {
  interface FastifyInstance {
    config: EnvironmentConfig
  }
}
