import xss from 'xss'
import validator from 'validator'

/**
 * Security utilities for game-service
 */

const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script']
}

export function sanitizeString(input) {
  if (typeof input !== 'string') return input
  return xss(input, xssOptions)
}

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

export const validators = {
  username: (value) => {
    if (!value || typeof value !== 'string') return false
    return /^[a-zA-Z0-9_]{3,20}$/.test(value)
  },
  
  email: (value) => {
    if (!value || typeof value !== 'string') return false
    return validator.isEmail(value)
  },
  
  password: (value) => {
    if (!value || typeof value !== 'string') return false
    return value.length >= 8 && 
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/.test(value)
  },

  // Numeric user id: positive integer
  userId: (value) => {
    if (value === undefined || value === null) return false
    const num = typeof value === 'string' ? Number(value) : value
    return Number.isInteger(num) && num > 0
  },

  // 6-digit OTP code (allow strings like "123456"). Trim spaces.
  otpCode: (value) => {
    if (value === undefined || value === null) return false
    // Normalize: convert to string, normalize unicode, strip all non-digits
    const s = String(value).normalize('NFKC').replace(/[^0-9]/g, '')
    return s.length === 6 && /^[0-9]{6}$/.test(s)
  }
}
