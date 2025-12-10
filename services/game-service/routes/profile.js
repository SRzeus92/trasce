import { authenticateToken } from './middleware.js'
import { getUserMatches, getUserFromUserService, uploadUserAvatar } from '../utils/orchestrationService.js'

export default async function (fastify) {
  /**
   * GET /profile - Get own profile
   * Uses orchestration service with retry logic
   */
  fastify.get('/profile', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      const userId = request.user.userId

      // Fetch user profile + all friendships through orchestration layer
      const profile = await getUserFromUserService(userId)

      // Fetch user's match history through orchestration layer with retry
      const matches = await getUserMatches(userId)

      // Combine into profile response
      return reply.send({
        user: profile,
        matches: matches
      })
    } catch (error) {
      console.error('[get profile] Error:', error)
      return reply.code(503).send({ error: 'Services unavailable' })
    }
  })

  /**
   * GET /profile/:userId - Get public profile of another user
   * Uses orchestration service with retry logic
   */
  fastify.get('/profile/:userId', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      const { userId } = request.params

      // Fetch target user profile through orchestration layer
      const profile = await getUserFromUserService(userId)

      // Fetch target user's match history through orchestration layer with retry
      const matches = await getUserMatches(userId)

      // Combine into profile response
      return reply.send({
        user: profile,
        matches: matches
      })
    } catch (error) {
      console.error('[get user profile] Error:', error)
      return reply.code(503).send({ error: 'Services unavailable' })
    }
  })

  /**
   * POST /profile/avatar - Upload avatar image for current user (multipart)
   * Accepts a single file in multipart form-data under field name "avatar"
   */
  fastify.post('/profile/avatar', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      // Use fastify-multipart to get the uploaded file stream
      const file = await request.file()
      if (!file) {
        return reply.code(400).send({ error: 'Missing avatar file' })
      }
      const { filename, file: stream, mimetype } = file
      const userId = request.user.userId
      // Forward as multipart stream to user-service (no base64)
      const result = await uploadUserAvatar(userId, filename, stream, mimetype)

      return reply.code(201).send({
        success: true,
        avatar_url: result.avatar_url,
        avatar: result.avatar
      })
    } catch (error) {
      console.error('[upload avatar] Error:', error)
      return reply.code(503).send({ error: 'Failed to upload avatar' })
    }
  })
}
