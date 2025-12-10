import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import { sanitizeObject } from '../utils/validation.js'
import { validateInternalService } from './middleware.js'

const SALT_ROUNDS = 10
const TOKEN_EXPIRY_HOURS = 24

export default async function (fastify) {
  // POST /register
  fastify.post('/register', async (request, reply) => {
    const transaction = await fastify.sequelize.transaction()
    
    try {
      // Sanitize input to prevent XSS
      const sanitized = sanitizeObject(request.body)
      const { username, email, password } = sanitized

      
      
      // Business Logic: Validate required fields
      if (!username || !email || !password) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Missing required fields: username, email, password' })
      }

      // Business Logic: Validate username format (min 3 chars)
      if (username.trim().length < 3) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Username must be at least 3 characters' })
      }

      // Business Logic: Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Invalid email format' })
      }

      // Business Logic: Validate password strength (min 8 chars, complex requirements)
      if (password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Password must be at least 8 characters long and include uppercase, lowercase, number and special character' })
      }

      // Business Logic: Check if user already exists
      const existingUser = await fastify.models.User.findOne({
        where: {
          [fastify.Sequelize.Op.or]: [{ username }, { email }]
        },
        transaction
      })

      

      if (existingUser) {
        await transaction.rollback()
        return reply.code(409).send({ error: 'Username or email already exists' })
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS)

      // Create user
      const user = await fastify.models.User.create({
        username,
        email,
        password_hash,
        is_online: false
      }, { transaction })

      

      // Generate OTP and send email for 2FA 
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      await fastify.models.OTP.create({
        user_id: user.id,
        code: otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes expiry
      }, { transaction })
      
      

      if (!otp) {
        await transaction.rollback()
        return reply.code(401).send({ error: 'Invalid or expired OTP' })
      }

      await fastify.mailer.sendMail({
        from: `"FT Transcendence" <ft_transcendence@libero.it>`,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`,
        html: `<p>Your OTP code is: <b>${otp}</b></p>`
      })

      

      await transaction.commit()

      // Return JSON payload expected by game-service for user sync
      return reply.code(201).send({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url || null
        }
      })
    } catch (error) {
      await transaction.rollback()
      console.error('[register] Error:', error)
      return reply.code(500).send({ error: 'Registration failed' })
    }
  })

  // POST /login
  fastify.post('/login', async (request, reply) => {
    const transaction = await fastify.sequelize.transaction()
    try {
      // Sanitize input to prevent XSS
      const sanitized = sanitizeObject(request.body || {})
      const { email, password } = sanitized

      // Business Logic: Validate required fields
      if (!email || !password) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Missing email or password' })
      }

      // Business Logic: Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Invalid email format' })
      }

      // Business Logic: Look up user
      const user = await fastify.models.User.findOne({
        where: { email }
      })

      // Business Logic: User not found (security: generic error)
      if (!user) {
        await transaction.rollback()
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      // Business Logic: Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash)

      if (!passwordValid) {
        await transaction.rollback()
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      // Update last_login timestamp
      await user.update({ last_login: new Date() }, { transaction })

      // Generate OTP and send email for 2FA 
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      await fastify.models.OTP.create({
        user_id: user.id,
        code: otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes expiry
      }, { transaction })
      
      if (!otp) {
        await transaction.rollback()
        return reply.code(401).send({ error: 'Invalid or expired OTP' })
      }

      await fastify.mailer.sendMail({
        to: user.email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`
      })

      await transaction.commit()

      return reply.send({ message: 'Logged in successfully' })
    } catch (error) {
      await transaction.rollback()
      console.error('[login] Error:', error)
      return reply.code(500).send({ error: 'Login failed' })
    }
  })

  // POST /otp/verify
  fastify.post('/otp/verify', async (request, reply) => {
    try {
      console.log("otp/verify called", request.body)
      const sanitized = sanitizeObject(request.body || {})
      const { userId, otp } = sanitized

      // Validate input
      if (!userId || !otp) {
        return reply.code(400).send({ error: 'Missing userId or code' })
      }

      // Check if OTP exists and is valid
      const OTP = await fastify.models.OTP.findOne({
        where: {
          user_id: userId,
          code: otp,
          expires_at: {
            [fastify.Sequelize.Op.gt]: new Date()
          }
        }
      })

      const user = await fastify.models.User.findByPk(userId)
      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Create session
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS)

      const session = await fastify.models.Session.create({
        user_id: user.id,
        token: uuidv4(),
        expires_at: expiresAt
      })

      // Sign JWT
      
      const token = fastify.jwt.sign({
        userId: user.id,
        username: user.username,
        sessionId: session.id
      })
      if (!token) {
        return reply.code(500).send({ error: 'Failed to generate access token' })
      }


      // OTP is valid, proceed with login
      await fastify.models.OTP.destroy({
        where: { id: OTP.id }
      })

      return reply.send({ user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url
      },
      access_token: token,
      expires_in: TOKEN_EXPIRY_HOURS * 3600
    })
  } catch (error) {
    console.error('[otp/verify] Error:', error)
    return reply.code(500).send({ error: 'OTP verification failed' })
  }
})

  // POST /logout
  fastify.post('/logout', async (request, reply) => {
    try {
      const payload = await request.jwtVerify()

      if (!payload) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      // Invalidate session
      const deleted = await fastify.models.Session.destroy({
        where: { 
          user_id: payload.userId,
          id: payload.sessionId
        }
      })

      if (deleted === 0) {
        return reply.code(404).send({ error: 'Session not found' })
      }

      return reply.send({ success: true })
    } catch (error) {
      console.error('[logout] Error:', error)
      return reply.code(401).send({ error: 'Logout failed' })
    }
  })

    // GET /verify
  fastify.get('/verify', async (request, reply) => {
    try {
      const payload = await request.jwtVerify()
      
      if (!payload) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      // Check if session still exists
      const session = await fastify.models.Session.findOne({
        where: {
          user_id: payload.userId,
          id: payload.sessionId
        }
      })

      if (!session || session.expires_at < new Date()) {
        return reply.code(401).send({ error: 'Session expired' })
      }

      return reply.send({
        valid: true,
        user: {
          id: payload.userId,
          username: payload.username
        }
      })
    } catch (error) {
      console.error('[verify] Error:', error)
      return reply.code(401).send({ error: 'Verification failed' })
    }
  })

  // Internal route: GET /internal/user/:id
  fastify.get('/internal/user/:id', {
    preHandler: validateInternalService
  }, async (request, reply) => {
    try {
      const user = await fastify.models.User.findByPk(request.params.id, {
        attributes: ['id', 'username', 'email', 'avatar_url', 'is_online']
      })

      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      return reply.send(user)
    } catch (error) {
      console.error('[internal/user] Error:', error)
      return reply.code(500).send({ error: 'Failed to fetch user' })
    }
  })

  // Internal route: POST /internal/validate-token
  // Used ONLY for internal verification from game-service
  fastify.post('/internal/validate-token', {
    preHandler: validateInternalService
  }, async (request, reply) => {
    try {
      const { token } = request.body

      if (!token) {
        return reply.code(400).send({ error: 'Missing token' })
      }

      try {
        const decoded = fastify.jwt.verify(token)
        
        // Check if session still valid
        const session = await fastify.models.Session.findOne({
          where: {
            user_id: decoded.userId,
            id: decoded.sessionId
          }
        })

        if (!session || session.expires_at < new Date()) {
          return reply.code(401).send({ error: 'Session expired' })
        }

        return reply.send({
          valid: true,
          userId: decoded.userId,
          username: decoded.username
        })
      } catch (jwtError) {
        return reply.code(401).send({ error: 'Invalid token' })
      }
    } catch (error) {
      console.error('[internal/validate-token] Error:', error)
      return reply.code(500).send({ error: 'Validation failed' })
    }
  })
}
