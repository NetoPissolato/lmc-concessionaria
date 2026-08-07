#!/bin/bash
# =============================================================================
#  LMC Concessionária — Update Script
#  Uso: bash update.sh [opções]
#
#  Opções:
#    (sem argumento)   Pull + rebuild frontend + backend + restart
#    --frontend-only   Rebuild só o frontend
#    --backend-only    Rebuild só o backend
#    --restart-only    Só reinicia sem rebuild
#    --rollback        Volta para o commit anterior
# =============================================================================

set -euo pipefail

# ── Configurações ─────────────────────────────────────────────────────────────
APP_DIR="/opt/lmc"
COMPOSE="docker compose -f $APP_DIR/docker-compose.prod.yml"
GITHUB_TOKEN="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"
REPO_URL="https://NetoPissolato:${GITHUB_TOKEN}@github.com/NetoPissolato/lmc-concessionaria.git"

# ── Cores ─────────────────────────────────────────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m'
B='\033[0;34m' C='\033[0;36m' W='\033[1m' N='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
ok()   { echo -e "${G}  ✔${N}  $1"; }
info() { echo -e "${B}  →${N}  $1"; }
warn() { echo -e "${Y}  ⚠${N}  $1"; }
err()  { echo -e "${R}  ✘${N}  $1"; exit 1; }
line() { echo -e "${C}$(printf '─%.0s' {1..50})${N}"; }
head() { echo -e "\n${W}${C}  $1${N}"; line; }

# ── Parse args ────────────────────────────────────────────────────────────────
FRONTEND_ONLY=false
BACKEND_ONLY=false
RESTART_ONLY=false
ROLLBACK=false

for arg in "${@:-}"; do
  case $arg in
    --frontend-only) FRONTEND_ONLY=true ;;
    --backend-only)  BACKEND_ONLY=true  ;;
    --restart-only)  RESTART_ONLY=true  ;;
    --rollback)      ROLLBACK=true      ;;
  esac
done

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${W}${C}"
echo "  ██╗     ███╗   ███╗ ██████╗"
echo "  ██║     ████╗ ████║██╔════╝"
echo "  ██║     ██╔████╔██║██║     "
echo "  ██║     ██║╚██╔╝██║██║     "
echo "  ███████╗██║ ╚═╝ ██║╚██████╗"
echo "  ╚══════╝╚═╝     ╚═╝ ╚═════╝"
echo -e "${N}"
echo -e "  ${W}Deploy Automatizado — LMC Concessionária${N}"
echo -e "  $(date '+%d/%m/%Y %H:%M:%S')"
echo ""

cd "$APP_DIR"

# =============================================================================
# ROLLBACK
# =============================================================================
if [ "$ROLLBACK" = true ]; then
  head "🔄 Rollback para commit anterior"
  PREV=$(git log --oneline -2 | tail -1 | awk '{print $1}')
  CURR=$(git log --oneline -1)
  info "Commit atual: $CURR"
  info "Voltando para: $PREV"
  git checkout "$PREV" -- .
  ok "Rollback aplicado!"

  head "🐳 Rebuild após rollback"
  $COMPOSE build --no-cache frontend backend
  $COMPOSE up -d
  ok "Sistema restaurado!"
  exit 0
fi

# =============================================================================
# RESTART ONLY
# =============================================================================
if [ "$RESTART_ONLY" = true ]; then
  head "🔁 Reiniciando containers"
  $COMPOSE restart
  ok "Containers reiniciados!"
  exit 0
fi

# =============================================================================
# GIT PULL
# =============================================================================
head "📥 Atualizando código (git pull)"

# Salva commit atual para possível rollback
COMMIT_BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "none")

# Configura remote com token
git remote set-url origin "$REPO_URL"

# Pull
if git pull origin main --rebase 2>&1; then
  COMMIT_AFTER=$(git rev-parse HEAD)
  if [ "$COMMIT_BEFORE" = "$COMMIT_AFTER" ]; then
    warn "Nenhuma mudança no código."
  else
    ok "Código atualizado!"
    echo ""
    info "Mudanças:"
    git log --oneline "${COMMIT_BEFORE}..${COMMIT_AFTER}" | sed 's/^/     /'
  fi
else
  err "Falha no git pull. Abortando."
fi

# =============================================================================
# BUILD
# =============================================================================
BUILD_ARGS="--no-cache"

if [ "$FRONTEND_ONLY" = true ]; then
  head "🔨 Build — Frontend apenas"
  $COMPOSE build $BUILD_ARGS frontend
  $COMPOSE up -d frontend

elif [ "$BACKEND_ONLY" = true ]; then
  head "🔨 Build — Backend apenas"
  $COMPOSE build $BUILD_ARGS backend
  $COMPOSE up -d backend

else
  head "🔨 Build — Frontend + Backend"
  $COMPOSE build $BUILD_ARGS frontend backend
  $COMPOSE up -d --remove-orphans
fi

ok "Build concluído!"

# =============================================================================
# HEALTH CHECK
# =============================================================================
head "🩺 Verificando saúde do sistema"

sleep 5

# Backend
if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
  ok "Backend: online"
else
  warn "Backend ainda iniciando (pode levar mais alguns segundos)"
fi

# Frontend (via nginx)
STATUS=$(curl -so /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
if [[ "$STATUS" == "200" || "$STATUS" == "307" || "$STATUS" == "301" ]]; then
  ok "Frontend: online (HTTP $STATUS)"
else
  warn "Frontend: status $STATUS — verificar logs"
fi

# Containers ativos
echo ""
info "Status dos containers:"
$COMPOSE ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | sed 's/^/  /'

# =============================================================================
# RESUMO FINAL
# =============================================================================
echo ""
line
echo -e "  ${G}${W}✅ Deploy concluído com sucesso!${N}"
line
echo -e "  ${W}Site:${N}    ${C}https://lcm.spacerstorepaineladmin.com${N}"
echo -e "  ${W}Commit:${N}  $(git log --oneline -1)"
echo ""
echo -e "  ${Y}Rollback:${N} bash update.sh --rollback"
echo ""
