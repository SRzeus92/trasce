'use strict'

import path from 'path'
import AutoLoad from '@fastify/autoload'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import fastifyCors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import nodemailer from 'nodemailer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const options = {}

export default async function (fastify, opts) {
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'your-jwt-secret'
  })

// Configure nodemailer
fastify.decorate('mailer', nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.libero.it',
  port: process.env.MAIL_PORT || 465,
  secure: true, // port 465 requires secure true
  auth: {
    user: process.env.MAIL_USER || 'ft_transcendence@libero.it',
    pass: process.env.MAIL_PASS || 'Podererosa12!'
  }
}))

  await fastify.register(fastifyCors, {
    origin: true
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
