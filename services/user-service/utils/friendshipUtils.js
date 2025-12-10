/**
 * Friendship Status Utilities
 * 
 * Centralized logic for determining friendship status relative to a user.
 * Used by both friendships.js and users.js routes.
 * 
 * UNIFIED Friendship Status Values:
 * - "self": L'utente stesso
 * - "accepted": Amicizia accettata (status=1)
 * - "none": Nessuna richiesta di amicizia
 * - "sent": Richiesta inviata dall'utente (status=0, user è sender)
 * - "new_request": Richiesta ricevuta dall'utente (status=0, user è receiver)
 */

/**
 * Determine friendship status relative to a user
 * 
 * Returns unified status: "self" / "accepted" / "sent" / "new_request" / "none"
 * 
 * @param {Object} friendship - Friendship object or null
 * @param {number} userId - The user making the query (currentUserId)
 * @param {number} otherUserId - The user being evaluated
 * @returns {string} Status: "self" | "accepted" | "sent" | "new_request" | "none"
 */
export function calculateFriendshipStatus(friendship, userId, otherUserId) {
  // Self check
  if (userId === otherUserId) {
    return 'self'
  }

  // No friendship
  if (!friendship) {
    return 'none'
  }

  // Accepted friendship
  if (friendship.status === 1) {
    return 'accepted'
  }

  // Pending friendship (status === 0)
  if (friendship.status === 0) {
    // If user is the sender
    if (friendship.sender_id === userId) {
      return 'sent'
    }
    // If user is the receiver
    if (friendship.receiver_id === userId) {
      return 'new_request'
    }
  }

  return 'none'
}

/**
 * Build friendship lookup map for efficient querying
 * Maps otherUserId -> friendship object
 * 
 * @param {Array} friendships - Array of Friendship objects
 * @param {number} userId - Current user ID (used to identify otherUserId)
 * @returns {Object} Map of { otherUserId: friendship }
 */
export function buildFriendshipMap(friendships, userId) {
  const map = {}
  friendships.forEach(f => {
    const otherUserId = f.sender_id === userId ? f.receiver_id : f.sender_id
    map[otherUserId] = f
  })
  return map
}

/**
 * Determine whether to show is_online field based on friendship status
 * Privacy rule: Only show online status for accepted friends
 * 
 * @param {string} friendshipStatus - Status from calculateFriendshipStatus
 * @returns {boolean} True if is_online should be included in response
 */
export function shouldShowOnlineStatus(friendshipStatus) {
  return friendshipStatus === 'accepted'
}
