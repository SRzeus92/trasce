import { sanitizeObject, validators } from '../utils/validation.js'
import { verifyOTP } from '../utils/orchestrationService.js'

export default async function (fastify, opts) {
  fastify.post('/verify/otp', async function (request, reply) {
    // Sanitize input to prevent XSS
    const sanitized = sanitizeObject(request.body)
    const { user_id, otp } = sanitized

    // --- Validations specific to OTP verification ---
    if (!validators.userId(user_id)) {
      return reply.code(400).send({ error: 'Invalid user_id' })
    }
    if (!validators.otpCode(otp)) {
      console.log('Invalid OTP format:', otp)
      return reply.code(400).send({ error: 'Invalid OTP code' })
    }

    // --- Forward to auth-service through orchestrationService with retry logic ---
    try {
      const data = await verifyOTP(user_id, otp)

      return reply.code(201).send(data)
    } catch (error) {
      console.error('[verify/otp] Error:', error)
      return reply.code(503).send({ error: 'Auth service unavailable' })
    }
  })
}