'use strict'

import path from 'path'
import AutoLoad from '@fastify/autoload'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import multipart from '@fastify/multipart'
import fastifyCookie from '@fastify/cookie'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Pass --options via CLI arguments in command to enable these options.
export const options = {};

export default async function (fastify, opts) {

  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'your-jwt-secret',
    decoratorName: 'jwtUser'
  })

  await fastify.register(fastifyCors, {
    origin: true, // Allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  })

  await fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'your-cookie-secret'
  })

  await fastify.register(multipart, {
    attachFieldsToBody: false,
    limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
  });

  // Custom error handler
  fastify.setErrorHandler((error, request, reply) => {
    // Log dell'errore per debugging
    console.error('[Error Handler]', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      statusCode: error.statusCode
    })

    // Risposta consistente per gli errori
    const statusCode = error.statusCode || 500
    const message = statusCode >= 500 ? 'Internal Server Error' : error.message

    reply.code(statusCode).send({
      error: message,
      statusCode
    })
  })

  // Load plugins
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts),
    ignorePattern: /^sensible\.js$/
  })

  // Load routes
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts),
    ignorePattern: /^middleware\.js$/
  })
}