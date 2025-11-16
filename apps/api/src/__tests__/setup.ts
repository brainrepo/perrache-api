import 'dotenv/config'
import { beforeAll, afterAll } from 'vitest'
import { DatabaseService } from '../lib/db'

// Set test environment variables if not already set
if (!process.env.API_KEY_SECRET) {
  // Must be at least 32 characters for validation
  process.env.API_KEY_SECRET = 'test-secret-key-for-hmac-sha256-hashing-minimum-32-chars'
}

beforeAll(async () => {
  // Initialize database connection for tests
  DatabaseService.getInstance()
})

afterAll(async () => {
  // Clean up database connection after tests
  await DatabaseService.disconnect()
})
