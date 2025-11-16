/**
 * Specs routes module
 * Registers all spec-related endpoints
 */
import { FastifyInstance } from 'fastify'
import { openapiRoute } from './openapi.route.js'

export default async function specsRoutes(fastify: FastifyInstance): Promise<void> {
  // Register OpenAPI upload endpoint: /openapi
  await fastify.register(openapiRoute, { prefix: '/openapi' })
}
