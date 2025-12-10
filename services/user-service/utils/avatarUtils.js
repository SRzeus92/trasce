import fs from 'node:fs/promises'
import fscb from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Absolute path to the avatars directory inside the user-service
const AVATARS_DIR = path.resolve(__dirname, '..', 'avatars')

const EXT_TO_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
}

/**
 * Safely resolves the avatar file path within the avatars directory.
 * Ensures only a file basename is used to prevent directory traversal.
 * @param {string|null|undefined} avatarUrl - Value stored on the user (may be a full/relative path).
 * @returns {string|null} Absolute path to the avatar file or null if not determinable.
 */
function safeJoinInside(baseDir, relativePath) {
  const full = path.resolve(baseDir, relativePath)
  const normalizedBase = path.resolve(baseDir) + path.sep
  if (!full.startsWith(normalizedBase)) return null
  return full
}

function resolveAvatarPath(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return null

  // Normalize separators
  let rel = avatarUrl.replace(/^\/*/, '')

  // If the stored path includes a prefix like 'avatars/...', strip it to make it relative to AVATARS_DIR
  if (rel.toLowerCase().startsWith('avatars/')) {
    rel = rel.slice('avatars/'.length)
  }

  // Prevent directory traversal and ensure nested paths are allowed under AVATARS_DIR
  const safe = safeJoinInside(AVATARS_DIR, rel)
  if (safe) return safe

  // Fallback to basename-only resolution
  const base = path.basename(avatarUrl)
  if (!base) return null
  return path.join(AVATARS_DIR, base)
}

/**
 * Reads the avatar file and returns a JSON-friendly structure with base64 data and content type.
 * If the file cannot be read, returns null.
 *
 * Return contract:
 * - null when no avatar is available
 * - { content_type: string, data_base64: string }
 */
export async function getAvatarData(avatarUrl) {
  try {
    const filePath = resolveAvatarPath(avatarUrl)
    if (!filePath) return null

    const buffer = await fs.readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const contentType = EXT_TO_MIME[ext] || 'application/octet-stream'

    return {
      content_type: contentType,
      data_base64: buffer.toString('base64')
    }
  } catch (err) {
    // File not found or unreadable; gracefully return null so callers can decide defaults
    return null
  }
}

function sanitizeSegment(segment) {
  // Allow only letters, numbers, dashes, underscores, and dots (for filenames)
  return String(segment)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
}

/**
 * Saves avatar binary data under /avatars/{username}/{filename}
 * @param {string} username - User's username used as directory name
 * @param {string} filename - Desired filename (original)
 * @param {Buffer} buffer - File content
 * @returns {Promise<{ relativePath: string, absolutePath: string }>} Paths to stored file
 */
export async function saveAvatarData(username, filename, buffer) {
  const safeUser = sanitizeSegment(username || 'user') || 'user'
  const baseName = sanitizeSegment(path.basename(filename || 'avatar')) || 'avatar'

  const userDir = path.join(AVATARS_DIR, safeUser)
  await fs.mkdir(userDir, { recursive: true })

  let target = path.join(userDir, baseName)

  // Avoid overwriting: if exists, suffix with a counter
  let counter = 1
  const { name, ext } = path.parse(baseName)
  try {
    while (true) {
      try {
        await fs.access(target)
        const nextName = `${name}-${counter++}${ext}`
        target = path.join(userDir, nextName)
      } catch {
        break // target doesn't exist
      }
    }
  } catch {
    // ignore
  }

  await fs.writeFile(target, buffer)
  const relativePath = path.join('avatars', safeUser, path.basename(target))
  return { relativePath, absolutePath: target }
}

export { AVATARS_DIR }

/**
 * Saves avatar from a readable stream to /avatars/{username}/{filename} without buffering all data
 * @param {string} username
 * @param {string} filename
 * @param {Readable} stream
 * @returns {Promise<{ relativePath: string, absolutePath: string }>}
 */
export async function saveAvatarStream(username, filename, stream) {
  const safeUser = sanitizeSegment(username || 'user') || 'user'
  const baseName = sanitizeSegment(path.basename(filename || 'avatar')) || 'avatar'

  const userDir = path.join(AVATARS_DIR, safeUser)
  await fs.mkdir(userDir, { recursive: true })

  let target = path.join(userDir, baseName)

  // Avoid overwriting: if exists, suffix with a counter
  let counter = 1
  const { name, ext } = path.parse(baseName)
  while (true) {
    try {
      await fs.access(target)
      const nextName = `${name}-${counter++}${ext}`
      target = path.join(userDir, nextName)
    } catch {
      break // target doesn't exist
    }
  }

  const writeStream = fscb.createWriteStream(target)
  await pipeline(stream, writeStream)

  const relativePath = path.join('avatars', safeUser, path.basename(target))
  return { relativePath, absolutePath: target }
}
