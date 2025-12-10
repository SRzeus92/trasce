# 🔐 Miglioramenti di Sicurezza Implementati

## Data: 26 Ottobre 2025

Il backend `ft_transcendence` gira ora interamente su Fastify + Sequelize con sincronizzazione schema automatica. Questa sezione riepiloga lo stato attuale delle contromisure di sicurezza (post refactor ottobre 2025) e le prossime azioni raccomandate.

---

## ✅ Protezioni Attive

### Input Sanitization & Validation
- Sanitizzazione centralizzata (`sanitizeObject`, `sanitizeString`) sia in data-service che in game-service.
- Validatori dedicati per username, email, password, URL e ID (`services/*/utils/validation.js`).
- Whitelist sui campi aggiornabili (`ALLOWED_USER_UPDATE_FIELDS`, `ALLOWED_STATS_FIELDS`).
- Le route trasformano le risposte rendendo invisibili dati sensibili non necessari (es. rimozione `stats` annidate).

### Database Hardening
- Tutte le query passano da Sequelize ORM ⇒ utilizzo implicito di query parametrizzate.
- `sequelize.sync({ alter: true })` mantiene lo schema allineato senza file SQL manuali (cartella `migrations/` rimossa).
- Aggiornamenti di statistiche e tornei vincolati da helper (`statsUtils.js`) per evitare inconsistenze logiche.

### Autenticazione & Sessioni
- Registrazione: password hashate con `bcrypt` (salt 10).
- Login: comparazione sicura, update `last_login`, rilascio JWT (`expiresIn: 15h`).
- Middleware `authenticateToken` popola `request.user` e applica controllo sugli endpoint protetti.
- Game-service maschera stato online (`is_online`, `last_seen`) solo tra amici accettati.

### Trasporto & Perimetro
- Nginx reverse proxy con TLS (HTTP→HTTPS redirect) e security headers:
  - `Strict-Transport-Security`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
- Docker Compose separa i servizi su rete interna, esponendo solo porte 3000 (game) e 3001 (data) tramite proxy.

### Gestione Secrets
- `.env` (root) + `.env.example` per documentare le variabili richieste.
- Secrets (JWT, cookie, DB path) caricati via `env_file` nei container.
- `.gitignore` blocca i file `.env` locali.

### Monitoraggio & Error Handling
- Fastify logga errori applicativi su stderr (aggregabili da Docker).
- Catch espliciti nelle route con messaggi neutri per limitare leakage di dettagli interni.

---

## � Conformità Requisiti Subject

| Requisito                     | Stato | Note |
|------------------------------|-------|------|
| Password hashate             | ✅    | `bcrypt` durante /register |
| Protezione SQL Injection     | ✅    | Query ORM, nessuna concatenazione |
| Protezione XSS               | ✅    | Sanitizzazione input + escape campi |
| HTTPS obbligatorio           | ✅    | Nginx TLS + redirect |
| Validazione form/input       | ✅    | Moduli `validation.js` |
| WebSocket sicuro (wss)       | ⚠️    | Da attivare quando il realtime-service sarà reintegrato |

---

## 🔧 Modifiche Recenti (Ottobre 2025)

- Sostituito init SQL con `sequelize.sync` ⇒ cartella `services/data-service/migrations/` rimossa.
- Estesi modelli (`UserStats`, tornei) per mantenere compatibilità legacy con nuovi contatori.
- Middleware JWT aggiornato per copiare `request.user` e prevenire 500 in catena.
- Script `scripts/test_services.sh` automatizza build Docker, reset DB e test end-to-end (copre registrazione, login, amicizie, match PvP).
- Documentazione API (`api_endpoints.md`, `game-service-requests.md`, `game-service-responses.md`) riallineata al comportamento runtime.

---

## 🚀 Procedure Operative

### 1. Configurare Secrets
```bash
cp .env.example .env
nano .env  # Aggiorna JWT_SECRET, COOKIE_SECRET e path DB
```

### 2. Avviare e Testare i Servizi
```bash
sudo docker-compose down
sudo docker-compose up --build -d
sudo ./scripts/test_services.sh  # verifica API con curl+jq
```

I test terminano con container attivi e log puliti: eventuali regressioni vengono tracciate step-by-step nello script.

---

## ⚠️ TODO Rimanenti

### Alta Priorità
1. Abilitare WebSocket sicuro (`wss://`) per il realtime-service quando verrà ripristinato.
2. Aggiungere rate limiting (es. `@fastify/rate-limit`) su login/register.
3. Definire CORS restrittivo per ambienti production (origini esplicite).

### Media Priorità
4. Implementare refresh/rotazione JWT o sessioni server-side per logout anticipato.
5. Integrare logging strutturato (p.es. pino + transport esterno).
6. Aggiornare la policy password (blacklist parole comuni, throttling tentativi).

### Bassa Priorità
7. Automatizzare backup DB SQLite (cron rsync o export).
8. Sostituire certificato self-signed con Let's Encrypt in produzione.
9. Valutare un sistema di audit trail per azioni amministrative.

---

## 🧪 Testing di Sicurezza

Esempi rapidi di verifica manuale:

```bash
# SQLi: deve rispondere 400
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"username":"foo'"'"' OR 1=1--","email":"evil@test.com","password_hash":"x"}'

# XSS: input viene sanitizzato
curl -s http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"username":"<script>alert(1)</script>","email":"test@test.com","password_hash":"hash"}'

# JWT obbligatorio: ottieni 401 senza token
curl -s -o - -w "\nHTTP %{http_code}\n" http://localhost:3000/users
```

---

## 📝 Note per Produzione

- Gestire secrets tramite vault (AWS Secrets Manager / HashiCorp Vault) anziché file `.env`.
- Aggiornare CORS e rate limiting in base ai domini reali.
- Hardening dei container (non-root user, drop capabilities) se necessario.
- Monitorare log con stack centralizzato (ELK, Loki) e impostare alert su errori 4xx/5xx ripetuti.
- Documentare procedure di patching e aggiornare dipendenze `npm` con cadenza regolare (`npm audit`).

---

Con queste misure il backend è conforme ai requisiti di sicurezza del subject e pronto per ulteriori iterazioni mirate a wss, rate limiting e hardening production.
