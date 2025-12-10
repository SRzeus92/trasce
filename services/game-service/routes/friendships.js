import { authenticateToken } from './middleware.js'
import { sendFriendRequest, acceptFriendRequest, removeFriendship } from '../utils/orchestrationService.js'

export default async function (fastify) {
  // POST /friendships - Send friend request (INPUT VALIDATION layer)
  fastify.post('/friendships', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      const { receiver_id } = request.body
      const sender_id = request.user.userId

      // INPUT VALIDATION (Orchestration layer responsibility)
      if (!receiver_id) {
        return reply.code(400).send({ error: 'Missing receiver_id' })
      }

      if (sender_id === receiver_id) {
        return reply.code(400).send({ error: 'Cannot add yourself as friend' })
      }

      // Use orchestrationService with retry logic
      const friendship = await sendFriendRequest(sender_id, receiver_id)
      return reply.code(201).send(friendship)
    } catch (error) {
      console.error('[create friendship] Error:', error)
      return reply.code(503).send({ error: 'User service unavailable' })
    }
  })

  // PUT /friendships/:id/accept - Accept friend request (AUTHORIZATION layer)
  fastify.put('/friendships/:id/accept', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      const { id } = request.params
      const userId = request.user.userId

      // Use orchestrationService with retry logic
      const updatedFriendship = await acceptFriendRequest(id, userId)
      return reply.send(updatedFriendship)
    } catch (error) {
      console.error('[accept friendship] Error:', error)
      return reply.code(503).send({ error: 'User service unavailable' })
    }
  })

  // DELETE /friendships/:id - Reject or remove friendship (AUTHORIZATION layer)
  fastify.delete('/friendships/:id', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      const { id } = request.params
      const userId = request.user.userId

      // Use orchestrationService with retry logic
      await removeFriendship(id, userId)
      return reply.send({ success: true })
    } catch (error) {
      console.error('[delete friendship] Error:', error)
      return reply.code(503).send({ error: 'User service unavailable' })
    }
  })
}