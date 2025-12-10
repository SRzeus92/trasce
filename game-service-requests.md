# Game Service API - Request Formats

Questo documento descrive i formati delle request per tutte le API del game-service (orchestration layer).

## Autenticazione
Alcune API richiedono un header `Authorization: Bearer <token>` ottenuto dal login.

---

## POST /register
**Autenticazione:** Non richiesta

**Body:**
```json
{
  "username": "string (3-20 caratteri, alfanumerico + underscore)",
  "email": "string (email valida)",
  "password": "string (min 8 caratteri, maiuscola + minuscola + numero + speciale)"
}
```

**Flow**: 
1. Game-service valida input (orchestration layer)
2. Chiama auth-service POST `/register` per creazione account
3. Sincronizza user a user-service via POST `/users` con retry logic

---

## POST /login
**Autenticazione:** Non richiesta

**Body:**
```json
{
  "email": "string (email dell'utente)",
  "password": "string (password in chiaro)"
}
```

**Flow**: 
1. Game-service valida input
2. Chiama auth-service POST `/login` con retry logic
3. Ritorna JWT token valido per 24 ore

---

## POST /logout
**Autenticazione:** Richiesta (JWT token)

**Header:** 
- `Authorization: Bearer <token>`

**Body:** Nessuno

**Flow**:
1. Game-service estrae token da header
2. Chiama auth-service POST `/logout` con retry logic
3. Invalida sessione

---

## GET /profile
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Parametri:** Nessuno

**Body:** Nessuno

**Flow**: 
1. Estrae userId da JWT
2. Chiama user-service GET `/users/{userId}/profile-with-friendships` (user + ALL relationships)
3. Chiama match-service GET `/matches/user/{userId}`
4. Ritorna: { user, friendships (all: accepted, sent, new_request), matches }

---

## GET /profile/:userId
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Parametri URL:**
- `userId`: integer (ID dell'utente da visualizzare)

**Body:** Nessuno

**Flow**:
1. Chiama user-service GET `/users/{userId}/profile-with-friendships`
2. Filtra nel game-service: friendships.filter(f => f.friendship_status === 'accepted')
3. Chiama match-service GET `/matches/user/{userId}`
4. Ritorna: { user, friends (accepted only), matches }

---

## POST /profile/avatar
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Body:** multipart/form-data
- Campo file richiesto: `avatar` (immagine in qualsiasi formato supportato)

**Flow**:
1. Game-service riceve stream multipart
2. Invia a user-service POST `/internal/users/:id/avatar` con stream (no base64 buffering)
3. User-service salva in `/avatars/{username}/{filename}`
4. Ritorna { success: true, avatar_url, avatar: {content_type, data_base64} }

---

## GET /users
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Parametri:** Nessuno

**Body:** Nessuno

**Flow**:
1. Estrae currentUserId da JWT
2. Chiama user-service GET `/users/with-friendship-status/{currentUserId}`
3. Aggiunge is_online SOLO per friendship_status='accepted' (privacy enforcement)
4. Ritorna leaderboard con friendship_status e stats

---

## GET /users/all
**Autenticazione:** Non richiesta (Public)

**Parametri:** Nessuno

**Body:** Nessuno

**Flow**:
1. Chiama user-service GET `/users` (basic users list)
2. Ritorna tutti gli utenti senza contexto di amicizia

---

## GET /users/:id
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Parametri URL:**
- `id`: integer (ID dell'utente)

**Body:** Nessuno

**Flow**:
1. Chiama user-service GET `/users/:id` con retry logic
2. Ritorna dati utente base

---

## POST /friendships
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "receiver_id": "integer (ID dell'utente a cui inviare richiesta)"
}
```

**Validazione (orchestration layer)**:
- receiver_id è obbligatorio
- sender_id ≠ receiver_id

**Flow**:
1. Game-service valida input
2. Estrae sender_id da JWT
3. Chiama user-service POST `/friendships/request` con retry logic
4. User-service: valida receiver exists, no duplicates, crea status=0

---

## PUT /friendships/:id/accept
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Parametri URL:**
- `id`: integer (ID della friendship request)

**Body:** Nessuno (userId estratto da JWT)

**Flow**:
1. Estrae userId da JWT
2. Chiama user-service PUT `/friendships/:id/accept` con user_id
3. User-service: valida authorization (only receiver), status 0→1

---

## DELETE /friendships/:id
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Parametri URL:**
- `id`: integer (ID della friendship)

**Body:** Nessuno (userId estratto da JWT)

**Flow**:
1. Estrae userId da JWT
2. Chiama user-service DELETE `/friendships/:id` con user_id
3. User-service: valida authorization (sender or receiver)

---

## GET /matches
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Parametri:** Nessuno

**Body:** Nessuno

**Flow**:
1. Estrae userId da JWT
2. Chiama match-service GET `/matches/user/{userId}` con retry logic
3. Ritorna cronologia partite

---

## GET /matches/:id
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Parametri URL:**
- `id`: integer (ID della partita)

**Body:** Nessuno

**Flow**:
1. Chiama match-service GET `/matches/:id` con retry logic
2. Ritorna dati partita

---

## POST /matches
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "opponent_alias": "string (nome dell'avversario PvP, ≠ 'AI'/'IA')",
  "user_score": "integer (punteggio del giocatore)",
  "opponent_score": "integer (punteggio dell'avversario)"
}
```

**Validazione (orchestration layer)**:
- opponent_alias ≠ 'AI' e ≠ 'IA' (riservato per AI matches)
- user_score e opponent_score obbligatori
- Scores non-negativi

**Business Logic (game-service)**:
1. Calcola: won = (user_score > opponent_score), lost = (user_score < opponent_score)
2. Calcola delta score: user_score - opponent_score

**Flow**:
1. Validazione input
2. Estrae userId da JWT
3. Chiama match-service POST `/matches` con { user_id, opponent_alias, user_score, opponent_score }
4. Chiama user-service PUT `/users/{userId}/stats` con { won_matches, lost_matches, total_score } (additive)
5. Ritorna match creato con is_ai_match: false

---

## POST /matches/ai
**Autenticazione:** Richiesta (JWT token)

**Header:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "user_score": "integer (punteggio del giocatore)",
  "opponent_score": "integer (punteggio dell'AI)"
}
```

**Validazione (orchestration layer)**:
- user_score e opponent_score obbligatori
- Scores non-negativi

**Business Logic (game-service)**:
1. Calcola: won = (user_score > opponent_score), lost = (user_score < opponent_score)
2. Calcola delta score: user_score - opponent_score
3. opponent_alias = "AI" (fisso)

**Flow**:
1. Validazione input
2. Estrae userId da JWT
3. Chiama match-service POST `/matches` con { user_id, opponent_alias: "AI", user_score, opponent_score }
4. Chiama user-service PUT `/users/{userId}/stats` con { won_matches, lost_matches, total_score }
5. Ritorna match creato con is_ai_match: true
