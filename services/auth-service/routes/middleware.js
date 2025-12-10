/**
 * Middleware to validate internal service authentication
 */
export function validateInternalService(request, reply, done) {
  const internalSecret = process.env.INTERNAL_SECRET;

  if (!internalSecret) {
    return reply.code(500).send({ error: 'Internal authentication not configured' });
  }

  const authHeader = request.headers['x-internal-service'];

  if (!authHeader || authHeader !== internalSecret) {
    return reply.code(403).send({
      error: 'Forbidden',
      message: 'Only internal services can access this endpoint'
    });
  }

  done();
}