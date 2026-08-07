#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# LMC Concessionária - Script de Setup Inicial da VPS
# Executar como root na VPS Ubuntu 24.04
# ═══════════════════════════════════════════════════════════════════════════════

set -e

DOMAIN="spacerstorepaineladmin.com"
EMAIL="admin@spacerstorepaineladmin.com"
PROJECT_DIR="/opt/lmc-concessionaria"

echo "═══════════════════════════════════════════════════════════════"
echo "  LMC Concessionária - Setup da VPS"
echo "  Domínio: $DOMAIN"
echo "═══════════════════════════════════════════════════════════════"

# ─── 1. Atualizar Sistema ──────────────────────────────────────────────────────
echo ""
echo "[1/6] Atualizando sistema..."
apt update && apt upgrade -y

# ─── 2. Instalar Dependências ──────────────────────────────────────────────────
echo ""
echo "[2/6] Instalando dependências..."
apt install -y \
    curl \
    git \
    ufw \
    fail2ban \
    htop \
    unzip

# ─── 3. Instalar Docker ───────────────────────────────────────────────────────
echo ""
echo "[3/6] Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker instalado com sucesso!"
else
    echo "Docker já instalado: $(docker --version)"
fi

# Verificar Docker Compose
docker compose version

# ─── 4. Configurar Firewall ───────────────────────────────────────────────────
echo ""
echo "[4/6] Configurando firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
ufw status

# ─── 5. Configurar Fail2Ban ───────────────────────────────────────────────────
echo ""
echo "[5/6] Configurando Fail2Ban..."
systemctl enable fail2ban
systemctl start fail2ban

# ─── 6. Criar Diretório do Projeto ────────────────────────────────────────────
echo ""
echo "[6/6] Preparando diretório do projeto..."
mkdir -p $PROJECT_DIR
mkdir -p $PROJECT_DIR/certbot/conf
mkdir -p $PROJECT_DIR/certbot/www
mkdir -p $PROJECT_DIR/backend/uploads

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Setup concluído com sucesso!"
echo ""
echo "  Próximos passos:"
echo "  1. Transfira o projeto para $PROJECT_DIR"
echo "  2. Execute o script deploy.sh"
echo "═══════════════════════════════════════════════════════════════"
