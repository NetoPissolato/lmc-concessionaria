#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# LMC Concessionária - Restaurar backup (banco e, opcionalmente, fotos)
#
#   bash restore.sh backups/lmc_backup_AAAAMMDD_HHMMSS.sql.gz [backups/lmc_uploads_AAAAMMDD_HHMMSS.tar.gz]
#
# ATENÇÃO: substitui o banco atual pelo do backup. Faz um backup do estado atual antes.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

PROJECT_DIR="/opt/lmc"
COMPOSE="docker compose -f $PROJECT_DIR/docker-compose.prod.yml"
DUMP="${1:-}"
FOTOS="${2:-}"

[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "Uso: bash restore.sh <dump.sql.gz> [uploads.tar.gz]"; exit 1; }
gzip -t "$DUMP" || { echo "Arquivo de dump corrompido: $DUMP"; exit 1; }

read -r -p "Isto vai SUBSTITUIR o banco atual por $DUMP. Digite RESTAURAR para continuar: " CONFIRMA
[ "$CONFIRMA" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }

echo "→ Backup do estado atual antes de restaurar"
bash "$PROJECT_DIR/backup.sh"

echo "→ Parando o backend (evita escrita durante a restauração)"
$COMPOSE stop backend

echo "→ Restaurando banco"
zcat "$DUMP" | docker exec -i lmc_postgres psql -v ON_ERROR_STOP=1 -U lmc_user lmc_veiculos >/dev/null

if [ -n "$FOTOS" ]; then
  echo "→ Restaurando fotos"
  docker run --rm --volumes-from lmc_backend -v "$(cd "$(dirname "$FOTOS")" && pwd):/backup" alpine \
    sh -c "rm -rf /app/uploads/* && tar xzf /backup/$(basename "$FOTOS") -C /app"
fi

echo "→ Subindo o backend e aplicando migrations pendentes"
$COMPOSE run --rm backend alembic upgrade head
$COMPOSE up -d backend
echo "Restauração concluída."
