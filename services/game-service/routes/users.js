import { authenticateToken } from './middleware.js'
import { getUsersWithFriendshipStatus, getUserFromUserService, getAllUsers } from '../utils/orchestrationService.js'

export default async function (fastify, opts) {
  // GET /users - Get all users with friendship context (leaderboard)
  // Uses orchestration service with retry logic
  fastify.get('/users', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      const currentUserId = request.user.userId

      // Single fetch through orchestration layer with retry logic
      const enrichedUsers = await getUsersWithFriendshipStatus(currentUserId)
      return reply.send(enrichedUsers)
    } catch (error) {
      console.error('[get users] Error:', error)
      return reply.code(503).send({ error: 'User service unavailable' })
    }
  })

  fastify.get('/users/:id', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      const { id } = request.params

      const user = await getUserFromUserService(id)
      return reply.send(user)
    } catch (error) {
      console.error('[get user] Error:', error)
      return reply.code(503).send({ error: 'User service unavailable' })
    }
  })

  // Public: GET /users/all - Get all users (basic info), no JWT required
  fastify.get('/users/all', async function (request, reply) {
    try {
      const users = await getAllUsers()
      return reply.send(users)
    } catch (error) {
      console.error('[get all users] Error:', error)
      return reply.code(503).send({ error: 'User service unavailable' })
    }
  })
}