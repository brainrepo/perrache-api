/**
 * APIs Routes Index
 * Aggregates all API-related routes
 */

import { FastifyInstance } from 'fastify'
import { versionsRoute } from './versions.route.js'

/**
 * Register all APIs routes
 */
export default async function apisRoutes(fastify: FastifyInstance): Promise<void> {
  // Version history: GET /apis/:id/versions
  await fastify.register(versionsRoute)
}
