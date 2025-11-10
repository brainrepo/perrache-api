import 'dotenv/config'
import { beforeAll, afterAll } from 'vitest'
import { DatabaseService } from '../lib/db'

beforeAll(async () => {
  // Initialize database connection for tests
  DatabaseService.getInstance()
})

afterAll(async () => {
  // Clean up database connection after tests
  await DatabaseService.disconnect()
})
