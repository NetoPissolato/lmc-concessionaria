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
REPO_URL="https://github.com/NetoPissolato/lmc-concessionaria.git"
# Autenticação no GitHub: NUNCA coloque token neste arquivo (ele vai para o git).
# Use uma deploy key SSH na VPS, ou exporte GITHUB_TOKEN só na hora do deploy:
#   GITHUB_TOKEN=xxxx bash update.sh
# O token é passado só para o comando git (cabeçalho HTTP) e não fica gravado no .git/config.

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
  head "🔄 Rollback para o deploy anterior"
  [ -f .deploy_anterior ] || err "Não há registro de deploy anterior (.deploy_anterior)."
  PREV=$(cat .deploy_anterior)
  info "Commit atual:  $(git log --oneline -1)"
  info "Voltando para: $(git log --oneline -1 "$PREV")"
  warn "Migrations de banco NÃO são desfeitas automaticamente."
  warn "Se o deploy que está sendo desfeito alterou o banco, restaure o backup feito antes dele (backups/)."
  # reset (e não 'checkout -- .'): deixa a árvore limpa, senão o próximo pull falha
  git reset --hard "$PREV"
  $COMPOSE build frontend frontend_site backend
  $COMPOSE up -d --remove-orphans
  ok "Sistema restaurado em $(git log --oneline -1)"
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

# Remove qualquer token que versões antigas deste script gravaram no remote
git remote set-url origin "$REPO_URL"

GIT_AUTH=()
if [ -n "${GITHUB_TOKEN:-}" ]; then
  BASIC=$(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)
  GIT_AUTH=(-c "http.https://github.com/.extraheader=AUTHORIZATION: basic $BASIC")
fi

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  err "Há alterações locais no código da VPS. Resolva (git status) antes de atualizar."
fi

if git "${GIT_AUTH[@]}" pull --ff-only origin main 2>&1; then
  COMMIT_AFTER=$(git rev-parse HEAD)
  if [ "$COMMIT_BEFORE" = "$COMMIT_AFTER" ]; then
    warn "Nenhuma mudança no código."
  else
    ok "Código atualizado!"
    echo "$COMMIT_BEFORE" > .deploy_anterior
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
# Backup do banco antes de qualquer migration
if [ "$FRONTEND_ONLY" != true ]; then
  head "💾 Backup antes do deploy"
  bash "$APP_DIR/backup.sh" || err "Backup falhou — deploy abortado para não arriscar o banco."
fi

if [ "$FRONTEND_ONLY" = true ]; then
  head "🔨 Build — Frontends (painel + site público)"
  $COMPOSE build frontend frontend_site
  $COMPOSE up -d frontend frontend_site

elif [ "$BACKEND_ONLY" = true ]; then
  head "🔨 Build — Backend apenas"
  $COMPOSE build backend
  head "🗄️  Migrations do banco"
  $COMPOSE run --rm --no-deps backend alembic upgrade head || err "Migration falhou. O backend antigo continua no ar."
  # O backend roda sem root (uid 1001). Fotos antigas no volume pertencem ao root:
  # sem isto, todo upload novo falharia com "permission denied". Idempotente.
  $COMPOSE run --rm --no-deps --user root --entrypoint "" backend chown -R 1001:1001 /app/uploads
  $COMPOSE up -d backend

else
  head "🔨 Build — Backend + painel + site público"
  $COMPOSE build backend frontend frontend_site
  head "🗄️  Migrations do banco"
  $COMPOSE up -d postgres redis
  $COMPOSE run --rm backend alembic upgrade head || err "Migration falhou. Os containers antigos continuam no ar."
  # O backend roda sem root (uid 1001). Fotos antigas no volume pertencem ao root:
  # sem isto, todo upload novo falharia com "permission denied". Idempotente.
  $COMPOSE run --rm --no-deps --user root --entrypoint "" backend chown -R 1001:1001 /app/uploads
  $COMPOSE up -d --remove-orphans
fi

ok "Build concluído!"

# =============================================================================
# HEALTH CHECK
# =============================================================================
head "🩺 Verificando saúde do sistema"

# O backend não expõe porta no host: o teste roda de dentro do container.
ESPERA=0
until $COMPOSE exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" >/dev/null 2>&1; do
  ESPERA=$((ESPERA + 5))
  [ "$ESPERA" -ge 90 ] && err "Backend não respondeu em 90s. Veja: $COMPOSE logs --tail=100 backend"
  sleep 5
done
ok "Backend: online"

for SVC in frontend frontend_site; do
  PORTA=3000; [ "$SVC" = frontend_site ] && PORTA=3001
  if $COMPOSE exec -T "$SVC" wget -qO- "http://127.0.0.1:$PORTA/" >/dev/null 2>&1; then
    ok "$SVC: online"
  else
    warn "$SVC: não respondeu — verifique: $COMPOSE logs --tail=100 $SVC"
  fi
done

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
