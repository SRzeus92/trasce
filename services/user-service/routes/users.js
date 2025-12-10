import { calculateFriendshipStatus, buildFriendshipMap, shouldShowOnlineStatus } from '../utils/friendshipUtils.js'
import { sanitizeObject } from '../utils/validation.js'
import { validateInternalService } from './middleware.js'
import { getAvatarData, saveAvatarData, saveAvatarStream } from '../utils/avatarUtils.js'

export default async function (fastify) {
  // GET /users
  fastify.get('/users', async (request, reply) => {
    try {
      const users = await fastify.models.User.findAll({
        attributes: ['id', 'username', 'avatar_url', 'is_online', 'won_matches', 'lost_matches', 'total_score', 'created_at']
      })

      // Attach avatar file data so callers don't need access to /avatars
      const withAvatars = await Promise.all(users.map(async (user) => ({
        id: user.id,
        username: user.username,
        // Replace avatar_url with avatar file payload
        avatar: await getAvatarData(user.avatar_url || 'avatars/default.jpg'),
        // Keep original field for backward compatibility (will be ignored by callers that use avatar)
        avatar_url: user.avatar_url,
        is_online: user.is_online,
        won_matches: user.won_matches,
        lost_matches: user.lost_matches,
        total_score: user.total_score,
        created_at: user.created_at
      })))

      return reply.send(withAvatars)
    } catch (error) {
      console.error('[GET /users] Error:', error)
      return reply.code(500).send({ error: 'Failed to fetch users' })
    }
  })

  // GET /users/with-friendship-status/:currentUserId - Get all users with friendship status relative to currentUser
  // Returns all users with friendship_status and conditional is_online (only if accepted friends)
  fastify.get('/users/with-friendship-status/:currentUserId', async (request, reply) => {
    try {
      const currentUserId = parseInt(request.params.currentUserId)

      // Get all users
      const allUsers = await fastify.models.User.findAll({
        attributes: ['id', 'username', 'avatar_url', 'is_online', 'won_matches', 'lost_matches', 'total_score', 'created_at']
      })

      // Get all friendships for current user
      const friendships = await fastify.models.Friendship.findAll({
        where: {
          [fastify.Sequelize.Op.or]: [
            { sender_id: currentUserId },
            { receiver_id: currentUserId }
          ]
        }
      })

      // Build lookup map for efficient friendship access
      const friendshipMap = buildFriendshipMap(friendships, currentUserId)

      // Build response with friendship_status for each user
      const result = await Promise.all(allUsers.map(async user => {
        const friendship = friendshipMap[user.id]
        const friendshipStatus = calculateFriendshipStatus(friendship, currentUserId, user.id)
        const showOnline = shouldShowOnlineStatus(friendshipStatus)

        // Build user object with conditional is_online
        const userObject = {
          id: user.id,
          username: user.username,
          // Provide avatar file payload instead of URL path
          avatar: await getAvatarData(user.avatar_url || 'avatars/default.jpg'),
          // Backward compatibility
          avatar_url: user.avatar_url,
          won_matches: user.won_matches,
          lost_matches: user.lost_matches,
          total_score: user.total_score,
          created_at: user.created_at,
          friendship_status: friendshipStatus
        }

        // Add is_online only if friendship status allows it
        if (showOnline) {
          userObject.is_online = user.is_online
        }

        // Add friendship_id if relationship exists
        if (friendship) {
          userObject.friendship_id = friendship.id
        }

        return userObject
      }))

      return reply.send(result)
    } catch (error) {
      console.error('[GET /users/with-friendship-status/:currentUserId] Error:', error)
      return reply.code(500).send({ error: 'Failed to fetch users with friendship status' })
    }
  })

    // GET /users/:id
  fastify.get('/users/:id', async (request, reply) => {
    try {
      const user = await fastify.models.User.findByPk(request.params.id, {
        attributes: ['id', 'username', 'avatar_url', 'is_online', 'won_matches', 'lost_matches', 'total_score', 'created_at']
      })

      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      return reply.send({
        id: user.id,
        username: user.username,
        avatar: await getAvatarData(user.avatar_url || 'avatars/default.jpg'),
        avatar_url: user.avatar_url,
        is_online: user.is_online,
        won_matches: user.won_matches,
        lost_matches: user.lost_matches,
        total_score: user.total_score,
        created_at: user.created_at
      })
    } catch (error) {
      console.error('[GET /users/:id] Error:', error)
      return reply.code(500).send({ error: 'Failed to fetch user' })
    }
  })

  // PUT /users/:id
  fastify.put('/users/:id', async (request, reply) => {
    try {
      // Sanitize input to prevent XSS
      const sanitized = sanitizeObject(request.body)
      const { id } = request.params
      const { avatar_url, username } = sanitized

      const user = await fastify.models.User.findByPk(id)

      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Update allowed fields
      if (avatar_url) {
        user.avatar_url = avatar_url
      }
      if (username) {
        user.username = username
      }

      await user.save()

      return reply.send(user)
    } catch (error) {
      console.error('[PUT /users/:id] Error:', error)
      return reply.code(500).send({ error: 'Failed to update user' })
    }
  })

  // Internal route: POST /internal/users/:id/avatar
  // Supports multipart upload (preferred) with field name "avatar" OR JSON { filename, data_base64 }
  // Saves avatar to /avatars/{username}/{filename} and updates user.avatar_url accordingly
  fastify.post('/internal/users/:id/avatar', {
    preHandler: validateInternalService
  }, async (request, reply) => {
    try {
      const userId = parseInt(request.params.id)
      const user = await fastify.models.User.findByPk(userId)
      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }
      let stored

      if (request.isMultipart && request.isMultipart()) {
        const file = await request.file()
        if (!file) {
          return reply.code(400).send({ error: 'Missing avatar file' })
        }
        // Save from stream to avoid buffering large files
        stored = await saveAvatarStream(user.username, file.filename, file.file)
      } else {
        // Backward-compatible JSON body: { filename, data_base64 }
        const { filename, data_base64 } = request.body || {}
        if (!filename || !data_base64) {
          return reply.code(400).send({ error: 'Missing filename or data_base64' })
        }
        const buffer = Buffer.from(String(data_base64), 'base64')
        stored = await saveAvatarData(user.username, filename, buffer)
      }

      user.avatar_url = stored.relativePath
      await user.save()

      return reply.code(201).send({
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        avatar: await getAvatarData(user.avatar_url)
      })
    } catch (error) {
      console.error('[POST /internal/users/:id/avatar] Error:', error)
      return reply.code(500).send({ error: 'Failed to upload avatar' })
    }
  })

  // GET /users/:id/profile - Get user + accepted friends (used by game-service profile endpoint)
  // GET /users/:id/profile-with-friendships - Get user + all friendship relationships
  // Used by: game-service GET /profile endpoints (returns all relationships so user can see requests)
  // Returns all friendships with status and calculated friendship_status
  fastify.get('/users/:id/profile-with-friendships', {
    preHandler: validateInternalService
  }, async (request, reply) => {
    try {
      const userId = parseInt(request.params.id)

      // Fetch user
      const user = await fastify.models.User.findByPk(userId, {
        attributes: ['id', 'username', 'avatar_url', 'is_online', 'won_matches', 'lost_matches', 'total_score', 'created_at']
      })

      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Fetch ALL friendships regardless of status
      const allFriendships = await fastify.models.Friendship.findAll({
        where: {
          [fastify.Sequelize.Op.or]: [
            { sender_id: userId },
            { receiver_id: userId }
          ]
        }
      })

      // Extract all friend/pending IDs
      const relationshipIds = allFriendships.map(f =>
        f.sender_id === userId ? f.receiver_id : f.sender_id
      )

      // Fetch all related users
      const relatedUsers = await fastify.models.User.findAll({
        where: { id: relationshipIds },
        attributes: ['id', 'username', 'avatar_url', 'is_online']
      })

      // Build friendships array with status info
      const friendships = await Promise.all(relatedUsers.map(async relatedUser => {
        const friendship = allFriendships.find(f =>
          (f.sender_id === userId && f.receiver_id === relatedUser.id) ||
          (f.receiver_id === userId && f.sender_id === relatedUser.id)
        )

        // Calculate friendship_status from user's perspective
        let friendshipStatus = 'none'
        if (friendship) {
          if (friendship.status === 1) {
            friendshipStatus = 'friend'
          } else if (friendship.status === 0) {
            // If user is sender, status is "pending"
            if (friendship.sender_id === userId) {
              friendshipStatus = 'pending'
            } else {
              // If user is receiver, status is "new_request"
              friendshipStatus = 'new_request'
            }
          }
        }

        return {
          id: relatedUser.id,
          username: relatedUser.username,
          // Provide avatar file payload instead of URL path
          avatar: await getAvatarData(relatedUser.avatar_url),
          // Backward compatibility
          avatar_url: relatedUser.avatar_url,
          is_online: relatedUser.is_online,
          friendship_status: friendshipStatus,
          friendship_id: friendship?.id
        }
      }))

      return reply.send({
        user: {
          id: user.id,
          username: user.username,
          avatar: await getAvatarData(user.avatar_url),
          avatar_url: user.avatar_url,
          is_online: user.is_online,
          won_matches: user.won_matches,
          lost_matches: user.lost_matches,
          total_score: user.total_score,
          created_at: user.created_at
        },
        friendships
      })
    } catch (error) {
      console.error('[GET /users/:id/profile-with-friendships] Error:', error)
      return reply.code(500).send({ error: 'Failed to fetch user profile with friendships' })
    }
  })

  // Internal route: POST /internal/users/sync
  fastify.post('/internal/users/sync', {
    preHandler: validateInternalService
  }, async (request, reply) => {
    const transaction = await fastify.sequelize.transaction()

    try {
      const { id, username, email, avatar_url } = request.body

      if (!id || !username) {
        await transaction.rollback()
        return reply.code(400).send({ error: 'Missing required fields' })
      }

      // Check if user exists
      let user = await fastify.models.User.findByPk(id, { transaction })

      if (!user) {
        // Create new user (with default stats in same record)
        const createPayload = {
          id,
          username,
          won_matches: 0,
          lost_matches: 0,
          total_score: 0
        }
        // Only set avatar_url if provided; otherwise let the model default apply
        if (avatar_url) createPayload.avatar_url = avatar_url

        user = await fastify.models.User.create(createPayload, { transaction })
      } else {
        // Update existing user
        if (username) user.username = username
        if (avatar_url) user.avatar_url = avatar_url
        await user.save({ transaction })
      }

      await transaction.commit()

      return reply.code(201).send(user)
    } catch (error) {
      await transaction.rollback()
      console.error('[internal/users/sync] Error:', error)
      return reply.code(500).send({ error: 'Sync failed' })
    }
  })

  // Internal route: PUT /users/:userId/stats - Incrementally update stats (additive)
  fastify.put('/users/:userId/stats', {
    preHandler: validateInternalService
  }, async (request, reply) => {
    const transaction = await fastify.sequelize.transaction()

    try {
      const { userId } = request.params
      const { won_matches, lost_matches, total_score } = request.body

      const user = await fastify.models.User.findByPk(userId, { transaction })

      if (!user) {
        await transaction.rollback()
        return reply.code(404).send({ error: 'User not found' })
      }

      // Incrementally update - ADD to existing values
      if (won_matches !== undefined && won_matches > 0) {
        user.won_matches = (user.won_matches || 0) + won_matches
      }
      if (lost_matches !== undefined && lost_matches > 0) {
        user.lost_matches = (user.lost_matches || 0) + lost_matches
      }
      if (total_score !== undefined && total_score > 0) {
        user.total_score = (user.total_score || 0) + total_score
      }

      await user.save({ transaction })
      await transaction.commit()

      return reply.send({
        id: user.id,
        won_matches: user.won_matches,
        lost_matches: user.lost_matches,
        total_score: user.total_score
      })
    } catch (error) {
      await transaction.rollback()
      console.error('[PUT /users/:userId/stats] Error:', error)
      return reply.code(500).send({ error: 'Failed to update stats' })
    }
  })

  // Internal route: POST /users - Sync user from auth-service (via game-service orchestration)
  fastify.post('/users', {
    preHandler: validateInternalService
  }, async (request, reply) => {
    try {
      const { id, username, avatar_url, won_matches, lost_matches, total_score } = request.body

      if (!id || !username) {
        return reply.code(400).send({ error: 'Missing id or username' })
      }

      // Check if user already exists
      let user = await fastify.models.User.findByPk(id)

      if (user) {
        // Update existing user
        user.username = username
        user.avatar_url = avatar_url || null
        await user.save()
      } else {
        // Create new user with provided stats or defaults
        const createPayload = {
          id,
          username,
          is_online: false,
          won_matches: won_matches || 0,
          lost_matches: lost_matches || 0,
          total_score: total_score || 0
        }
        // Only set avatar_url if provided; otherwise let the model default apply
        if (avatar_url) createPayload.avatar_url = avatar_url

        user = await fastify.models.User.create(createPayload)
      }

      return reply.code(201).send({
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        won_matches: user.won_matches,
        lost_matches: user.lost_matches,
        total_score: user.total_score
      })
    } catch (error) {
      console.error('[POST /users] Error:', error)
      return reply.code(500).send({ error: 'Failed to sync user' })
    }
  })
}
