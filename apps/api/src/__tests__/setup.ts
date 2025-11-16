import 'dotenv/config'
import { beforeAll, afterAll } from 'vitest'
import { DatabaseService } from '../lib/db'

// Set test environment variables if not already set
if (!process.env.API_KEY_SECRET) {
  process.env.API_KEY_SECRET = 'test-secret-key-for-hmac-sha256-hashing'
}

beforeAll(async () => {
  // Initialize database connection for tests
  DatabaseService.getInstance()
})

afterAll(async () => {
  // Clean up database connection after tests
  await DatabaseService.disconnect()
})
