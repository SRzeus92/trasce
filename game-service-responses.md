# Game Service API - Response Formats

Questo documento descrive i formati delle response per tutte le API del game-service (orchestration layer).

## Codici di Stato Comuni
- `200`: Successo (GET, PUT, DELETE)
- `201`: Creato (POST)
- `400`: Bad Request (validazione fallita)
- `401`: Unauthorized (token mancante/invalido)
- `403`: Forbidden (autorizzazione fallita)
- `404`: Not Found
- `409`: Conflict (risorsa già esistente)
- `500`: Internal Server Error
- `503`: Service Unavailable (inter-service issues)

---

## POST /register
**Successo (201):**
```json
{
  "user": {
    "id": "integer",
    "username": "string",
    "email": "string",
    "avatar_url": "string|null"
  }
}
```

**Errori:**
- `400`: Missing fields, invalid format
- `409`: Username or email already exists
- `503`: Auth service unavailable

```json
{
  "error": "string (descrizione dell'errore)"
}
```

---

## POST /login
**Successo (200):**
```json
{
  "token": "string (JWT valido per 24 ore)",
  "user": {
    "email": "string",
    "username": "string"
  }
}
```

**Errori:**
- `400`: Missing email or password
- `401`: Invalid credentials
- `503`: Auth service unavailable

```json
{
  "error": "string"
}
```

---

## POST /logout
**Successo (200):**
```json
{
  "success": true
}
```

**Errori:**
- `400`: Missing token
- `503`: Auth service unavailable

---

## GET /profile (Own Profile)
**Successo (200):**
```json
{
  "user": {
    "id": "integer",
    "username": "string",
    "avatar": { "content_type": "string", "data_base64": "string" },
    "avatar_url": "string|null",
    "is_online": "boolean",
    "won_matches": "integer",
    "lost_matches": "integer",
    "total_score": "integer",
    "created_at": "date"
  },
  "friendships": [
    {
      "id": "integer",
      "username": "string",
      "avatar": { "content_type": "string", "data_base64": "string" },
      "avatar_url": "string|null",
      "is_online": "boolean",
      "friendship_status": "accepted|sent|new_request",
      "friendship_id": "integer"
    }
  ],
  "matches": [
    {
      "id": "integer",
      "opponent_alias": "string",
      "user_score": "integer",
      "opponent_score": "integer",
      "is_ai_match": "boolean",
      "played_at": "date"
    }
  ]
}
```

**Note**: Mostra TUTTE le relazioni (accepted, sent, new_request). L'utente vede tutto per gestire richieste di amicizia.

**Errori:**
- `401`: Invalid token
- `503`: User or match service unavailable

---

## GET /profile/:userId (Public Profile)
**Successo (200):**
```json
{
  "user": {
    "id": "integer",
    "username": "string",
    "avatar": { "content_type": "string", "data_base64": "string" },
    "avatar_url": "string|null",
    "is_online": "boolean",
    "won_matches": "integer",
    "lost_matches": "integer",
    "total_score": "integer",
    "created_at": "date"
  },
  "friends": [
    {
      "id": "integer",
      "username": "string",
      "avatar": { "content_type": "string", "data_base64": "string" },
      "avatar_url": "string|null",
      "is_online": "boolean"
    }
  ],
  "matches": [
    {
      "id": "integer",
      "opponent_alias": "string",
      "user_score": "integer",
      "opponent_score": "integer",
      "is_ai_match": "boolean",
      "played_at": "date"
    }
  ]
}
```

**Note**: Mostra SOLO amici accettati (friendship_status='accepted'). Le richieste di amicizia sono nascoste per privacy.

**Errori:**
- `401`: Invalid token
- `404`: User not found
- `503`: Services unavailable

---

## POST /profile/avatar
**Successo (201):**
```json
{
  "success": true,
  "avatar_url": "string (path relativo a /avatars)",
  "avatar": {
    "content_type": "string (es. image/png)",
    "data_base64": "string"
  }
}
```

**Errori:**
- `400`: Missing avatar file
- `401`: Invalid token
- `503`: User service unavailable

---

## GET /users (Leaderboard)
**Successo (200):**
```json
[
  {
    "id": "integer",
    "username": "string",
    "avatar": { "content_type": "string", "data_base64": "string" },
    "avatar_url": "string|null",
    "won_matches": "integer",
    "lost_matches": "integer",
    "total_score": "integer",
    "created_at": "date",
    "friendship_status": "self|accepted|sent|new_request|none",
    "is_online": "boolean (only if friendship_status='accepted')",
    "friendship_id": "integer (only if relationship exists)"
  }
]
```

**Note**: 
- `friendship_status='self'` per l'utente autenticato
- `is_online` visibile SOLO per `friendship_status='accepted'` (privacy enforcement)
- Ordinato per `total_score` (leaderboard)

**Errori:**
- `401`: Invalid token
- `503`: User service unavailable

---

## GET /users/all
**Successo (200):**
```json
[
  {
    "id": "integer",
    "username": "string",
    "avatar": { "content_type": "string", "data_base64": "string" },
    "avatar_url": "string|null",
    "is_online": "boolean",
    "won_matches": "integer",
    "lost_matches": "integer",
    "total_score": "integer",
    "created_at": "date"
  }
]
```

**Errori:**
- `503`: User service unavailable

---

## GET /users/:id
**Successo (200):**
```json
{
  "id": "integer",
  "username": "string",
  "avatar": { "content_type": "string", "data_base64": "string" },
  "avatar_url": "string|null",
  "is_online": "boolean",
  "won_matches": "integer",
  "lost_matches": "integer",
  "total_score": "integer",
  "created_at": "date"
}
```

**Errori:**
- `401`: Invalid token
- `404`: User not found
- `503`: User service unavailable

---

## POST /friendships
**Successo (201):**
```json
{
  "id": "integer",
  "sender_id": "integer",
  "receiver_id": "integer",
  "status": 0,
  "created_at": "date",
  "updated_at": "date",
  "friendship_status": "sent"
}
```

**Errori:**
- `400`: Missing receiver_id, sender_id = receiver_id
- `401`: Invalid token
- `404`: Receiver user not found
- `409`: Friendship already exists
- `503`: User service unavailable

```json
{
  "error": "string"
}
```

---

## PUT /friendships/:id/accept
**Successo (200):**
```json
{
  "id": "integer",
  "sender_id": "integer",
  "receiver_id": "integer",
  "status": 1,
  "created_at": "date",
  "updated_at": "date",
  "friendship_status": "friend"
}
```

**Errori:**
- `401`: Invalid token
- `403`: Only the receiver can accept
- `404`: Friendship request not found
- `400`: Friendship already accepted
- `503`: User service unavailable

---

## DELETE /friendships/:id
**Successo (200):**
```json
{
  "success": true
}
```

**Errori:**
- `401`: Invalid token
- `403`: Unauthorized (not part of friendship)
- `404`: Friendship not found
- `503`: User service unavailable

---

## GET /matches
**Successo (200):**
```json
[
  {
    "id": "integer",
    "user_id": "integer",
    "opponent_alias": "string",
    "user_score": "integer",
    "opponent_score": "integer",
    "is_ai_match": "boolean",
    "played_at": "date"
  }
]
```

**Ordine**: DESC per data (più recenti prima)

**Errori:**
- `401`: Invalid token
- `503`: Match service unavailable

---

## GET /matches/:id
**Successo (200):**
```json
{
  "id": "integer",
  "user_id": "integer",
  "opponent_alias": "string",
  "user_score": "integer",
  "opponent_score": "integer",
  "is_ai_match": "boolean",
  "played_at": "date"
}
```

**Errori:**
- `401`: Invalid token
- `404`: Match not found
- `503`: Match service unavailable

---

## POST /matches (PvP)
**Successo (201):**
```json
{
  "id": "integer",
  "user_id": "integer",
  "opponent_alias": "string",
  "user_score": "integer",
  "opponent_score": "integer",
  "is_ai_match": false,
  "played_at": "date"
}
```

**Business Logic applicato**:
- Stats aggiornate: won_matches, lost_matches, total_score (additivi)

**Errori:**
- `400`: Missing opponent_alias, invalid scores, opponent_alias = 'AI'/'IA'
- `401`: Invalid token
- `503`: Match or user service unavailable

```json
{
  "error": "string"
}
```

---

## POST /matches/ai (AI)
**Successo (201):**
```json
{
  "id": "integer",
  "user_id": "integer",
  "opponent_alias": "AI",
  "user_score": "integer",
  "opponent_score": "integer",
  "is_ai_match": true,
  "played_at": "date"
}
```

**Business Logic applicato**:
- Stats aggiornate: won_matches, lost_matches, total_score (additivi)
- opponent_alias sempre "AI"

**Errori:**
- `400`: Missing scores, invalid scores
- `401`: Invalid token
- `503`: Match or user service unavailable

---

## Error Response Structure

Tutti gli errori ritornano un oggetto con structure:
```json
{
  "error": "string (descrizione dettagliata dell'errore)"
}
```

### Codici di errore comuni:
- **400 Bad Request**: Input validation failed
  - Missing required fields
  - Invalid data format
  - Business rule violations
  
- **401 Unauthorized**: JWT token invalid/missing
  
- **403 Forbidden**: Authorization failed
  - Only receiver can accept friendship
  - User not part of friendship
  
- **404 Not Found**: Resource not found
  - User/match/friendship not found
  
- **409 Conflict**: Resource already exists
  - Username/email duplicate
  - Friendship already exists
  
- **503 Service Unavailable**: Inter-service communication failed
  - Auth-service, user-service, match-service down
  - Timeout in orchestration retry logic

---

## Notes on Data Structure

### avatar object
```json
{
  "content_type": "string (es. image/png, image/jpeg)",
  "data_base64": "string (base64 encoded file content)"
}
```
Non usare separatamente da `avatar_url`. Il frontend deve usare `avatar.data_base64` per rendering immediato (no extra fetch).

### friendship_status values
- `"self"`: L'utente stesso
- `"accepted"`: Amicizia accettata (status=1)
- `"sent"`: Richiesta inviata dall'utente corrente (status=0, sender)
- `"new_request"`: Richiesta ricevuta dall'utente corrente (status=0, receiver)
- `"none"`: No relationship

### Stats fields (won_matches, lost_matches, total_score)
- **won_matches**: Numero di partite vinte (incrementale)
- **lost_matches**: Numero di partite perse (incrementale)
- **total_score**: Somma algebrica degli score (user_score - opponent_score per ogni match)
- Aggiornati in POST /matches e POST /matches/ai via orchestration layer
