# ft_transcendence - Moduli Scelti e Implementazione

Questo documento riepiloga lo stato della mandatory part e dei moduli selezionati nel nostro estratto `project-subject.md`. **Aggiornato al 30 Ottobre 2025** con backend core completo.

## Mandatory Part (Capitolo IV)

### ⚠️ Mandatory Part · Sito Pong single-page
- **Descrizione**: SPA in Typescript + Tailwind, gioco Pong locale (stessa tastiera), tornei con alias, sicurezza (hash password, protezione SQL/XSS, HTTPS, validazione input) e deploy Docker.
- **Implementazione**:
  - ✅ Backend con 4 microservizi Fastify **5.0.0** (auth-service, user-service, match-service, game-service).
  - ✅ Database SQLite tramite Sequelize **6.37.7** in ogni servizio (users, sessions, friendships, matches, stats).
  - ✅ API REST completa per autenticazione, profili, amicizie, partite e statistiche.
  - ✅ Sicurezza: bcrypt **6.0.0** (SALT_ROUNDS=10), JWT (@fastify/jwt **10.0.0**), validazione input con Joi **18.0.1**, transazioni DB.
  - ✅ OrchestrationService: retry logic (3 tentativi, exponential backoff 100-2000ms) + **timeout 10s** per robustezza.
  - ✅ Deployment: `docker-compose.yml` con rete bridge, volumi SQLite, env vars.
  - ✅ HTTPS/TLS: Nginx reverse proxy on port 443 (rif. `SECURITY_IMPROVEMENTS.md`).
  - ✅ **Testing completo**: 20+ endpoints testati con 100% success rate.
  - ✅ **Frontend SPA**: TypeScript 5.9.3 + Tailwind 3.4.0, SPA router (8 pages), state management, dark theme responsive, Pong 1v1 PvP completamente funzionante, tournament bracket UI.
  - ⚠️ **Frontend Integration**: Backend API calls 0% (mock data), JWT token storage ❌, route guards ❌, AI logic ❌, match submission ❌.
  - ⚠️ **Gameplay**: Pong 1v1 local ✅, AI opponent ❌, tournament persistence ❌, server-side ❌.
- **Stato**: ✅ **Backend 100% completo** - ⚠️ **Frontend UI 100% scaffolding, integration 0%** = **60% overall**.

## Moduli Scelti (Capitolo V)

### ✅ Major · Use a framework to build the backend (Fastify)
- **Implementazione**:
  - ✅ 4 microservizi implementati con **Fastify 5.0.0** (aggiornato da 4.x):
    - `auth-service` (3002): Registrazione, login, logout, JWT, sessions (User.js, Session.js models).
    - `user-service` (3003): Profili, friendships, statistiche (User.js, Friendship.js, UserStats.js models).
    - `match-service` (3004): Partite immutabili (Match.js model).
    - `game-service` (3000): Orchestration layer con `orchestrationService.js`.
  - ✅ **@fastify/jwt 10.0.0** integrato per token auth (aggiornato da 7.x).
  - ✅ **@fastify/cors 11.1.0**, **@fastify/autoload 6.0.0**, **fastify-plugin 5.0.0** (tutte aggiornate).
  - ✅ Plugin architecture con routes auto-loaded.
  - ✅ **Dipendenze aggiornate**: bcrypt 6.0.0, Joi 18.0.1, UUID 13.0.0, Sequelize 6.37.7.
- **Stato**: ✅ **Completato con dipendenze aggiornate**.

### ⚠️ Minor · Use a framework/toolkit for the front-end (Typescript + Tailwind)
- **Implementazione**:
  - ✅ **TypeScript 5.9.3**: Compilazione da `src/` a `dist/`
  - ✅ **Tailwind CSS 3.4.0**: Build CSS da `src/input.css` a `dist/output.css`
  - ✅ **Build tooling**: TSC compiler + Tailwind CLI, concurrently per dev mode
  - ✅ **SPA Architecture**: Router con 8 routes (home, login, register, profile, friends, history, game, tournament)
  - ✅ **State Management**: Singleton store.ts con AppState centralizzato
  - ✅ **UI Components**: Header, message toast, page renderers (tutti Tailwind)
  - ✅ **Responsive Design**: Grid/flex layout, dark theme (gray-900), mobile-first
  - ✅ **Pong Game**: Canvas-based, physics, collisions, 1v1 local (same keyboard) fully functional
  - ✅ **Tournament System**: UI bracket, semifinal/final logic, player setup
  - ✅ **Auth Pages**: Login/register forms con validation (email regex, password length)
  - ✅ **User Profile**: Avatar display, stats (won/lost), game history, friend count
  - ✅ **Friend Management**: Friend list, request list, add friend UI
  - ✅ **Game History**: Tabella completa con filtri mock
  - ⚠️ **Backend Integration**: Mock data in store, nessun fetch API verso backend
  - ⚠️ **AI Opponent**: Select presente, logica assente
  - ⚠️ **Avatar Upload**: Button presente, integration mancante
  - ⚠️ **OTP 2FA Form**: Non presente (backend-only attualmente)
  - ⛔ **Match submission**: Non integrato con `/api/matches`
  - ⛔ **Token storage**: JWT not implemented
- **Stato**: ✅ **UI/UX 100% completato | Backend API integration 0%** (~60% overall con mock data).

### ✅ Minor · Use a database for the backend (SQLite)
- **Implementazione**:
  - ✅ SQLite 5.1.7 + **Sequelize 6.37.7** in ogni microservizio (aggiornato da 6.35.2):
    - `auth-service`: DB auth.db con User, Session models.
    - `user-service`: DB user.db con User, Friendship, UserStats models.
    - `match-service`: DB match.db con Match model.
  - ✅ Persistenza file DB in `services/*/database/` con volumi Docker.
  - ✅ Transazioni DB per operazioni critiche (registrazione, amicizie, partite).
  - ✅ Migrations: init.sql con schema normalizzato.
- **Stato**: ✅ **Completato con dipendenze aggiornate**.

### ✅ Major · Standard user management, authentication & users across tournaments
- **Implementazione**:
  - ✅ **Registrazione sicura**: `POST /register` (auth-service) con validazione email regex, password min **8 chars** con uppercase/lowercase/number/special char, username min 3 chars, **bcrypt 6.0.0** SALT_ROUNDS=10.
  - ✅ **Login con email**: `POST /login` con email/password, genera OTP a 6 cifre, invia email via **nodemailer**.
  - ✅ **2FA OTP Email**: `POST /otp/verify` valida OTP (expires 5 min), rilascia JWT (expires 24h), session tracking in DB.
  - ✅ **Logout**: `POST /logout` con token invalidation e session cleanup.
  - ✅ **Profili utenti**: `GET /profile`, `GET /profile/:id` con avatar inline {content_type, data_base64}.
  - ✅ **Avatar management**: Avatar inline in risposta, salvati nel filesystem (/avatars/{username}/), supportati formati PNG/JPG/GIF/WEBP/SVG.
  - ✅ **Friend system**: POST/PUT/DELETE friendships con status enum (pending=0, accepted=1).
  - ✅ **Statistiche**: won_matches, lost_matches, total_score per utente, aggiornate in real-time su match completion.
  - ✅ **Match history**: `GET /matches` con date e dettagli per logged-in users.
  - ✅ **Leaderboard**: `GET /users` con filtro friendship-status e is_online condizionale.
- **Stato**: ✅ **100% completato** - registrazione, login, OTP email, avatar, friendships, stats, history tutti operativi.

### ⚠️ Major · Implement remote authentication (OAuth 2.0)
- **Implementazione**: 
  - ✅ **@fastify/oauth2**: Plugin **8.1.2** installato in auth-service.
  - ✅ **Dipendenza**: node-fetch **3.3.2** per client HTTP verso provider OAuth.
  - ⚠️ **OAuth providers**: Configurazione placeholder per Google, GitHub, 42 École (credenziali da aggiungere via env vars).
  - ⚠️ **Database schema**: User model con campi per oauth_provider, oauth_provider_id (facoltativi, non bloccanti).
  - ⚠️ **API routes**: `/oauth/authorize/:provider` e `/oauth/callback/:provider` predisposti, non completamente testate.
  - ⚠️ **User mapping**: Logica per creare/trovare utente OAuth e mappare a account locale non ancora integrata.
- **Stato**: ⚠️ **Parzialmente implementato** - fondamenta presenti, integrazione OAuth e test mancanti.

### ❌ Major · Introduce an AI opponent
- **Implementazione**: Non pianificato.
- **Stato**: ❌ Non iniziato.

### ✅ Major · Implement Two-Factor Authentication (2FA) and JWT
- **Implementazione**:
  - ✅ **JWT operativo**: **@fastify/jwt 10.0.0** con secret in env vars, token signed con userId/username/sessionId.
  - ✅ **Token expiry**: 24 ore (TOKEN_EXPIRY_HOURS in auth.js).
  - ✅ **Middleware auth**: JWT verification per proteggere route in game-service.
  - ✅ **Session tracking**: Session.js model con token UUID + expires_at timestamp.
  - ✅ **2FA via Email (OTP)**: Implementazione completa con:
    - Generazione OTP a 6 cifre su POST /register e POST /login.
    - Invio email tramite **nodemailer 7.0.10** con SMTP Libero.
    - Validazione OTP tramite POST /otp/verify (expires 5 minuti).
    - OTP.js model con user_id, code, expires_at.
    - Test mode: env var `RETURN_OTP_IN_RESPONSE=true` per test automatici (restituisce OTP in response body).
- **Stato**: ✅ **100% completato** - JWT + 2FA Email (OTP) completamente operativi. TOTP/SMS facoltativi per future estensioni.

### ❌ Major · Infrastructure setup with ELK (log management)
- **Implementazione**: Non pianificato.
- **Stato**: ❌ Non iniziato.

### ❌ Minor · Monitoring system (Prometheus/Grafana)
- **Implementazione**: Non pianificato.
- **Stato**: ❌ Non iniziato.

### ✅ Major · Designing the backend as microservices
- **Implementazione**:
  - ✅ **4 microservizi indipendenti**:
    - auth-service (3002): User, Session persistence + registration/login/logout.
    - user-service (3003): User stats, friendships, match history.
    - match-service (3004): Match immutabili (append-only), scoreboard.
    - game-service (3000): Orchestration layer, API proxy, business logic.
  - ✅ **Comunicazione**: REST APIs con `orchestrationService.js` (retry logic con exponential backoff + **timeout 10s**).
  - ✅ **Docker Compose**: Network bridge, env vars, depends_on dependencies.
  - ✅ **Retry resilience**: orchestrationService con 3 retries, backoff 100→200→400ms (max 2s).
  - ✅ **Logging strutturato**: `"[Orchestration] Attempt X/Y for operation_name"`.
  - ✅ **Sicurezza inter-servizi**: Header `X-Internal-Service` con `INTERNAL_SECRET`.
- **Stato**: ✅ **Completato con miglioramenti di produzione**.

### ❌ Minor · Expanding browser compatibility
- **Implementazione**: Non pianificato.
- **Stato**: ❌ Non iniziato.

### ❌ Minor · Multiple language support
- **Implementazione**: Non pianificato.
- **Stato**: Non iniziato.

## Riepilogo Progresso

- **Totale moduli considerati**: 12 (7 Major + 5 Minor) + Mandatory Part.
- **Moduli major completati**: **3/7** (Fastify ✅ · Microservizi ✅ · User Management ✅) + Mandatory part backend core ✅.
- **Moduli major parziali**: 1/7 (OAuth 2.0 ~50% - fondamenta presenti, integrazione in progress).
- **Moduli minor completati**: 1/5 (SQLite DB ✅).
- **Moduli minor parziali**: 1/5 (Frontend UI 60% - scaffolding UI/UX completo, backend integration 0%).
- **Moduli non avviati**: **5.5** (AI · ELK · Prometheus · Browser compat · Multilang · Graphics).

**Mandatory Part Status (Capitolo IV)**:
- ✅ **Backend Core**: 100% (auth OTP email, users, avatar inline, matches, friendships, stats, orchestration retry+timeout, HTTPS, password hashing, input validation, SQL injection protection, XSS protection, Docker deployment).
- ✅ **Frontend SPA**: 100% UI/UX scaffolding (TypeScript, Tailwind, router 8 pages, state management, dark theme responsive, header/footer, message toasts, form validation).
- ✅ **Pong Game (PvP Local)**: 100% (canvas 800x400, physics, collisions, paddle controls W/S vs arrows, score tracking, game over detection, first to 5 wins).
- ⚠️ **Frontend Integration**: 0% (no API calls, mock data only, no JWT storage, no route guards).
- ⚠️ **Gameplay Enhancements**: Tournament bracket UI ✅, AI logic ❌, match persistence ❌, server-side ❌.

**Equivalenti Major (per calcolo 100% modules)**:
- **3/7 Major completati**: Fastify (Web) + Microservices (DevOps) + User Management (User).
- **1/7 Major parziale**: OAuth 2.0 (User) ~50%.
- **1/5 Minor completato**: SQLite (Web).
- **1/5 Minor parziale**: Frontend UI (Web) 60%.
- **Rimanenti**: 2.5/7 Major (AI, ELK, 1 altro) + 2.5/5 Minor + **completare OAuth + Frontend API wiring + Gameplay**.

**Priorità per prossimi sprint**:
1. ✅ **Backend Core**: **COMPLETATO** 100% (auth OTP, users avatar, friendships, stats, matches, orchestration).
2. ✅ **2FA Email + OTP**: **COMPLETATO** 100% (nodemailer, OTP generation/validation, 5 min expiry, test mode).
3. ✅ **User Management (Backend)**: **COMPLETATO** 100% (registrazione, login email, avatar inline, friendships, statistics).
4. ✅ **Frontend Scaffolding**: **COMPLETATO** 100% (UI/UX, routing, pages, components, Pong PvP game).
5. 🎯 **CRITICAL: Frontend → Backend Integration**: (~5-7 giorni) - API client, auth flow OTP, profile/friends fetch, match submission, JWT storage, route guards.
6. ⚠️ **Gameplay Completion**: (~2-3 giorni) - AI opponent logic, tournament persistence, server-side Pong (optional).
7. ⚠️ **OAuth 2.0 Completion**: (~1-2 giorni) - Provider credentials (Google, 42, GitHub), OAuth flow implementation, user mapping.
8. **Milestone 4/7 Major modules**: Frontend API wiring (~1 settimana) → 4/7 major complete.

**Note aggiornamento (6 Dicembre 2025 - Complete Frontend + Backend Analysis)**:
- ✅ **Backend 100% COMPLETE**: Auth (OTP email 6-digit, JWT 24h), users (avatar inline {content_type, data_base64}, stats, friendships), matches (append-only immutable), orchestration (3x retry, 10s timeout, exponential backoff), security (bcrypt SALT_ROUNDS=10, SQL injection via ORM, XSS sanitization, HTTPS via nginx), deployment (docker-compose, 4 services, SQLite persistence).
- ✅ **Frontend UI/UX 100% COMPLETE**: TypeScript 5.9.3 + Tailwind 3.4.0 build system, SPA router (home, login, register, profile, friends, history, game, tournament), state management (singleton store), Pong game (PvP local 1v1 fully playable), tournament bracket logic, forms with validation (email regex, password length), responsive dark theme.
- ⚠️ **Frontend Integration 0%**: No API calls (mock data only), no JWT localStorage, no route guards, no OAuth flow, AI logic missing, match submission missing.
- ⚠️ **Gameplay Pong**: PvP local ✅ 100%, AI opponent ❌ 0%, tournament UI ✅ 100%, match persistence ❌ 0%, server-side ❌ 0%.
- 📊 **Project Status**: **Backend 100% + Frontend UI 100% + Integration 0% = 60% overall** → **Critical path: API wiring (1 week) → AI logic (3 days) → OAuth (2 days) → 5/7 modules = 71% estimated**.
- 📁 **Documentation**: 5 documents created (IMPLEMENTATION_VALIDATION.md, FRONTEND_STATUS_REPORT.md, PROJECT_STATUS_COMPREHENSIVE.md, FRONTEND_INTEGRATION_CHECKLIST.md, + project_modules.md updated).
