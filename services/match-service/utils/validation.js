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
