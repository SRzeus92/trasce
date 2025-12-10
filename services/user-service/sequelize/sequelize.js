import fp from 'fastify-plugin'
import { Sequelize } from 'sequelize'
import path from 'path'
import { fileURLToPath } from 'url'
import modelDefinitions from '../models/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default fp(async function (fastify, opts) {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/user.db')

  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,
    sync: { alter: true }
  })

  // Initialize models
  const models = {}
  Object.keys(modelDefinitions).forEach(modelName => {
    const modelDefinition = modelDefinitions[modelName]
    models[modelName] = modelDefinition(sequelize)
  })

  // Register models in Sequelize instance
  sequelize.models = models

  // Setup associations (User-Friendship relation)
  if (models.User && models.Friendship) {
    models.User.hasMany(models.Friendship, {
      foreignKey: 'sender_id',
      as: 'sentFriendships'
    })
    models.User.hasMany(models.Friendship, {
      foreignKey: 'receiver_id',
      as: 'receivedFriendships'
    })
    models.Friendship.belongsTo(models.User, {
      foreignKey: 'sender_id',
      as: 'sender'
    })
    models.Friendship.belongsTo(models.User, {
      foreignKey: 'receiver_id',
      as: 'receiver'
    })
  }

  // Sync database
  try {
    await sequelize.sync({ alter: true })
    console.log('[user-service] Database synced successfully')
  } catch (error) {
    console.error('[user-service] Database sync error:', error)
    throw error
  }

  // Decorate fastify with models and Sequelize
  fastify.decorate('models', models)
  fastify.decorate('Sequelize', Sequelize)
  fastify.decorate('sequelize', sequelize)
  console.log('[user-service] Sequelize decorations applied:', {
    hasModels: !!fastify.models,
    hasSequelize: !!fastify.Sequelize,
    hasSequelizeInstance: !!fastify.sequelize
  })

  // Graceful shutdown
  fastify.addHook('onClose', async (fastify) => {
    await sequelize.close()
  })
})
