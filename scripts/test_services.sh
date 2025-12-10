#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Comando richiesto non trovato: $1" >&2
    exit 1
  fi
}

require_command curl
require_command jq

DOCKER_COMPOSE_BIN=${DOCKER_COMPOSE_BIN:-docker-compose}
if ! command -v "$DOCKER_COMPOSE_BIN" >/dev/null 2>&1; then
  if command -v docker >/dev/null 2>&1; then
    DOCKER_COMPOSE_BIN="docker compose"
  else
    echo "docker-compose (o docker compose) non trovato" >&2
    exit 1
  fi
fi

compose() {
  if [[ "$DOCKER_COMPOSE_BIN" == "docker compose" ]]; then
    docker compose "$@"
  else
    "$DOCKER_COMPOSE_BIN" "$@"
  fi
}

wait_for_http() {
  local url=$1
  local retries=${2:-30}
  local delay=${3:-2}
  local attempt=1

  until curl -sS "$url" >/dev/null 2>&1; do
    if (( attempt > retries )); then
      echo "Timeout nell'attendere $url" >&2
      return 1
    fi
    printf "  [$attempt/$retries] Attendo...\r"
    sleep "$delay"
    ((attempt++))
  done
  printf "                                              \r"
}

random_suffix() {
  printf '%08d' "$(( (RANDOM * RANDOM) % 100000000 ))"
}

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

run_auth_service_tests() {
  local base_url="http://localhost:3002"
  local suffix1 suffix2 tmp status
  local user1_username user1_email user1_password
  local user2_username user2_email user2_password
  local auth_otp user1_id_from_login

  suffix1=$(random_suffix)
  suffix2=$(random_suffix)
  user1_username="authuser${suffix1}"
  user1_email="auth${suffix1}@example.com"
  user1_password="Password123!"
  user2_username="authuser${suffix2}"
  user2_email="auth${suffix2}@example.com"
  user2_password="Password123!"

  echo -e "\n${YELLOW}=== AUTH-SERVICE (3002) ===${NC}"

  tmp=$(mktemp)
  echo "➡️  POST /register (user1)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H 'Content-Type: application/json' \
    -X POST "$base_url/register" \
    -d "{\"username\":\"${user1_username}\",\"email\":\"${user1_email}\",\"password\":\"${user1_password}\"}")
  if [[ "$status" != "201" ]]; then
    echo -e "${RED}❌ POST /register (user1) ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  local auth_user1_id auth_token1
  auth_user1_id=$(jq -r '.user.id' "$tmp")
  echo -e "${GREEN}✅ User 1 created: $auth_user1_id${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  POST /register (user2)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H 'Content-Type: application/json' \
    -X POST "$base_url/register" \
    -d "{\"username\":\"${user2_username}\",\"email\":\"${user2_email}\",\"password\":\"${user2_password}\"}")
  if [[ "$status" != "201" ]]; then
    echo -e "${RED}❌ POST /register (user2) ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ User 2 created${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  POST /login (user1)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H 'Content-Type: application/json' \
    -X POST "$base_url/login" \
    -d "{\"email\":\"${user1_email}\",\"password\":\"${user1_password}\"}")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ POST /login (user1) ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  user1_id_from_login=$(jq -r '.user_id // empty' "$tmp")
  auth_otp=$(jq -r '.otp // empty' "$tmp")
  if [[ -z "$auth_otp" || -z "$user1_id_from_login" ]]; then
    echo -e "${RED}❌ OTP non presente nella risposta di login (abilita RETURN_OTP_IN_RESPONSE=true)${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ OTP ricevuto per login${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  POST /otp/verify (user1)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H 'Content-Type: application/json' \
    -X POST "$base_url/otp/verify" \
    -d "{\"userId\":${auth_user1_id},\"otp\":\"${auth_otp}\"}")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ POST /otp/verify ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  auth_token1=$(jq -r '.access_token' "$tmp")
  if [[ -z "$auth_token1" ]]; then
    echo -e "${RED}❌ access_token non presente nella risposta OTP${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ OTP verificato e token generato${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  GET /verify (user1)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${auth_token1}" \
    "$base_url/verify")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ GET /verify ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Token verified${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  POST /logout (user1)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${auth_token1}" \
    -X POST "$base_url/logout")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ POST /logout ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Logout successful${NC}"
  rm -f "$tmp"

  echo -e "${GREEN}✅ Auth-Service API OK${NC}"

  echo "$auth_user1_id"
}

run_user_service_tests() {
  local base_url="http://localhost:3003"
  local tmp status

  echo -e "\n${YELLOW}=== USER-SERVICE (3003) ===${NC}"

  tmp=$(mktemp)
  echo "➡️  GET /users"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" "$base_url/users")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ GET /users ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  local users_count
  users_count=$(jq 'length' "$tmp")
  echo -e "${GREEN}✅ Found $users_count users${NC}"
  rm -f "$tmp"

  # Le operazioni CRUD sugli utenti sono fatte tramite sync da auth-service
  # Testiamo solo gli endpoint di lettura

  tmp=$(mktemp)
  echo "➡️  GET /users/with-friendship-status/1"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" "$base_url/users/with-friendship-status/1")
  if [[ "$status" != "200" && "$status" != "404" ]]; then
    echo -e "${RED}❌ GET /users/with-friendship-status/1 ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Friendship status endpoint working${NC}"
  rm -f "$tmp"

  echo -e "${GREEN}✅ User-Service API OK${NC}"
}

run_match_service_tests() {
  local base_url="http://localhost:3004"
  local tmp status

  echo -e "\n${YELLOW}=== MATCH-SERVICE (3004) ===${NC}"

  tmp=$(mktemp)
  echo "➡️  GET /matches"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" "$base_url/matches")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ GET /matches ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  local matches_count
  matches_count=$(jq 'length' "$tmp")
  echo -e "${GREEN}✅ Found $matches_count matches${NC}"
  rm -f "$tmp"

  echo -e "${GREEN}✅ Match-Service API OK${NC}"
}

run_game_service_tests() {
  local base_url="http://localhost:3000"
  local auth_base_url="http://localhost:3002"
  local suffix1 suffix2 tmp status
  local user1_username user1_email user1_password
  local user2_username user2_email user2_password
  local token1 token2 user1_id user2_id
  local otp1 otp2

  suffix1=$(random_suffix)
  suffix2=$(random_suffix)
  user1_username="game${suffix1}"
  user1_email="game${suffix1}@example.com"
  user1_password="Password123!"
  user2_username="game${suffix2}"
  user2_email="game${suffix2}@example.com"
  user2_password="Password123!"

  echo -e "\n${YELLOW}=== GAME-SERVICE (3000) ===${NC}"

  # === Authentication Endpoints ===
  tmp=$(mktemp)
  echo "➡️  POST /register (user1)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H 'Content-Type: application/json' \
    -X POST "$base_url/register" \
    -d "{\"username\":\"${user1_username}\",\"email\":\"${user1_email}\",\"password\":\"${user1_password}\"}")
  if [[ "$status" != "201" ]]; then
    echo -e "${RED}❌ POST /register (user1) ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  user1_id=$(jq -r '.user.id' "$tmp")
  echo -e "${GREEN}✅ User 1 registered: $user1_id${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  POST /register (user2)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H 'Content-Type: application/json' \
    -X POST "$base_url/register" \
    -d "{\"username\":\"${user2_username}\",\"email\":\"${user2_email}\",\"password\":\"${user2_password}\"}")
  if [[ "$status" != "201" ]]; then
    echo -e "${RED}❌ POST /register (user2) ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  user2_id=$(jq -r '.user.id' "$tmp")
  echo -e "${GREEN}✅ User 2 registered: $user2_id${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  POST /login (user1)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H 'Content-Type: application/json' \
    -X POST "$base_url/login" \
    -d "{\"email\":\"${user1_email}\",\"password\":\"${user1_password}\"}")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ POST /login (user1) ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  otp1=$(jq -r '.otp // empty' "$tmp")
  if [[ -z "$otp1" ]]; then
    echo -e "${RED}❌ OTP non presente nella risposta di login game-service (abilita RETURN_OTP_IN_RESPONSE=true)${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ OTP user1 ricevuto${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  POST /otp/verify (user1)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H 'Content-Type: application/json' \
    -X POST "$auth_base_url/otp/verify" \
    -d "{\"userId\":${user1_id},\"otp\":\"${otp1}\"}")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ POST /otp/verify (user1) ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  token1=$(jq -r '.access_token' "$tmp")
  if [[ -z "$token1" ]]; then
    echo -e "${RED}❌ access_token non presente nella risposta OTP (user1)${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ OTP user1 verificato, token ottenuto${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  POST /login (user2)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H 'Content-Type: application/json' \
    -X POST "$base_url/login" \
    -d "{\"email\":\"${user2_email}\",\"password\":\"${user2_password}\"}")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ POST /login (user2) ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  otp2=$(jq -r '.otp // empty' "$tmp")
  if [[ -z "$otp2" ]]; then
    echo -e "${RED}❌ OTP non presente nella risposta di login game-service (user2)${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ OTP user2 ricevuto${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  POST /otp/verify (user2)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H 'Content-Type: application/json' \
    -X POST "$auth_base_url/otp/verify" \
    -d "{\"userId\":${user2_id},\"otp\":\"${otp2}\"}")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ POST /otp/verify (user2) ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  token2=$(jq -r '.access_token' "$tmp")
  if [[ -z "$token2" ]]; then
    echo -e "${RED}❌ access_token non presente nella risposta OTP (user2)${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ OTP user2 verificato, token ottenuto${NC}"
  rm -f "$tmp"

  # === Profile Endpoints ===
  tmp=$(mktemp)
  echo "➡️  GET /profile (user1 own profile)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token1}" \
    "$base_url/profile")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ GET /profile ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  if ! jq -e '.user | has("avatar")' "$tmp" >/dev/null; then
    echo -e "${RED}❌ GET /profile non restituisce avatar${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Own profile retrieved${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  GET /profile/$user2_id (public profile)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token1}" \
    "$base_url/profile/$user2_id")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ GET /profile/:userId ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  if ! jq -e '.user | has("avatar")' "$tmp" >/dev/null; then
    echo -e "${RED}❌ GET /profile/:userId non restituisce avatar${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Public profile retrieved${NC}"
  rm -f "$tmp"

  # === Users Endpoint ===
  tmp=$(mktemp)
  echo "➡️  GET /users (leaderboard)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token1}" \
    "$base_url/users")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ GET /users ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Leaderboard retrieved${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  GET /users/$user2_id"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token1}" \
    "$base_url/users/$user2_id")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ GET /users/:id ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Single user retrieved${NC}"
  rm -f "$tmp"

  # === Friendship Endpoints ===
  local friendship_id
  tmp=$(mktemp)
  echo "➡️  POST /friendships (user1 -> user2)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token1}" \
    -H 'Content-Type: application/json' \
    -X POST "$base_url/friendships" \
    -d "{\"receiver_id\":${user2_id}}")
  if [[ "$status" != "201" ]]; then
    echo -e "${RED}❌ POST /friendships ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  friendship_id=$(jq -r '.id' "$tmp")
  echo -e "${GREEN}✅ Friendship request sent${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  PUT /friendships/$friendship_id/accept (user2 accetta)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token2}" \
    -H 'Content-Type: application/json' \
    -X PUT "$base_url/friendships/$friendship_id/accept" \
    -d '{}')
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ PUT /friendships/:id/accept ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Friendship request accepted${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  DELETE /friendships/$friendship_id (user1 rimuove amicizia)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token1}" \
    -X DELETE "$base_url/friendships/$friendship_id")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ DELETE /friendships/:id ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Friendship removed${NC}"
  rm -f "$tmp"

  # === Match Endpoints ===
  tmp=$(mktemp)
  echo "➡️  GET /matches (user1 history)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token1}" \
    "$base_url/matches")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ GET /matches ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Match history retrieved${NC}"
  rm -f "$tmp"

  local match_id

  # BOT alias via /matches
  tmp=$(mktemp)
  echo "➡️  POST /matches (user1 vs BOT)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token1}" \
    -H 'Content-Type: application/json' \
    -X POST "$base_url/matches" \
    -d "{\"opponent_alias\":\"BOT\",\"user_score\":11,\"opponent_score\":5}")
  if [[ "$status" != "201" ]]; then
    echo -e "${RED}❌ POST /matches (BOT) ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  match_id=$(jq -r '.id' "$tmp")
  echo -e "${GREEN}✅ Match BOT created: $match_id${NC}"
  rm -f "$tmp"

  # AI opponent via dedicated endpoint /matches/ai
  tmp=$(mktemp)
  echo "➡️  POST /matches/ai (user1 vs AI)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token1}" \
    -H 'Content-Type: application/json' \
    -X POST "$base_url/matches/ai" \
    -d "{\"user_score\":7,\"opponent_score\":11}")
  if [[ "$status" != "201" ]]; then
    echo -e "${RED}❌ POST /matches/ai ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Match AI (endpoint dedicato) creato${NC}"
  rm -f "$tmp"

  tmp=$(mktemp)
  echo "➡️  GET /matches/$match_id"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token1}" \
    "$base_url/matches/$match_id")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ GET /matches/:id ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ Match retrieved${NC}"
  rm -f "$tmp"

  # === Logout ===
  tmp=$(mktemp)
  echo "➡️  POST /logout (user1)"
  status=$(curl -sS -o "$tmp" -w "%{http_code}" \
    -H "Authorization: Bearer ${token1}" \
    -X POST "$base_url/logout")
  if [[ "$status" != "200" ]]; then
    echo -e "${RED}❌ POST /logout ha restituito $status${NC}"
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  echo -e "${GREEN}✅ User 1 logged out${NC}"
  rm -f "$tmp"

  echo -e "${GREEN}✅ Game-Service API OK${NC}"
}

main() {
  echo -e "${YELLOW}🧹 Pulizia ambiente Docker...${NC}"
  compose down --remove-orphans || true

  echo -e "${YELLOW}🗑️  Rimozione database SQLite locale...${NC}"
  rm -f "$ROOT_DIR/services/auth-service/database/auth.db"
  rm -f "$ROOT_DIR/services/user-service/database/user.db"
  rm -f "$ROOT_DIR/services/match-service/database/match.db"

  # Abilita modalità test OTP (ritorna codice in risposta e salta invio email)
  export RETURN_OTP_IN_RESPONSE=true

  echo -e "${YELLOW}🛠️  Build servizi...${NC}"
  compose build auth-service user-service match-service game-service

  echo -e "${YELLOW}🚀 Avvio auth-service (3002)...${NC}"
  compose up -d auth-service
  echo "⏳ Attendo auth-service..."
  wait_for_http "http://localhost:3002" 15 1 || {
    echo -e "${RED}❌ Auth-service non ha risposto${NC}"
    compose logs auth-service | tail -20
    return 1
  }
  echo -e "${GREEN}✅ Auth-service avviato${NC}"

  echo -e "${YELLOW}🚀 Avvio user-service (3003)...${NC}"
  compose up -d user-service
  echo "⏳ Attendo user-service..."
  wait_for_http "http://localhost:3003" 15 1 || {
    echo -e "${RED}❌ User-service non ha risposto${NC}"
    compose logs user-service | tail -20
    return 1
  }
  echo -e "${GREEN}✅ User-service avviato${NC}"

  echo -e "${YELLOW}🚀 Avvio match-service (3004)...${NC}"
  compose up -d match-service
  echo "⏳ Attendo match-service..."
  wait_for_http "http://localhost:3004" 15 1 || {
    echo -e "${RED}❌ Match-service non ha risposto${NC}"
    compose logs match-service | tail -20
    return 1
  }
  echo -e "${GREEN}✅ Match-service avviato${NC}"

  echo -e "${YELLOW}🚀 Avvio game-service (3000)...${NC}"
  compose up -d game-service
  echo "⏳ Attendo game-service..."
  wait_for_http "http://localhost:3000" 15 1 || {
    echo -e "${RED}❌ Game-service non ha risposto${NC}"
    compose logs game-service | tail -20
    return 1
  }
  echo -e "${GREEN}✅ Game-service avviato${NC}"

  # Run tests per cada servizio
  echo -e "\n${YELLOW}▶️  Esecuzione test Auth-Service...${NC}"
  run_auth_service_tests || {
    echo -e "${RED}❌ Auth-Service tests falliti${NC}"
    compose logs auth-service | tail -30
    return 1
  }

  echo -e "\n${YELLOW}▶️  Esecuzione test User-Service...${NC}"
  run_user_service_tests || {
    echo -e "${RED}❌ User-Service tests falliti${NC}"
    compose logs user-service | tail -30
    return 1
  }

  echo -e "\n${YELLOW}▶️  Esecuzione test Match-Service...${NC}"
  run_match_service_tests || {
    echo -e "${RED}❌ Match-Service tests falliti${NC}"
    compose logs match-service | tail -30
    return 1
  }

  echo -e "\n${YELLOW}▶️  Esecuzione test Game-Service...${NC}"
  run_game_service_tests || {
    echo -e "${RED}❌ Game-Service tests falliti${NC}"
    compose logs game-service | tail -30
    return 1
  }

  echo -e "\n${GREEN}🎉 Tutti i test completati con SUCCESSO!${NC}"
  echo -e "\n${YELLOW}Servizi attivi:${NC}"
  compose ps

  echo -e "\n${YELLOW}URL servizi:${NC}"
  echo "  Auth-Service:  http://localhost:3002"
  echo "  User-Service:  http://localhost:3003"
  echo "  Match-Service: http://localhost:3004"
  echo "  Game-Service:  http://localhost:3000"
}

main "$@"
