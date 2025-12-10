import { calculateFriendshipStatus } from '../utils/friendshipUtils.js'

export default async function (fastify) {
  // POST /friendships/request - Create friendship request with full validation
  fastify.post('/friendships/request', async (request, reply) => {
    const transaction = await fastify.sequelize.transaction()

    try {
      const { sender_id, receiver_id } = request.body

      // Business Logic: Validate input
      if (!sender_id || !receiver_id) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Missing sender_id or receiver_id' })
      }

      // Business Logic: User cannot add themselves as friend
      if (sender_id === receiver_id) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Cannot add yourself as friend' })
      }

      // Business Logic: Validate that receiver_id is a valid user (persistence layer validation)
      const receiver = await fastify.models.User.findByPk(receiver_id, { transaction })
      if (!receiver) {
        await transaction.rollback()
        return reply.code(404).send({ error: 'Receiver user not found' })
      }

      // Business Logic: Check if friendship already exists (in either direction)
      const existing = await fastify.models.Friendship.findOne({
        where: {
          [fastify.Sequelize.Op.or]: [
            { sender_id, receiver_id },
            { sender_id: receiver_id, receiver_id: sender_id }
          ]
        },
        transaction
      })

      if (existing) {
        await transaction.rollback()
        return reply.code(409).send({ error: 'Friendship already exists' })
      }

      // Create friendship request with status=0 (pending)
      const friendship = await fastify.models.Friendship.create({
        sender_id,
        receiver_id,
        status: 0
      }, { transaction })

      await transaction.commit()

      // Enrich response with friendship status from receiver perspective
      return reply.code(201).send({
        ...friendship.toJSON(),
        friendship_status: calculateFriendshipStatus(friendship, receiver_id, sender_id)
      })
    } catch (error) {
      await transaction.rollback()
      console.error('[POST /friendships/request] Error:', error)
      return reply.code(500).send({ error: 'Failed to create friendship request' })
    }
  })

  // PUT /friendships/:id/accept - Accept friendship request (status 0 -> 1)
  fastify.put('/friendships/:id/accept', async (request, reply) => {
    const transaction = await fastify.sequelize.transaction()

    try {
      const { id } = request.params
      const { user_id } = request.body

      if (!user_id) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Missing user_id' })
      }

      const friendship = await fastify.models.Friendship.findByPk(id, { transaction })

      if (!friendship) {
        await transaction.rollback()
        return reply.code(404).send({ error: 'Friendship request not found' })
      }

      // Business Logic: Only receiver can accept
      if (friendship.receiver_id !== user_id) {
        await transaction.rollback()
        return reply.code(403).send({ error: 'Only the receiver can accept this friendship request' })
      }

      // Business Logic: Cannot accept already accepted friendship
      if (friendship.status === 1) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Friendship already accepted' })
      }

      // Business Logic: Can only accept pending requests (status=0)
      if (friendship.status !== 0) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Invalid friendship status' })
      }

      friendship.status = 1
      friendship.updated_at = new Date()
      await friendship.save({ transaction })

      await transaction.commit()

      // Enrich response with friendship status
      return reply.send({
        ...friendship.toJSON(),
        friendship_status: 'accepted'
      })
    } catch (error) {
      await transaction.rollback()
      console.error('[PUT /friendships/:id/accept] Error:', error)
      return reply.code(500).send({ error: 'Failed to accept friendship' })
    }
  })

  // DELETE /friendships/:id - Reject or remove friendship (only sender or receiver)
  fastify.delete('/friendships/:id', async (request, reply) => {
    const transaction = await fastify.sequelize.transaction()

    try {
      const { id } = request.params
      const { user_id } = request.body

      if (!user_id) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Missing user_id' })
      }

      const friendship = await fastify.models.Friendship.findByPk(id, { transaction })

      if (!friendship) {
        await transaction.rollback()
        return reply.code(404).send({ error: 'Friendship not found' })
      }

      // Business Logic: Only sender or receiver can delete
      if (friendship.sender_id !== user_id && friendship.receiver_id !== user_id) {
        await transaction.rollback()
        return reply.code(403).send({ error: 'Unauthorized: you are not part of this friendship' })
      }

      const deleted = await fastify.models.Friendship.destroy({
        where: { id },
        transaction
      })

      await transaction.commit()

      return reply.send({ success: true })
    } catch (error) {
      await transaction.rollback()
      console.error('[DELETE /friendships/:id] Error:', error)
      return reply.code(500).send({ error: 'Failed to delete friendship' })
    }
  })
}
