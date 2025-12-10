import fetch from 'node-fetch'
import FormData from 'form-data'

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3002'
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3003'
const MATCH_SERVICE_URL = process.env.MATCH_SERVICE_URL || 'http://match-service:3004'

const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 100
const MAX_BACKOFF_MS = 2000
const REQUEST_TIMEOUT_MS = 10000 // 10 secondi timeout per richieste

/**
 * Ottiene gli header per chiamate interne ai microservizi
 * @returns {Object} Headers con autenticazione interna
 */
function getInternalHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Service': process.env.INTERNAL_SECRET
  }
}

/**
 * Wrapper per fetch con timeout
 * @param {string} url - URL da chiamare
 * @param {Object} options - Opzioni fetch
 * @returns {Promise<Response>} Risposta fetch
 * @throws {Error} Se timeout o errore di rete
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`)
    }
    throw error
  }
}

/**
 * Retry logic con exponential backoff
 * @param {Function} fn - Funzione async da ritentare
 * @param {string} context - Descrizione dell'operazione (per logging)
 * @param {number} retries - Numero massimo di tentativi
 * @param {number} backoffMs - Tempo di attesa iniziale (exponential backoff)
 * @returns {Promise<*>} Risultato della funzione
 * @throws {Error} Se tutti i tentativi falliscono
 */
async function retryWithBackoff(fn, context, retries = MAX_RETRIES, backoffMs = INITIAL_BACKOFF_MS) {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[Orchestration] Attempt ${attempt + 1}/${retries + 1} for ${context}`)
      const result = await fn()
      
      if (attempt > 0) {
        console.log(`[Orchestration] SUCCESS ${context} succeeded on attempt ${attempt + 1}`)
      }
      
      return result
    } catch (error) {
      lastError = error
      console.error(`[Orchestration] FAILED Attempt ${attempt + 1}/${retries + 1} for ${context}:`, error.message)

      if (attempt < retries) {
        const delay = Math.min(backoffMs * Math.pow(2, attempt), MAX_BACKOFF_MS)
        console.log(`[Orchestration] Retry in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(`${context} failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`)
}

export async function verifyOTP(userId, otp) {
  const context = `verifyOTP (userId: ${userId}, otp: ${otp})`
  
  return retryWithBackoff(async () => {
    const response = await fetchWithTimeout(`${AUTH_SERVICE_URL}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, otp})
    })

    if (!response.ok) {
      throw new Error(`Auth-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Sincronizza un nuovo utente da auth-service a user-service
 * Chiamato quando l'utente si registra tramite game-service
 */
export async function syncUserToUserService(userId, username, avatarUrl) {
  const context = `syncUserToUserService (userId: ${userId})`
  
  return retryWithBackoff(async () => {
    const payload = {
      id: userId,
      username,
      won_matches: 0,
      lost_matches: 0,
      total_score: 0
    }
    // Only include avatar_url if provided; avoid forcing null to let defaults apply
    if (avatarUrl) payload.avatar_url = avatarUrl

    const response = await fetchWithTimeout(`${USER_SERVICE_URL}/users`, {
      method: 'POST',
      headers: getInternalHeaders(),
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`User-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Ottiene i dati di un utente da auth-service
 * Usato per verificare che l'utente esista nei dati di auth
 */
export async function getUserFromAuthService(userId) {
  const context = `getUserFromAuthService (userId: ${userId})`
  
  return retryWithBackoff(async () => {
    const response = await fetchWithTimeout(`${AUTH_SERVICE_URL}/internal/user/${userId}`, {
      method: 'GET',
      headers: getInternalHeaders()
    })

    if (!response.ok) {
      throw new Error(`Auth-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Valida un token JWT tramite auth-service
 * Usato per verifiche di sicurezza addizionali
 */
export async function validateTokenWithAuthService(token) {
  const context = `validateTokenWithAuthService`
  
  return retryWithBackoff(async () => {
    const response = await fetchWithTimeout(`${AUTH_SERVICE_URL}/internal/validate-token`, {
      method: 'POST',
      headers: getInternalHeaders(),
      body: JSON.stringify({ token })
    })

    if (!response.ok) {
      throw new Error(`Auth-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Aggiorna le statistiche di un utente su user-service
 * Usato quando un match termina
 */
export async function updateUserStats(userId, wonMatches, lostMatches, totalScore) {
  const context = `updateUserStats (userId: ${userId})`
  
  return retryWithBackoff(async () => {
    const response = await fetch(`${USER_SERVICE_URL}/users/${userId}/stats`, {
      method: 'PUT',
      headers: getInternalHeaders(),
      body: JSON.stringify({
        won_matches: wonMatches,
        lost_matches: lostMatches,
        total_score: totalScore
      })
    })

    if (!response.ok) {
      throw new Error(`User-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Crea un match su match-service
 * Usato quando viene iniziato un nuovo match
 */
export async function createMatch(gameData) {
  const context = `createMatch (players: ${gameData.players})`
  
  return retryWithBackoff(async () => {
    const response = await fetch(`${MATCH_SERVICE_URL}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData)
    })

    if (!response.ok) {
      throw new Error(`Match-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Ottiene la cronologia dei match di un utente da match-service
 * Usato per visualizzare lo storico dei match
 */
export async function getUserMatches(userId) {
  const context = `getUserMatches (userId: ${userId})`
  
  return retryWithBackoff(async () => {
    const response = await fetch(`${MATCH_SERVICE_URL}/matches?user_id=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`Match-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Ottiene tutti i match
 */
export async function getAllMatches() {
  const context = `getAllMatches`
  
  return retryWithBackoff(async () => {
    const response = await fetch(`${MATCH_SERVICE_URL}/matches`, {
      method: 'GET',
      headers: getInternalHeaders()
    })

    if (!response.ok) {
      throw new Error(`Match-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Ottiene un match specifico da match-service
 */
export async function getMatchById(matchId) {
  const context = `getMatchById (matchId: ${matchId})`
  
  return retryWithBackoff(async () => {
    const response = await fetch(`${MATCH_SERVICE_URL}/matches/${matchId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`Match-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Ottiene un utente specifico da user-service
 */
export async function getUserFromUserService(userId) {
  const context = `getUserFromUserService (userId: ${userId})`
  
  return retryWithBackoff(async () => {
    const response = await fetch(`${USER_SERVICE_URL}/users/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`User-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Ottiene tutti gli utenti da user-service
 */
export async function getAllUsers() {
  const context = `getAllUsers`
  
  return retryWithBackoff(async () => {
    const response = await fetch(`${USER_SERVICE_URL}/users`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`User-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Ottiene tutti gli utenti con status amicizia relativo all'utente corrente
 */
export async function getUsersWithFriendshipStatus(currentUserId) {
  const context = `getUsersWithFriendshipStatus (currentUserId: ${currentUserId})`
  
  return retryWithBackoff(async () => {
    const response = await fetch(`${USER_SERVICE_URL}/users/with-friendship-status/${currentUserId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`User-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Carica l'avatar di un utente verso user-service
 * Frontend carica su game-service; questo helper inoltra il file come base64
 */
export async function uploadUserAvatar(userId, filename, fileStreamOrBuffer, contentType) {
  const context = `uploadUserAvatar (userId: ${userId}, filename: ${filename})`

  return retryWithBackoff(async () => {
    const form = new FormData()
    // Stream directly if possible to avoid buffering
    form.append('avatar', fileStreamOrBuffer, { filename, contentType })

    const headers = {
      ...getInternalHeaders(),
      ...form.getHeaders()
    }

    const response = await fetchWithTimeout(`${USER_SERVICE_URL}/internal/users/${userId}/avatar`, {
      method: 'POST',
      headers,
      body: form
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`User-service responded with ${response.status}: ${text}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Invia una richiesta di amicizia
 */
export async function sendFriendRequest(senderId, receiverId) {
  const context = `sendFriendRequest (from: ${senderId}, to: ${receiverId})`
  
  return retryWithBackoff(async () => {
    const response = await fetch(`${USER_SERVICE_URL}/friendships/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_id: senderId,
        receiver_id: receiverId
      })
    })

    if (!response.ok) {
      throw new Error(`User-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Accetta una richiesta di amicizia
 */
export async function acceptFriendRequest(friendshipId, userId) {
  const context = `acceptFriendRequest (friendshipId: ${friendshipId}, userId: ${userId})`
  
  return retryWithBackoff(async () => {
    const response = await fetch(`${USER_SERVICE_URL}/friendships/${friendshipId}/accept`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    })

    if (!response.ok) {
      throw new Error(`User-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Rimuove/rifiuta una richiesta di amicizia
 */
export async function removeFriendship(friendshipId, userId) {
  const context = `removeFriendship (friendshipId: ${friendshipId}, userId: ${userId})`
  
  return retryWithBackoff(async () => {
    const response = await fetch(`${USER_SERVICE_URL}/friendships/${friendshipId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    })

    if (!response.ok) {
      throw new Error(`User-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Login - Autentica l'utente tramite auth-service
 * Operazione critica con retry logic
 */
export async function loginUser(email, password) {
  const context = `loginUser (email: ${email})`
  
  return retryWithBackoff(async () => {
    const response = await fetchWithTimeout(`${AUTH_SERVICE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `Auth-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Registra un nuovo utente tramite auth-service
 * Operazione critica con retry logic
 */
export async function registerUser(username, email, password) {
  const context = `registerUser (username: ${username})`
  
  return retryWithBackoff(async () => {
    const response = await fetchWithTimeout(`${AUTH_SERVICE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `Auth-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}

/**
 * Logout - Invalida sessione utente tramite auth-service
 * Operazione critica con retry logic
 */
export async function logoutUser(token) {
  const context = `logoutUser`
  
  return retryWithBackoff(async () => {
    const response = await fetchWithTimeout(`${AUTH_SERVICE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    })

    if (!response.ok) {
      throw new Error(`Auth-service responded with ${response.status}`)
    }

    return await response.json()
  }, context, MAX_RETRIES)
}
