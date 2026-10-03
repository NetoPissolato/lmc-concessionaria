#!/bin/bash
# =============================================================================
# LMC Concessionária - Script de Deploy via GitHub
# =============================================================================
# Uso:
#   Primeiro deploy:  bash deploy.sh --first
#   Deploy normal:    bash deploy.sh
#   Só rebuild:       bash deploy.sh --build-only
# =============================================================================

set -euo pipefail

# ── Cores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }
step() { echo -e "\n${BOLD}${CYAN}══ $1 ══${NC}"; }

# ── Configurações (edite conforme o projeto) ─────────────────────────────────
APP_DIR="/opt/lmc"
COMPOSE_FILE="docker-compose.prod.yml"
REPO_URL=""   # Preenchido no primeiro deploy ou já configurado

FIRST_DEPLOY=false
BUILD_ONLY=false

for arg in "$@"; do
  case $arg in
    --first)     FIRST_DEPLOY=true ;;
    --build-only) BUILD_ONLY=true ;;
  esac
done

# =============================================================================
# PRIMEIRO DEPLOY: Clona o repositório e configura tudo
# =============================================================================
if [ "$FIRST_DEPLOY" = true ]; then
  step "Primeiro Deploy - Setup Completo"

  # Verifica se git está instalado
  command -v git >/dev/null 2>&1 || apt-get install -y git

  # Pede URL do repo se não configurada
  if [ -z "$REPO_URL" ]; then
    read -p "URL do repositório GitHub (ex: https://github.com/usuario/repo.git): " REPO_URL
  fi

  # Clona o repo
  if [ -d "$APP_DIR/.git" ]; then
    warn "Repositório já existe em $APP_DIR. Pulando clone."
  else
    info "Clonando repositório..."
    git clone "$REPO_URL" "$APP_DIR"
  fi

  cd "$APP_DIR"

  # Cria arquivos .env se não existirem
  step "Configurando variáveis de ambiente"
  if [ ! -f "backend/.env.production" ]; then
    warn "Arquivo backend/.env.production não encontrado!"
    warn "Crie-o baseado em backend/.env.example ANTES de continuar."
    warn "Exemplo: cp backend/.env.example backend/.env.production && nano backend/.env.production"
    exit 1
  fi

  # Instala dependências do sistema
  step "Instalando Docker e dependências"
  if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker --now
  fi

  # Configura UFW (firewall)
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable

  info "Sistema configurado!"
fi

# =============================================================================
# DEPLOY NORMAL: git pull + rebuild
# =============================================================================
cd "$APP_DIR"

if [ "$BUILD_ONLY" = false ]; then
  step "Atualizando código via Git"
  git fetch origin
  git pull --ff-only origin main
  log "Código atualizado!"
fi

step "Buildando os containers"
docker compose -f "$COMPOSE_FILE" build backend frontend frontend_site

step "Banco de dados"
docker compose -f "$COMPOSE_FILE" up -d postgres redis
if [ "$FIRST_DEPLOY" = true ]; then
  # Banco novo: cria as tabelas pelo estado atual dos models, marca o Alembic como
  # atualizado e cria o admin com senha aleatória (mostrada uma única vez).
  docker compose -f "$COMPOSE_FILE" run --rm backend python scripts/instalar_banco.py
  bash "$APP_DIR/backup.sh" --instalar-cron
else
  bash "$APP_DIR/backup.sh"
  docker compose -f "$COMPOSE_FILE" run --rm backend alembic upgrade head
fi
docker compose -f "$COMPOSE_FILE" run --rm --no-deps --user root --entrypoint "" backend chown -R 1001:1001 /app/uploads

step "Subindo containers"
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

step "Verificando saúde"
ESPERA=0
until docker compose -f "$COMPOSE_FILE" exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" >/dev/null 2>&1; do
  ESPERA=$((ESPERA + 5))
  [ "$ESPERA" -ge 90 ] && err "Backend não respondeu em 90s: docker compose -f $COMPOSE_FILE logs --tail=100 backend"
  sleep 5
done
log "Backend OK"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo -e "${BOLD}${GREEN}══════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  Deploy concluído com sucesso! 🚀${NC}"
echo -e "${BOLD}${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo -e "  Site: ${CYAN}https://lcm.spacerstorepaineladmin.com${NC}"
echo ""
