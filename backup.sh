#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# LMC Concessionária - Backup do banco + fotos
#
#   bash backup.sh                  → faz o backup agora
#   bash backup.sh --instalar-cron  → agenda todo dia às 3h (idempotente)
#
# Cópia FORA da VPS (recomendado): instale o rclone, configure um remote
# (Google Drive, Backblaze, S3…) com `rclone config` e defina em /opt/lmc/.backup.env:
#   RCLONE_REMOTE="gdrive:lmc-backups"
# Sem isso o backup fica só no disco da VPS — se ela morrer, perde-se junto.
#
# Restaurar: veja restore.sh
# ═══════════════════════════════════════════════════════════════════════════════

# pipefail: sem ele, um pg_dump que falha no meio do pipe passa despercebido
# (o gzip gera um arquivo "não vazio" e o script dizia que deu certo).
set -euo pipefail

PROJECT_DIR="/opt/lmc"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_CONTAINER="lmc_postgres"
BACKEND_CONTAINER="lmc_backend"
DB_USER="lmc_user"
DB_NAME="lmc_veiculos"
MAX_BACKUPS=30   # guarda os últimos 30 de cada tipo
RCLONE_REMOTE=""
[ -f "$PROJECT_DIR/.backup.env" ] && source "$PROJECT_DIR/.backup.env"

if [ "${1:-}" = "--instalar-cron" ]; then
  LINHA="0 3 * * * /bin/bash $PROJECT_DIR/backup.sh >> $PROJECT_DIR/backup.log 2>&1"
  ( crontab -l 2>/dev/null | grep -v "$PROJECT_DIR/backup.sh" ; echo "$LINHA" ) | crontab -
  echo "Cron instalado: $LINHA"
  exit 0
fi

mkdir -p "$BACKUP_DIR"
DATA=$(date +%Y%m%d_%H%M%S)
DUMP="$BACKUP_DIR/lmc_backup_$DATA.sql.gz"
FOTOS="$BACKUP_DIR/lmc_uploads_$DATA.tar.gz"

echo "[$(date)] Iniciando backup $DATA"

# ── Banco ──────────────────────────────────────────────────────────────────────
if ! docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" --clean --if-exists "$DB_NAME" | gzip > "$DUMP"; then
  rm -f "$DUMP"
  echo "[$(date)] ERRO: pg_dump falhou."
  exit 1
fi
# Confere se o arquivo está íntegro E se o dump chegou ao fim (o pg_dump escreve
# esta linha só quando termina sem erro).
if ! gzip -t "$DUMP" || ! zcat "$DUMP" | tail -n 5 | grep -q "PostgreSQL database dump complete"; then
  rm -f "$DUMP"
  echo "[$(date)] ERRO: dump incompleto ou corrompido."
  exit 1
fi
echo "[$(date)] Banco: $(du -sh "$DUMP" | cut -f1)"

# ── Fotos (volume de uploads do backend) ──────────────────────────────────────
if docker run --rm --volumes-from "$BACKEND_CONTAINER" -v "$BACKUP_DIR:/backup" alpine \
     tar czf "/backup/$(basename "$FOTOS")" -C /app uploads; then
  echo "[$(date)] Fotos: $(du -sh "$FOTOS" | cut -f1)"
else
  rm -f "$FOTOS"
  echo "[$(date)] ERRO: backup das fotos falhou."
  exit 1
fi

# ── Rotação ───────────────────────────────────────────────────────────────────
cd "$BACKUP_DIR"
ls -t lmc_backup_*.sql.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
ls -t lmc_uploads_*.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f

# ── Cópia fora da VPS ─────────────────────────────────────────────────────────
if [ -n "$RCLONE_REMOTE" ]; then
  if rclone copy "$DUMP" "$RCLONE_REMOTE/" && rclone copy "$FOTOS" "$RCLONE_REMOTE/"; then
    echo "[$(date)] Cópia externa enviada para $RCLONE_REMOTE"
  else
    echo "[$(date)] ERRO: falha ao enviar a cópia externa para $RCLONE_REMOTE"
    exit 1
  fi
else
  echo "[$(date)] AVISO: sem cópia fora da VPS (defina RCLONE_REMOTE em $PROJECT_DIR/.backup.env)."
fi

echo "[$(date)] Backup concluído. Guardados: $(ls lmc_backup_*.sql.gz | wc -l) dumps."
