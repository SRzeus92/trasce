export const authenticateToken = async (request, reply) => {
  try {
    const payload = await request.jwtVerify()
    if (!request.user) {
      request.user = payload
    }
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}