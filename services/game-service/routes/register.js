import { sanitizeObject, validators } from '../utils/validation.js'
import { syncUserToUserService, registerUser } from '../utils/orchestrationService.js'

export default async function (fastify, opts) {
  fastify.post('/register', async function (request, reply) {
    // Sanitize input to prevent XSS
    const sanitized = sanitizeObject(request.body)
    const { username, email, password } = sanitized

    if (!username || !email || !password) {
      return reply.code(400).send({ error: 'Missing fields' })
    }

    // --- Validazioni ---
    if (!validators.username(username)) {
      return reply.code(400).send({ error: 'Username must be alphanumeric (3-20 characters)' })
    }

    if (!validators.email(email)) {
      return reply.code(400).send({ error: 'Email empty or not valid' })
    }

    if (!validators.password(password)) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters long and include uppercase, lowercase, number and special character' })
    }

    // --- Forward to auth-service through orchestrationService with retry logic ---
    try {
      const data = await registerUser(username, email, password)
      
      // ORCHESTRATION: Sync user to user-service through game-service
      try {
        await syncUserToUserService(data.user.id, data.user.username, data.user.avatar_url)
        console.log(`[Orchestration] User ${data.user.username} synced to user-service`)
      } catch (syncError) {
        // Log but don't fail - user is registered in auth-service
        console.warn(`[Orchestration] Failed to sync user to user-service: ${syncError.message}`)
      }

      return reply.code(201).send(data)
    } catch (error) {
      console.error('[register] Error:', error)
      return reply.code(503).send({ error: 'Auth service unavailable' })
    }
  })
}