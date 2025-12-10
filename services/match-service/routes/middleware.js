export function validateInternalService(request, reply, done) {
  const internalSecret = process.env.INTERNAL_SECRET
  const providedSecret = request.headers['x-internal-service']

  if (!internalSecret) {
    console.error('INTERNAL_SECRET not configured')
    return reply.code(500).send({ error: 'Server configuration error' })
  }

  if (!providedSecret || providedSecret !== internalSecret) {
    return reply.code(403).send({ error: 'Forbidden: Invalid internal service authentication' })
  }

  done()
}