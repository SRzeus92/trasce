import { sanitizeObject, validators } from '../utils/validation.js'
import { loginUser, logoutUser } from '../utils/orchestrationService.js'

export default async function (fastify) {
  fastify.post('/login', async function (request, reply) {
    // Sanitize input
    const sanitized = sanitizeObject(request.body || {})
    const { email, password } = sanitized

    // Validazione input
    if (!email || !password) {
      return reply.status(400).send({ error: 'Missing email or password' })
    }

    try {
      // Forward to auth-service through orchestrationService with retry logic
      const data = await loginUser(email, password)
      return reply.code(200).send(data)
    } catch (error) {
      console.error('[login] Error:', error)
      return reply.code(503).send({ error: 'Auth service unavailable' })
    }
  })

  fastify.post('/logout', async function (request, reply) {
    try {
      const token = request.headers.authorization?.split(' ')[1]

      if (!token) {
        return reply.code(400).send({ error: 'Missing token' })
      }

      // Forward to auth-service through orchestrationService with retry logic
      await logoutUser(token)
      return reply.send({ success: true })
    } catch (error) {
      console.error('[logout] Error:', error)
      return reply.code(503).send({ error: 'Auth service unavailable' })
    }
  })
}