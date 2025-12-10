import { authenticateToken } from './middleware.js'
import { getUserMatches, getMatchById, createMatch, updateUserStats, getAllMatches } from '../utils/orchestrationService.js'

export default async function (fastify) {
  // GET /matches - Get all matches for authenticated user
  fastify.get('/matches', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      const userId = request.user.userId

      const matches = await getUserMatches(userId)
      return reply.send(matches)
    } catch (error) {
      console.error('[get user matches] Error:', error)
      return reply.code(503).send({ error: 'Match service unavailable' })
    }
  })

  // GET /matches/:id - Get match by ID
  fastify.get('/matches/:id', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      const { id } = request.params

      const match = await getMatchById(id)
      return reply.send(match)
    } catch (error) {
      console.error('[get match] Error:', error)
      return reply.code(503).send({ error: 'Match service unavailable' })
    }
  })

  // POST /matches - Create match vs human opponent (INPUT VALIDATION)
  fastify.post('/matches', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      const userId = request.user.userId
      const { opponent_alias, user_score, opponent_score } = request.body

      // INPUT VALIDATION (Orchestration layer responsibility)
      if (!opponent_alias || opponent_alias.trim() === '') {
        return reply.code(400).send({ error: 'opponent_alias is required' })
      }

      if (opponent_alias.trim() === "IA" || opponent_alias.trim() === "AI"){
        return reply.code(400).send({ error: 'alias not available, choose another opponent_alias' })
      }

      if (user_score === undefined || opponent_score === undefined) {
        return reply.code(400).send({ error: 'user_score and opponent_score are required' })
      }

      // Create match through orchestration layer with retry logic
      const match = await createMatch({
        user_id: userId,
        opponent_alias: opponent_alias.trim(),
        user_score,
        opponent_score
      })

      // ORCHESTRATION: Update user statistics with retry logic
      const won_match = user_score > opponent_score ? 1 : 0
      const lost_match = user_score < opponent_score ? 1 : 0
      const total_score = user_score - opponent_score

      try {
        await updateUserStats(userId, won_match, lost_match, total_score)
      } catch (statsError) {
        console.warn('[update stats on match creation] Failed:', statsError.message)
        // Continue even if stats update fails - match is already created
      }

      return reply.code(201).send(match)
    } catch (error) {
      console.error('[create match vs human] Error:', error)
      return reply.code(503).send({ error: 'Match service unavailable' })
    }
  })

  // POST /matches/ai - Create match vs AI opponent (INPUT VALIDATION)
  fastify.post('/matches/ai', { preHandler: authenticateToken }, async function (request, reply) {
    try {
      const userId = request.user.userId
      const { user_score, opponent_score } = request.body

      // INPUT VALIDATION (Orchestration layer responsibility)
      if (user_score === undefined || opponent_score === undefined) {
        return reply.code(400).send({ error: 'user_score and opponent_score are required' })
      }

      // Create match through orchestration layer with retry logic
      const match = await createMatch({
        user_id: userId,
        opponent_alias: "AI",
        user_score,
        opponent_score
      })

      // ORCHESTRATION: Update user statistics with retry logic
      const won_match = user_score > opponent_score ? 1 : 0
      const lost_match = user_score < opponent_score ? 1 : 0
      const total_score = user_score - opponent_score

      try {
        await updateUserStats(userId, won_match, lost_match, total_score)
      } catch (statsError) {
        console.warn('[update stats on AI match creation] Failed:', statsError.message)
        // Continue even if stats update fails - match is already created
      }

      return reply.code(201).send(match)
    } catch (error) {
      console.error('[create match vs ai] Error:', error)
      return reply.code(503).send({ error: 'Match service unavailable' })
    }
  })
}