import Joi from 'joi'
import xss from 'xss'

/**
 * XSS Protection Options
 * Whitelist is empty to remove all HTML tags
 */
const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script']
}

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return input
  return xss(input, xssOptions)
}

/**
 * Sanitize all string fields in an object
 * @param {object} obj - Object to sanitize
 * @returns {object} Object with sanitized string fields
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj
  
  const sanitized = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

export function validateUserUpdate(data) {
  const schema = Joi.object({
    avatar_url: Joi.string().uri().optional(),
    username: Joi.string().alphanum().min(3).max(50).optional()
  })

  const { error, value } = schema.validate(data, { abortEarly: false })

  if (error) {
    return {
      valid: false,
      errors: error.details.map(detail => detail.message)
    }
  }

  return { valid: true, value }
}

export function validateFriendshipRequest(data) {
  const schema = Joi.object({
    friend_id: Joi.number().integer().required()
  })

  const { error, value } = schema.validate(data, { abortEarly: false })

  if (error) {
    return {
      valid: false,
      errors: error.details.map(detail => detail.message)
    }
  }

  return { valid: true, value }
}
