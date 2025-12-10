import { sanitizeObject, sanitizeString } from '../utils/validation.js'

export default async function (fastify) {
  // GET /matches - Get all matches
  fastify.get('/matches', async (request, reply) => {
    try {
      const matches = await fastify.models.Match.findAll({
        order: [['played_at', 'DESC']]
      })

      return reply.send(matches)
    } catch (error) {
      console.error('[GET /matches] Error:', error)
      return reply.code(500).send({ error: 'Failed to fetch matches' })
    }
  })

  // GET /matches/:id - Get match by ID
  fastify.get('/matches/:id', async (request, reply) => {
    try {
      const match = await fastify.models.Match.findByPk(request.params.id)

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' })
      }

      return reply.send(match)
    } catch (error) {
      console.error('[GET /matches/:id] Error:', error)
      return reply.code(500).send({ error: 'Failed to fetch match' })
    }
  })

  // GET /matches/user/:userId - Get all matches for a user
  fastify.get('/matches/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params

      const matches = await fastify.models.Match.findAll({
        where: { user_id: userId },
        order: [['played_at', 'DESC']]
      })

      return reply.send(matches)
    } catch (error) {
      console.error('[GET /matches/user/:userId] Error:', error)
      return reply.code(500).send({ error: 'Failed to fetch user matches' })
    }
  })

  // POST /matches - Create new match (vs human or AI opponent) with full validation
  fastify.post('/matches', async (request, reply) => {
    const transaction = await fastify.sequelize.transaction()

    try {
      // Sanitize input to prevent XSS
      const sanitized = sanitizeObject(request.body)
      const { user_id, opponent_alias, user_score, opponent_score } = sanitized

      // Business Logic: Validate required fields
      if (!user_id) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Missing user_id' })
      }

      // Business Logic: matches require opponent_alias
      if (!opponent_alias || opponent_alias.trim() === '') {
        await transaction.rollback()
        return reply.code(400).send({ error: 'opponent_alias is required' })
      }

      // Business Logic: Scores are mandatory
      if (user_score === undefined || opponent_score === undefined) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'user_score and opponent_score are required' })
      }

      // Business Logic: Validate scores are non-negative integers
      if (!Number.isInteger(user_score) || !Number.isInteger(opponent_score) || 
          user_score < 0 || opponent_score < 0) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Scores must be non-negative integers' })
      }

      // Sanitize opponent_alias if present
      const cleanAlias = sanitizeString(opponent_alias.trim())

      // Business Logic: Immutable match (create with final scores)
      const match = await fastify.models.Match.create({
        user_id,
        opponent_alias: cleanAlias,
        user_score,
        opponent_score,
        played_at: new Date()
      }, { transaction })

      await transaction.commit()

      return reply.code(201).send(match)
    } catch (error) {
      await transaction.rollback()
      console.error('[POST /matches] Error:', error)
      return reply.code(500).send({ error: 'Failed to create match' })
    }
  })
}
