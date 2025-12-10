# ft_transcendence

Applicazione web per tornei e match in stile Pong, basata su architettura a microservizi Node.js con database SQLite distribuiti.

## Stack Tecnologico
- **Backend**: Node.js 20.x, Fastify 5.0.0, JWT, bcrypt 6.0.0, Joi 18.0.1
- **Database**: SQLite 5.1.7 tramite Sequelize 6.37.7 (un database per servizio)
- **Sicurezza**: XSS protection (xss 1.0.15), SQL injection prevention (Sequelize ORM), JWT authentication
- **Frontend**: HTML statico + TypeScript + Tailwind CSS (build compilato, dati mock per prototipazione UI)
- **Reverse proxy**: Nginx con supporto HTTPS/TLS
- **Container orchestration**: Docker Compose

## Architettura Microservizi

### Backend Services (4 microservizi indipendenti)

- **game-service** (`services/game-service`, porta 3000)
  - **Ruolo**: Gateway/Orchestrazione delle API business logic
  - **Responsabilità**: Coordinamento tra servizi, endpoint pubblici, gestione sessioni utente
  - **Database**: Nessuno (stateless, delega persistenza agli altri servizi)
  - **Caratteristiche**: Retry logic (3 tentativi), orchestrationService per chiamate inter-service

- **auth-service** (`services/auth-service`, porta 3002)
  - **Ruolo**: Autenticazione e autorizzazione
  - **Responsabilità**: Registrazione, login, logout, generazione JWT, gestione sessioni, OTP
  - **Database**: SQLite (`auth.db`) con tabelle User, Session, OTP
  - **Sicurezza**: bcrypt hashing (SALT_ROUNDS=10), JWT con secret, XSS sanitization

- **user-service** (`services/user-service`, porta 3003)
  - **Ruolo**: Gestione profili utente e relazioni sociali
  - **Responsabilità**: Profili, avatar, statistiche, friendships (inviti/accettazione/rimozione)
  - **Database**: SQLite (`users.db`) con tabelle User, UserStats, Friendship
  - **Features**: Sistema amicizie bidirezionale, calcolo statistiche aggregate

- **match-service** (`services/match-service`, porta 3004)
  - **Ruolo**: Storico partite e tornei
  - **Responsabilità**: Registrazione match immutabili, tornei, classifiche
  - **Database**: SQLite (`matches.db`) con tabelle Match, Tournament, TournamentParticipant
  - **Caratteristiche**: Record immutabili delle partite, tracciamento vincitori

### Frontend & Infrastructure

- **frontend** (`frontend/`): Applicazione frontend statica TypeScript + Tailwind CSS con dati mock per prototipazione UI
  - Build automatica nel Dockerfile nginx (stage multi-phase)
  - Router client-side per navigazione tra pagine (home, login, register, profile, friends, history, game, tournament)
  - Store mock per simulazione stato applicativo
  - Non ancora integrato con backend API (attualmente usa dati statici)
- **nginx** (`nginx/`): Reverse proxy HTTPS/TLS (porta 443), routing `/api/*` verso game-service, serve frontend statico su `/`

### Documentazione Dettagliata

- `api_endpoints.md`: Elenco completo endpoint pubblici
- `game-service-requests.md` / `game-service-responses.md`: Payload API dettagliati
- `AVATAR_GUIDE.md`: Guida completa upload/visualizzazione avatar (frontend + servizi)
- `project_modules.md`: Stato implementazione requisiti del subject
- `SECURITY_IMPROVEMENTS.md`: Analisi sicurezza applicativa
- `DEPENDENCIES_UPDATE_PLAN.md`: Piano aggiornamento dipendenze

## Funzionalità Implementate ✅

### Autenticazione & Sicurezza
- ✅ Registrazione utenti con validazione completa (username, email, password)
- ✅ Login con generazione JWT (expiry 24h)
- ✅ Logout con invalidazione sessione
- ✅ Protezione XSS su tutti gli input (sanitizeObject/sanitizeString)
- ✅ SQL injection prevention tramite Sequelize ORM
- ✅ Password hashing con bcrypt (10 rounds)
- ✅ JWT verification middleware per route protette
- ✅ HTTPS/TLS tramite Nginx reverse proxy

### Gestione Utenti
- ✅ Profili utente completi (username, email, avatar, bio)
- ✅ Upload avatar con validazione
- ✅ Visualizzazione profilo pubblico/privato
- ✅ Statistiche utente (win/loss rate, match totali, win streak)
- ✅ Sistema di amicizie bidirezionale
  - Invio richiesta amicizia
  - Accettazione/rifiuto inviti
  - Lista amici con stato online
  - Rimozione amicizie

### Match & Tornei
- ✅ Registrazione match con punteggi immutabili
- ✅ Storico partite per utente
- ✅ Creazione tornei con partecipanti
- ✅ Tracking progressione torneo
- ✅ Classifiche e statistiche aggregate
- ✅ Vincitori e piazzamenti

### Architettura & DevOps
- ✅ 4 microservizi indipendenti con DB separati
- ✅ Orchestration service con retry logic (3 tentativi, exponential backoff 100-2000ms) + **timeout 10s**
- ✅ Docker Compose per deploy completo
- ✅ Logging strutturato per debugging (standardizzato in inglese)
- ✅ Script di test end-to-end automatici (**20+ endpoints testati, 100% success rate**)

## Requisiti
- Docker e Docker Compose.
- (Opzionale) Node.js 20+ per sviluppo locale dei servizi.

## Avvio Rapido 🚀

### Produzione (Docker Compose)
```bash
# Avvio completo con build
docker-compose up --build

# Oppure in background
docker-compose up -d --build
```

**Servizi disponibili:**
- Frontend: https://localhost (HTTPS via Nginx)
- game-service: http://localhost:3000
- auth-service: http://localhost:3002
- user-service: http://localhost:3003
- match-service: http://localhost:3004

### Test End-to-End
```bash
# Script automatico che testa tutti i servizi
sudo ./scripts/test_services.sh
```

### Comandi Docker Compose Utili
```bash
# Ricostruire un singolo servizio
docker-compose build game-service

# Avviare/riavviare servizi specifici
docker-compose up -d game-service
docker-compose restart auth-service

# Vedere i log
docker-compose logs -f game-service
docker-compose logs --tail=50 auth-service

# Fermare tutto
docker-compose down

# Fermare e rimuovere volumi (⚠️ cancella database)
docker-compose down -v

# Vedere lo stato dei servizi
docker-compose ps
```

## Sviluppo Locale 💻

### Setup Ambiente
```bash
# Ogni microservizio ha il suo package.json
cd services/game-service  # o auth-service, user-service, match-service
npm install
```

### Avvio Modalità Development
```bash
# Con hot-reload (Node.js --watch)
npm run dev

# Oppure modalità normale
npm start
```

### Variabili d'Ambiente

Il progetto utilizza una separazione sicura tra **configurazione** e **secrets**:

#### File di Configurazione
- **`.env`**: Configurazioni non-sensibili (percorsi database, URL servizi)
- **`.secrets`**: Secrets critici (chiavi JWT, cookie, autenticazione interna)

#### Setup Iniziale
```bash
# 1. Copia i file di esempio
cp .env.example .env
cp .secrets.example .secrets

# 2. Modifica .secrets con valori sicuri (genera stringhe random forti)
# MAI committare .secrets su git!
```

#### Struttura File

**`.env`** (configurazioni):
```bash
# Database paths
DB_PATH=/app/database/pong.db
```

**`.secrets`** (valori sensibili):
```bash
# JWT & Session Secrets (min 32 caratteri, random)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-please-change-this-in-production
COOKIE_SECRET=your-super-secret-cookie-key-change-this-too

# Internal Service Authentication
INTERNAL_SECRET=your-super-secret-internal-service-key-change-this-in-production
```

#### Variabili per Servizio

**game-service** (porta 3000 - esposta pubblicamente):
- `JWT_SECRET`, `COOKIE_SECRET`, `INTERNAL_SECRET` (da .secrets)
- `AUTH_SERVICE_URL`, `USER_SERVICE_URL`, `MATCH_SERVICE_URL` (da docker-compose)

**auth-service** (porta 3002 - interna, esposta solo per testing):
- `PORT=3002` (da docker-compose)
- `JWT_SECRET`, `INTERNAL_SECRET` (da .secrets)
- `DB_PATH` (da docker-compose)

**user-service** (porta 3003 - interna, esposta solo per testing):
- `PORT=3003` (da docker-compose)
- `INTERNAL_SECRET` (da .secrets)
- `DB_PATH` (da docker-compose)

**match-service** (porta 3004 - interna, esposta solo per testing):
- `PORT=3004` (da docker-compose)
- `INTERNAL_SECRET` (da .secrets)
- `DB_PATH` (da docker-compose)

### Database
- Sincronizzazione automatica tramite Sequelize all'avvio
- Ogni servizio ha il proprio database SQLite
- File DB in `services/<service>/database/*.db`
- **Non** sono necessarie migrazioni manuali (Sequelize sync)

## Testing 🧪

### Test End-to-End Automatici
```bash
# Avvia stack completo e testa tutti gli endpoint
sudo ./scripts/test_services.sh

# Output atteso:
# ✅ auth-service: OK
# ✅ user-service: OK  
# ✅ match-service: OK
# ✅ game-service: OK
```

### Test Manuali
```bash
# Registrazione utente
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123!"}'

# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!"}'

# Profilo (con token JWT)
curl http://localhost:3000/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Unitari (TODO)
Framework consigliato per aggiungere test:
- **Jest** per unit tests
- **Supertest** per integration tests con Fastify
- **Mocha/Chai** come alternativa

## Roadmap & TODO 🗺️

### ✅ Backend Core (COMPLETATO)
- ✅ **Microservizi Fastify**: 4 servizi indipendenti con orchestrazione
- ✅ **Database SQLite**: Separati per servizio con Sequelize ORM
- ✅ **Autenticazione JWT**: Registrazione, login, sessioni sicure
- ✅ **User Management**: Profili, amicizie, statistiche (~95% - manca solo avatar storage)
- ✅ **Match System**: Registrazione partite, tornei, classifiche
- ✅ **Sicurezza**: bcrypt 6.0.0, XSS protection, SQL injection prevention
- ✅ **Testing**: 20+ endpoints testati con 100% success rate
- ✅ **Dipendenze aggiornate**: Fastify 5.0.0, bcrypt 6.0.0, Joi 18.0.1, UUID 13.0.0

### Backend (Moduli Avanzati - DA IMPLEMENTARE)
- [ ] **Avatar Upload**: Completare storage implementation (filesystem/DB)
- [ ] **Remote Authentication**: OAuth 2.0 (Google, GitHub, 42)
- [ ] **2FA**: TOTP (Google Authenticator) o SMS verification
- [ ] **AI Opponent**: Implementare bot con livelli difficoltà
- [ ] **Advanced 3D Graphics**: Babylon.js per gameplay Pong 3D

### Backend (Moduli Minor)
- [ ] **ELK Stack**: Centralizzazione log (Elasticsearch, Logstash, Kibana)
- [ ] **Prometheus/Grafana**: Metriche e monitoring real-time
- [ ] **Server-Side Pong**: Gameplay gestito lato backend
- [ ] **Advanced Security**: WAF, rate limiting avanzato, GDPR compliance

### Frontend (Priority Alta)
- [x] **Frontend Setup**: TypeScript + Tailwind CSS compilato con build automatica in Dockerfile nginx
- [x] **Routing Client-Side**: Router custom per navigazione tra pagine (home, login, register, profile, friends, history, game, tournament)
- [x] **UI Prototipo**: Pagine statiche con layout completo (header, form, liste) usando dati mock
- [ ] **Integrazione Backend**: Collegare frontend alle API game-service (AuthService, ProfileService, UsersService, FriendshipsService, MatchesService già definiti in `frontend/src/api/services.ts`)
- [ ] **Autenticazione Client**: Implementare login/register reali con JWT storage, logout, protected routes
- [ ] **Dashboard Dinamica**: Sostituire dati mock con chiamate API per tornei, match history, statistiche
- [ ] **Gameplay UI**: Canvas Pong con WebSocket sync per partite real-time
- [ ] **Profilo Utente Dinamico**: Upload avatar reale, modifica bio, integrazione con user-service
- [ ] **Sistema Amicizie UI**: Invio/accettazione richieste reali, chat (se implementata)

### Infrastructure & DevOps
- [ ] **CI/CD Pipeline**: GitHub Actions per test automatici e deploy
- [ ] **Kubernetes**: Migrazione da Docker Compose (scalabilità)
- [ ] **Database Migration**: Da SQLite a PostgreSQL (production-ready)
- [ ] **API Documentation**: Swagger/OpenAPI auto-generated

**Stato dettagliato moduli:** Vedi `project_modules.md` per tracking completo requisiti del subject.

## Struttura Progetto 📁

```
ft_transcendence/
├── services/
│   ├── game-service/          # Gateway & orchestrazione
│   │   ├── app.js             # Configurazione Fastify
│   │   ├── routes/            # Endpoint API pubblici
│   │   ├── utils/             # orchestrationService, validation
│   │   └── package.json
│   ├── auth-service/          # Autenticazione
│   │   ├── database/          # SQLite auth.db
│   │   ├── models/            # User, Session, OTP
│   │   ├── routes/            # auth.js
│   │   └── sequelize/         # DB setup
│   ├── user-service/          # Profili & amicizie
│   │   ├── database/          # SQLite users.db
│   │   ├── models/            # User, Friendship
│   │   └── routes/            # users.js, friendships.js
│   └── match-service/         # Match & tornei
│       ├── database/          # SQLite matches.db
│       ├── models/            # Match, Tournament
│       └── routes/            # matches.js
├── frontend/                  # Frontend statico TypeScript + Tailwind
│   ├── src/
│   │   ├── main.ts            # Entry point, router bootstrap
│   │   ├── router.ts          # Client-side routing
│   │   ├── pages/             # Pagine (home, login, register, profile, friends, history, game, tournament)
│   │   ├── components/        # Header, message components
│   │   ├── state/             # Store mock dati
│   │   ├── api/               # services.ts (API client pronto per integrazione backend)
│   │   ├── config/            # api.config.ts (endpoints, token manager)
│   │   └── types/             # requests.ts, responses.ts (TypeScript types allineati a backend)
│   ├── dist/                  # Output build TypeScript (generato in Dockerfile)
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
├── nginx/                     # Reverse proxy HTTPS
│   ├── Dockerfile             # Build multi-stage: frontend builder + nginx
│   └── nginx.conf             # Config: /api/* → game-service, /* → frontend statico
├── scripts/                   # Utility (test_services.sh, cleanup.sh)
├── docker-compose.yml         # Orchestrazione container
├── README.md                  # Questo file
├── api_endpoints.md           # Documentazione API completa
├── project_modules.md         # Tracking requisiti subject
├── AVATAR_GUIDE.md            # Guida upload/visualizzazione avatar
├── DEPENDENCIES_UPDATE_PLAN.md # Piano aggiornamenti npm
└── SECURITY_IMPROVEMENTS.md   # Analisi sicurezza
```

## Sicurezza 🔒

### Misure Implementate
- ✅ **XSS Protection**: Sanitizzazione input con libreria `xss` su tutti i servizi
- ✅ **SQL Injection**: Prevenzione tramite Sequelize ORM con parametrized queries
- ✅ **Password Security**: bcrypt hashing con 10 salt rounds
- ✅ **JWT Authentication**: Token con expiry 24h, verification middleware
- ✅ **HTTPS/TLS**: Nginx reverse proxy con certificati SSL
- ✅ **Input Validation**: Joi schemas per validazione richieste
- ✅ **CORS Configuration**: Policy restrittive per cross-origin requests

### Best Practices
- Secrets in variabili d'ambiente (`.env`), mai hardcoded
- Logging senza esposizione dati sensibili
- Rate limiting consigliato per produzione
- Database file permissions restrittivi

Dettagli completi in `SECURITY_IMPROVEMENTS.md`

## Dipendenze & Manutenzione 🔧

### Versioni Attuali (Aggiornate Ottobre 2025)
- Node.js: 20.x
- Fastify: 5.0.0 (aggiornato da 4.x)
- Sequelize: 6.37.7 (aggiornato da 6.35.2)
- bcrypt: 6.0.0 (aggiornato da 5.x)
- xss: 1.0.15
- UUID: 13.0.0 (nuovo)
- Joi: 18.0.1 (aggiornato da 17.x)

### Aggiornamenti Completati
✅ **Dipendenze aggiornate Ottobre 2025**: Fastify 5.0.0, bcrypt 6.0.0, Joi 18.0.1, UUID 13.0.0, Sequelize 6.37.7
✅ **OrchestrationService migliorato**: Timeout 10s, logging standardizzato, robustezza aumentata
✅ **Testing completo**: 20+ endpoints validati con 100% success rate

Vedere `DEPENDENCIES_UPDATE_PLAN.md` per dettagli sugli aggiornamenti effettuati.

### Manutenzione Consigliata
```bash
# Controllare dipendenze obsolete
cd services/game-service
npm outdated

# Aggiornare patch versions (sicuro)
npm update

# Audit sicurezza
npm audit
npm audit fix
```

## Contributi 🤝

### Strategia Git & Branching

**Repository:** `i-r0bin/42_ft_trascendence`

#### Struttura Branch

```
main (production-ready)
  └── develop (versione funzionante con tutte le feature)
       ├── backend (branch sviluppo backend)
       │    ├── feature/auth-improvements
       │    ├── feature/match-stats
       │    └── fix/jwt-expiry
       └── frontend (branch sviluppo frontend)
            ├── feature/spa-routing
            ├── feature/pong-canvas
            └── fix/responsive-layout
```

#### Workflow Git

**1. Branch Principali (Protetti)**
- `main`: Codice finale production-ready, deploy ufficiale
- `develop`: Versione stabile con tutte le feature integrate e testate
- `backend`: Branch di sviluppo per modifiche backend
- `frontend`: Branch di sviluppo per modifiche frontend

**2. Branch Feature**
```bash
# Da backend branch
git checkout backend
git pull origin backend
git checkout -b feature/nome-feature

# Oppure da frontend branch
git checkout frontend
git pull origin frontend
git checkout -b feature/nome-componente
```

**3. Merge Flow**
```
feature/xxx → backend/frontend → develop → main
```

#### Esempio Pratico

**Per feature backend:**
```bash
# 1. Crea branch da backend
git checkout backend
git pull origin backend
git checkout -b feature/tournament-ranking

# 2. Sviluppa
# ... codice ...
npm run dev
./scripts/test_services.sh

# 3. Commit
git add .
git commit -m "feat(match-service): add tournament ranking endpoint"

# 4. Push e apri PR verso backend
git push origin feature/tournament-ranking
# Apri PR: feature/tournament-ranking → backend

# 5. Dopo review e merge in backend, PR verso develop
# Apri PR: backend → develop

# 6. Quando develop è stabile, PR verso main
# Apri PR: develop → main
```

**Per feature frontend:**
```bash
# 1. Crea branch da frontend
git checkout frontend
git pull origin frontend
git checkout -b feature/login-page

# 2. Sviluppa
# ... codice componenti ...
npm run dev

# 3. Commit
git add .
git commit -m "feat(ui): add login page with validation"

# 4. Push e apri PR verso frontend
git push origin feature/login-page
# Apri PR: feature/login-page → frontend

# 5. Dopo merge in frontend, PR verso develop
# Apri PR: frontend → develop
```

### Linee Guida

#### Commit Messages (Conventional Commits)
```bash
# Feature
feat(auth-service): add OAuth2 Google integration
feat(ui): implement tournament dashboard

# Fix
fix(game-service): resolve JWT token expiry issue
fix(pong): correct ball physics calculation

# Docs
docs(readme): update installation instructions
docs(api): add endpoint documentation

# Refactor
refactor(user-service): extract validation logic
refactor(frontend): reorganize component structure

# Test
test(auth): add unit tests for login endpoint
test(e2e): add integration test for tournament flow

# Chore
chore(deps): update fastify to 4.29.1
chore(docker): optimize Dockerfile build
```

#### Pull Request Guidelines
1. **Titolo descrittivo**: `[Backend] Add tournament ranking system`
2. **Descrizione completa**:
   ```markdown
   ## Cosa cambia
   - Aggiunto endpoint GET /tournaments/:id/ranking
   - Implementato calcolo classifica real-time
   
   ## Testing
   - ✅ Unit tests per ranking logic
   - ✅ Integration test con mock data
   - ✅ ./scripts/test_services.sh passa
   
   ## Breaking Changes
   Nessuno
   
   ## Screenshots (se frontend)
   [immagini...]
   ```
3. **Review checklist**:
   - [ ] Codice testato localmente
   - [ ] Test automatici passano
   - [ ] Documentazione aggiornata
   - [ ] No warning/errori in console
   - [ ] Branch aggiornato con base branch

#### Code Review Process
1. **Self-review**: Rileggi il tuo codice prima di aprire PR
2. **Assignee**: Assegna reviewer appropriati (backend/frontend lead)
3. **Status checks**: Verifica che CI/CD passi (quando implementato)
4. **Merge strategy**: Squash commits per feature complesse, merge per fix minori

### Regole Generali
### Regole Generali
1. **Branch Strategy**: 
   - Feature branch da `backend` o `frontend`
   - Merge in `backend`/`frontend` → poi in `develop` → infine in `main`
   - Mai commit diretto su `main`, `develop`
2. **Testing**: Esegui `./scripts/test_services.sh` prima di ogni PR backend
3. **Documentazione**: Aggiorna README e markdown pertinenti
4. **Code Style**: 
   - Backend: ES modules, async/await, Fastify conventions
   - Frontend: TypeScript strict mode, component-based architecture
5. **Naming**:
   - Branch: `feature/`, `fix/`, `hotfix/`, `refactor/`
   - File: kebab-case per file, PascalCase per componenti React/Vue
   - Variabili: camelCase (JS/TS), UPPER_SNAKE_CASE per costanti

### Branch Protection (Consigliato per setup GitHub)
```yaml
# main branch
- Require pull request reviews (2+ approvals)
- Require status checks to pass
- Require branches to be up to date
- Include administrators

# develop branch  
- Require pull request reviews (1+ approval)
- Require status checks to pass

# backend/frontend branches
- Require pull request reviews (1+ approval)
- Allow force push (per rebase)
```

### Workflow Consigliato
```bash
# BACKEND WORKFLOW
# 1. Sincronizza backend branch
git checkout backend
git pull origin backend

# 2. Crea feature branch
git checkout -b feature/new-endpoint

# 3. Sviluppa e testa
cd services/auth-service
npm run dev
# ... sviluppo ...
cd ../..
./scripts/test_services.sh

# 4. Commit con conventional commits
git add .
git commit -m "feat(auth): add password reset endpoint"

# 5. Push e apri PR verso backend
git push origin feature/new-endpoint
# GitHub: Apri PR feature/new-endpoint → backend

# 6. Dopo merge in backend, aggiorna develop
git checkout backend
git pull origin backend
# GitHub: Apri PR backend → develop

# FRONTEND WORKFLOW  
# 1. Sincronizza frontend branch
git checkout frontend
git pull origin frontend

# 2. Crea feature branch
git checkout -b feature/dashboard-ui

# 3. Sviluppa
cd frontend
npm run dev
# ... sviluppo componenti ...

# 4. Commit
git add .
git commit -m "feat(dashboard): add user statistics widget"

# 5. Push e apri PR verso frontend
git push origin feature/dashboard-ui
# GitHub: Apri PR feature/dashboard-ui → frontend

# 6. Dopo merge in frontend, aggiorna develop
git checkout frontend
git pull origin frontend
# GitHub: Apri PR frontend → develop

# HOTFIX URGENTE (diretto su main)
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix
# ... fix ...
git commit -m "fix: patch critical XSS vulnerability"
git push origin hotfix/critical-security-fix
# GitHub: Apri PR hotfix/critical-security-fix → main
# Poi backport verso develop
```

### Sincronizzazione Branch
```bash
# Aggiornare feature branch con modifiche da backend/frontend
git checkout feature/my-feature
git fetch origin
git rebase origin/backend  # o origin/frontend

# Risolvere conflitti se necessario
# ... risolvi conflitti ...
git add .
git rebase --continue
git push --force-with-lease origin feature/my-feature
```

## Troubleshooting 🔍

### Servizio non si avvia
```bash
# Controlla i log
docker-compose logs <service-name>

# Verifica lo stato
docker-compose ps

# Rebuild forzato
docker-compose build --no-cache <service-name>
docker-compose up -d <service-name>
```

### Database corrotto
```bash
# Rimuovi e ricrea database
docker-compose down -v
docker-compose up --build
```

### Port già in uso
```bash
# Trova processo su porta
sudo lsof -i :3000

# Cambia porta in docker-compose.yml o .env
```

### Problemi JWT/Auth
- Verifica JWT_SECRET consistente tra servizi
- Controlla expiry token (default 24h)
- Valida formato Bearer token: `Authorization: Bearer <token>`

## Licenza 📄

ISC

---

**Progetto sviluppato per 42 School - ft_transcendence**  
**Stato:** Backend core 100% completo e testato | Frontend e moduli avanzati in sviluppo  
**Aggiornato:** Ottobre 2025 - Dipendenze aggiornate, testing completo superato
