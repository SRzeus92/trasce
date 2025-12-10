'use strict'

import path from 'path'
import AutoLoad from '@fastify/autoload'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import fastifyCors from '@fastify/cors'
import multipart from '@fastify/multipart'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const options = {}

export default async function (fastify, opts) {
  await fastify.register(fastifyCors, {
    origin: true
  })

  // Enable multipart parsing for avatar uploads (20 MB limit)
  await fastify.register(multipart, {
    attachFieldsToBody: false,
    limits: { fileSize: 20 * 1024 * 1024 }
  })

  // Register Sequelize database plugin
  await fastify.register(import('./sequelize/sequelize.js'))

  // Load plugins
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts),
    ignorePattern: /^sensible\.js$/
  })

  // Load routes
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts)
  })
}
