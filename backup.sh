#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# LMC Concessionária - Backup Automático do Banco de Dados
# Salva um dump do postgres todo dia às 3h da manhã
# Configurar com: crontab -e → adicionar linha abaixo:
# 0 3 * * * /opt/lmc/backup.sh >> /opt/lmc/backup.log 2>&1
# ═══════════════════════════════════════════════════════════════════════════════

set -e

PROJECT_DIR="/opt/lmc"
BACKUP_DIR="/opt/lmc/backups"
DB_CONTAINER="lmc_postgres"
DB_USER="lmc_user"
DB_NAME="lmc_veiculos"
MAX_BACKUPS=30  # Guarda os últimos 30 dias

# Cria diretório de backups se não existir
mkdir -p "$BACKUP_DIR"

# Nome do arquivo com data/hora
FILENAME="lmc_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

echo "[$(date)] Iniciando backup → $FILENAME"

# Faz o dump comprimido
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILEPATH"

# Verifica se criou o arquivo
if [ -f "$FILEPATH" ] && [ -s "$FILEPATH" ]; then
    SIZE=$(du -sh "$FILEPATH" | cut -f1)
    echo "[$(date)] Backup concluído com sucesso! Tamanho: $SIZE"
else
    echo "[$(date)] ERRO: Backup falhou ou arquivo vazio!"
    exit 1
fi

# Remove backups antigos (mantém apenas os últimos MAX_BACKUPS)
cd "$BACKUP_DIR"
ls -t lmc_backup_*.sql.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
TOTAL=$(ls lmc_backup_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Total de backups guardados: $TOTAL"

# ─── Para restaurar um backup ────────────────────────────────────────────────
# gunzip -c /opt/lmc/backups/lmc_backup_XXXXXXXX_XXXXXX.sql.gz | \
#   docker exec -i lmc_postgres psql -U lmc_user lmc_veiculos
