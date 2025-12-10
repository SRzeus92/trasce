````markdown
# API Endpoints - Microservices Architecture (Opzione 2)

Questo documento elenca tutte le API esposte dai microservizi nel progetto ft_transcendence.

---

## Auth-Service (porta 3002)
Servizio di autenticazione e autorizzazione. **Isolation layer per credenziali e sessioni**. Comunicato solo da game-service per evitare accoppiamento.

### Authentication (Public)
- `POST /register`  
  Registra un nuovo utente (body: `username`, `email`, `password`).
  Ritorna: `{ user: { id, username, email, avatar_url }, message? }` (201)
  - Genera OTP, invia email
  - Crea sessione temporanea

- `POST /login`  
  Effettua il login (body: `email`, `password`).
  Ritorna: `{ token, user: { username, email }, message? }` (200)
  - Genera JWT con 24h expiry
  - Password verificato con bcrypt

### Internal APIs (inter-servizi, con X-Internal-Service header)
- `GET /internal/user/:id`  
  Fetch user per ID (interno, no auth).
  Ritorna: `{ id, username, email, avatar_url, is_online }`

- `POST /otp/verify`  
  Verifica OTP code (body: `userId`, `otp`).
  Ritorna: `{ valid: true }` (200) o error (400)

---

## User-Service (porta 3003)
Servizio di gestione utenti, profili e amicizie. **Persistence layer per user domain**. Comunica solo con game-service per inter-service calls.

### Users (Internal, X-Internal-Service header)
- `GET /users`  
  Restituisce tutti gli utenti base.
  Ritorna: `[{ id, username, avatar: {content_type, data_base64}, avatar_url, is_online, won_matches, lost_matches, total_score, created_at }, ...]` (200)

- `GET /users/with-friendship-status/:currentUserId`  
  Restituisce tutti gli utenti con `friendship_status` relativo a currentUser.
  `is_online` visibile **solo** se `friendship_status: "accepted"` (privacy).
  Ritorna: `[{ id, username, avatar: {...}, friendship_status, is_online?, friendship_id?, ... }, ...]` (200)

- `GET /users/:id`  
  Restituisce un utente specifico.
  Ritorna: `{ id, username, avatar: {content_type, data_base64}, avatar_url, is_online, won_matches, lost_matches, total_score, created_at }` (200)

- `GET /users/:id/profile-with-friendships` *(Interno)*  
  **Profilo completo**: utente + TUTTE le relazioni (accepted, sent, new_request).
  Ritorna: `{ user: {...}, friendships: [{id, username, avatar: {...}, friendship_status, is_online, friendship_id}, ...] }` (200)

- `PUT /users/:id`  
  Aggiorna utente (avatar_url, username).
  Ritorna: `{ id, username, avatar_url, ... }` (200)

- `POST /internal/users/:id/avatar` *(Interno, multipart o JSON)*  
  Carica avatar a `/avatars/{username}/{filename}` (stream-safe, no buffering).
  Input: Multipart field `avatar` oppure JSON `{ filename, data_base64 }`
  Ritorna: `{ id, username, avatar_url, avatar: {content_type, data_base64} }` (201)

- `PUT /users/:id/stats` *(Interno, additive)*  
  Aggiorna stats: `won_matches`, `lost_matches`, `total_score` (incrementali).
  Input: `{ won_matches: int, lost_matches: int, total_score: int }`
  Ritorna: `{ id, ... }` (200)

### Friendships (Internal, X-Internal-Service header)
- `POST /friendships/request`  
  Crea richiesta di amicizia con validazione (no self-add, no duplicates).
  Input: `{ sender_id, receiver_id }`
  Ritorna: `{ id, sender_id, receiver_id, status: 0, created_at, updated_at, friendship_status }` (201)

- `PUT /friendships/:id/accept`  
  Accetta richiesta (only receiver, status: 0→1).
  Input: `{ user_id }`
  Ritorna: `{ id, sender_id, receiver_id, status: 1, created_at, updated_at, friendship_status: "friend" }` (200)

- `DELETE /friendships/:id`  
  Rifiuta o rimuove amicizia (sender or receiver).
  Input: `{ user_id }`
  Ritorna: `{ success: true }` (200)

---

## Match-Service (porta 3004)
Servizio di gestione partite. **Persistence layer immutabile per match domain**. Comunica solo con game-service.

### Matches (Internal, X-Internal-Service header)
- `GET /matches`  
  Restituisce tutte le partite ordinate per data (DESC).
  Ritorna: `[{ id, user_id, opponent_alias, user_score, opponent_score, is_ai_match?, played_at }, ...]` (200)

- `GET /matches/:id`  
  Restituisce una partita specifica.
  Ritorna: `{ id, user_id, opponent_alias, user_score, opponent_score, is_ai_match?, played_at }` (200)

- `GET /matches/user/:userId`  
  Restituisce cronologia partite di un utente (ordinate DESC).
  Ritorna: `[{ id, user_id, opponent_alias, user_score, opponent_score, is_ai_match?, played_at }, ...]` (200)

- `POST /matches`  
  Crea partita (immutabile, scores obbligatori).
  Input: `{ user_id, opponent_alias, user_score, opponent_score, is_ai_match? }`
  Validazioni: scores non-negativi, opponent_alias richiesto
  Ritorna: `{ id, user_id, opponent_alias, user_score, opponent_score, is_ai_match, played_at }` (201)

---

## Game-Service (porta 3000)
**Orchestrator layer**: Input validation, autorizzazione JWT, coordinamento cross-domain, business logic, retry logic per inter-service calls.

### Authentication (Public)
- `POST /register`  
  Registra nuovo utente (chiama: auth-service + user-service sync).
  Input: `{ username, email, password }`
  Ritorna: `{ user: { id, username, email, avatar_url } }` (201)

- `POST /login`  
  Login (chiama: auth-service).
  Input: `{ email, password }`
  Ritorna: `{ token, user: { username, email }, message }` (200)

- `POST /logout`  
  Logout (chiama: auth-service).
  Header: `Authorization: Bearer <token>`
  Ritorna: `{ success: true }` (200)

### Profile (JWT required)
- `GET /profile`  
  **Own profile**: user + all friendships + match history (chiama: user-service + match-service).
  Ritorna: `{ user: {...}, friendships: [{...friendship_status, is_online?, ...}], matches: [...] }` (200)

- `GET /profile/:userId`  
  **Public profile**: altro utente (chiama: user-service + match-service).
  Filtra friendships nel game-service: solo accepted friends + loro is_online.
  Ritorna: `{ user: {...}, friends: [{only accepted, with is_online}], matches: [...] }` (200)

- `POST /profile/avatar` *(JWT, multipart)*  
  Upload avatar (chiama: user-service inoltro stream).
  Input: multipart field `avatar` (file)
  Ritorna: `{ success: true, avatar_url, avatar: {content_type, data_base64} }` (201)

### Users (JWT required)
- `GET /users`  
  Leaderboard con friendship_status (chiama: user-service).
  Ritorna: `[{ id, username, avatar, friendship_status, is_online?, won_matches, total_score, ... }, ...]` (200)
  Note: `is_online` solo se `friendship_status: "accepted"` (privacy)

- `GET /users/:id`  
  User specifico (chiama: user-service).
  Ritorna: `{ id, username, avatar, is_online, won_matches, lost_matches, total_score, ... }` (200)

- `GET /users/all` *(Public)*  
  Tutti gli utenti senza JWT (chiama: user-service).
  Ritorna: `[{ id, username, avatar, ... }, ...]` (200)

### Friendships (JWT required)
- `POST /friendships`  
  Invia richiesta amicizia (chiama: user-service).
  Input: `{ receiver_id }`
  Validazione: receiver_id ≠ sender_id, receiver esiste
  Ritorna: `{ id, sender_id, receiver_id, status: 0, friendship_status, ... }` (201)

- `PUT /friendships/:id/accept`  
  Accetta richiesta (chiama: user-service).
  Ritorna: `{ id, sender_id, receiver_id, status: 1, friendship_status: "friend", ... }` (200)

- `DELETE /friendships/:id`  
  Rifiuta/rimuove amicizia (chiama: user-service).
  Ritorna: `{ success: true }` (200)

### Matches (JWT required)
- `GET /matches`  
  Cronologia partite (chiama: match-service).
  Ritorna: `[{ id, opponent_alias, user_score, opponent_score, is_ai_match, played_at }, ...]` (200)

- `GET /matches/:id`  
  Partita specifica (chiama: match-service).
  Ritorna: `{ id, opponent_alias, user_score, opponent_score, is_ai_match, played_at }` (200)

- `POST /matches` *(PvP)*  
  Crea partita vs umano (chiama: match-service + user-service stats update).
  Input: `{ opponent_alias, user_score, opponent_score }`
  Validazione: opponent_alias ≠ "AI"/"IA", scores obbligatori
  Business logic: Calcola won/lost, aggiorna stats additivamente
  Ritorna: `{ id, opponent_alias, user_score, opponent_score, is_ai_match: false, played_at }` (201)

- `POST /matches/ai` *(AI)*  
  Crea partita vs AI (chiama: match-service + user-service stats update).
  Input: `{ user_score, opponent_score }` (opponent_alias = "AI")
  Business logic: Calcola won/lost, aggiorna stats
  Ritorna: `{ id, opponent_alias: "AI", user_score, opponent_score, is_ai_match: true, played_at }` (201)

---

## Architecture Layers

### Opzione 2: Business Logic in Services, Orchestration in Game-Service

**Auth-Service**: Gestione credenziali, JWT, sessioni.

**User-Service**: Business logic per users e friendships.
- Validazione receiver exists
- Validazione duplicati amicizie
- Calcolo friendship_status (accepted, sent, new_request, none, self)
- Gestione accepted vs pending friendships

**Match-Service**: Persistence immutabile per partite.
- Crea-only: no updates, immutable records
- Tracked: user_id, opponent_alias, scores, timestamp

**Game-Service**: Orchestration e coordinamento.
- Input validation (JWT, body structure)
- Cross-service coordination (auth + user + match)
- Business logic: stats aggregation, filtering for public view
- Public profile filtering: hidden pending requests
- is_online conditional visibility: only for accepted friendships

---

## Friendship Status Values

Usato in endpoints: `GET /users`, `GET /users/with-friendship-status/:currentUserId`, `GET /profile/:userId`

| Status | Significato | Quando appare |
|--------|-------------|---------------|
| `"accepted"` | Amicizia accettata (status=1) | Profili pubblici, leaderboard |
| `"sent"` | Richiesta in sospeso inviata dall'utente corrente | Profilo own, leaderboard |
| `"new_request"` | Richiesta ricevuta dall'utente corrente | Profilo own |
| `"none"` | No relationship | Leaderboard con altri utenti |
| `"self"` | L'utente stesso | Leaderboard per se stessi |

Privacy Rule: `is_online` visibile **solo** per `friendship_status: "accepted"`.

---

## Notes

- **Autenticazione**: Tutti gli endpoint game-service protetti con JWT (tranne register/login).
- **Comunicazione Inter-Servizi**: Game-service chiama altri servizi via HTTP con retry logic.
- **Database Isolation**: Ogni servizio ha il proprio database isolato (auth.db, user.db, match.db).
- **Error Handling**: Codici HTTP standard (200, 201, 400, 401, 403, 404, 409, 500, 503).
- **Transactions**: Usate per operazioni critiche su multiple entities (user sync, friendship requests).
````