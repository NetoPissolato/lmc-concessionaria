# 🚗 LMC Veículos — Sistema ERP

Sistema de gestão para concessionária (painel) e site público da loja. **FastAPI** (backend), **Next.js** (painel e site), **PostgreSQL** e **Redis**, orquestrados com **Docker Compose**.

---

## 🏗️ Arquitetura

```
nginx (porta 80/443)
├── lcm.<dominio>   /api/v1/* → FastAPI (backend:8000)
│                   /*        → Next.js painel (frontend:3000)
└── site.<dominio>  /*        → Next.js site da loja (frontend_site:3001)

PostgreSQL (dados) · Redis (sessões, bloqueio de login, rate limit)
```

O site e o painel são o mesmo código Next.js; o `proxy.ts` decide pelo domínio. Hosts que começam com `site.` vão para a loja. Para usar um domínio próprio na loja, defina `SITE_HOST=lmcveiculos.com.br` no serviço `frontend_site` e `NEXT_PUBLIC_SITE_URL=https://lmcveiculos.com.br` (usado em links, sitemap e compartilhamento).

---

## 🚀 Deploy em Nova VPS (Ubuntu 22+)

### Pré-requisitos
- DNS de `lcm.` e `site.` apontando para o IP da VPS
- Portas 80 e 443 liberadas

### 1. Docker e repositório
```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker --now
git clone https://github.com/SEU_USUARIO/SEU_REPO.git /opt/lmc
cd /opt/lmc
```

### 2. Senhas do banco e do Redis — `/opt/lmc/.env`
O `docker-compose.prod.yml` não sobe sem elas (não há mais senha padrão no arquivo).
```bash
cat > /opt/lmc/.env <<EOF
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=')
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=')
EOF
chmod 600 /opt/lmc/.env
```
> ⚠️ **Servidor que já está no ar:** use as senhas que o banco e o Redis **já usam hoje**. Senha nova num volume de banco existente = backend sem conexão.

### 3. Variáveis do backend — `backend/.env.production`
```bash
cp backend/.env.example backend/.env.production
nano backend/.env.production   # JWT_SECRET_KEY, ALLOWED_ORIGINS, FRONTEND_URL
```

### 4. Primeiro deploy
```bash
bash deploy.sh --first
```
Cria as tabelas (`scripts/instalar_banco.py`), agenda o backup diário e sobe tudo.

### 5. Administrador
Não existe mais senha padrão. Crie o admin informando o e-mail; a senha aleatória aparece **uma vez** no terminal:
```bash
docker compose -f docker-compose.prod.yml run --rm -e ADMIN_EMAIL=dono@loja.com backend python scripts/create_admin.py
```
(`-e ADMIN_SENHA=...` define a senha em vez de gerar.)

### 6. SSL (Certbot)
```bash
docker run --rm \
  -v /opt/lmc/certbot/conf:/etc/letsencrypt \
  -v /opt/lmc/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email SEU_EMAIL --agree-tos --no-eff-email \
  -d lcm.seudominio.com -d site.seudominio.com
docker compose -f docker-compose.prod.yml restart nginx
```
O container `certbot` renova sozinho e o nginx recarrega os certificados.

---

## 🔄 Atualizar (após git push)

```bash
cd /opt/lmc
bash update.sh                 # backup → build → migrations → sobe → health check
bash update.sh --rollback      # volta para o deploy anterior
```
- O `update.sh` faz backup antes e roda `alembic upgrade head`. Se o backend não responder em 90s, ele para e mostra os logs; aí é `bash update.sh --rollback`.
- Repositório privado: use uma deploy key SSH na VPS ou `GITHUB_TOKEN=xxxx bash update.sh`. **Nunca** grave token no script.
- Depois do primeiro deploy desta versão, gere as miniaturas das fotos antigas (o site fica bem mais leve):
  ```bash
  docker compose -f docker-compose.prod.yml exec backend python scripts/gerar_miniaturas.py
  ```

---

## 💾 Backup e restauração

```bash
bash backup.sh                   # banco + fotos agora (em /opt/lmc/backups)
bash backup.sh --instalar-cron   # todo dia às 3h (o deploy --first já faz)
bash restore.sh backups/lmc_backup_AAAAMMDD_HHMMSS.sql.gz [backups/lmc_uploads_AAAAMMDD_HHMMSS.tar.gz]
```
Backup que fica só na VPS morre junto com ela. Configure uma cópia externa com `rclone config` (Google Drive, Backblaze, S3…) e defina em `/opt/lmc/.backup.env`:
```bash
RCLONE_REMOTE="gdrive:lmc-backups"
```
Teste a restauração de vez em quando — backup nunca restaurado não é backup.

---

## 🧪 Desenvolvimento e testes

```bash
# backend (precisa de um PostgreSQL de teste; o Redis é simulado)
cd backend
pip install -r requirements-dev.txt
TEST_DATABASE_URL=postgresql+asyncpg://usuario:senha@localhost:5432/lmc_test pytest

# frontend
cd frontend
npm install && npm run dev      # painel em http://localhost:3000, site em http://site.localhost:3000
```
Mudou modelo do banco? Gere a migration (`alembic revision --autogenerate -m "..."`), revise o arquivo e commite junto.

---

## 🐳 Comandos Docker úteis

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml restart nginx
docker compose -f docker-compose.prod.yml exec backend bash
```

---

## 📁 Estrutura

```
├── backend/                 # FastAPI
│   ├── app/                 # domain / application / infrastructure / presentation
│   ├── alembic/             # migrations (rodam no update.sh)
│   ├── scripts/             # instalar_banco.py, create_admin.py, gerar_miniaturas.py
│   └── tests/               # pytest (vendas, caixa, autenticação)
├── frontend/                # Next.js
│   └── src/app/
│       ├── (dashboard)/     # painel
│       ├── (auth)/          # login
│       └── (site)/          # site da loja
├── nginx/nginx.conf         # proxy reverso, SSL, limites de requisição
├── docker-compose.prod.yml  # produção
├── deploy.sh · update.sh    # primeiro deploy · atualizações
└── backup.sh · restore.sh   # backup diário · restauração
```

---

## 🔒 Segurança

- `.env`, `.env.production` e backups nunca vão para o git (nem para pacotes `.tar.gz` de deploy)
- Sessão revogável: trocar senha, desativar usuário ou mudar o papel derruba os logins abertos dele
- Token de acesso curto (30 min) com refresh rotativo; 5 senhas erradas bloqueiam o login por 15 min
- Funcionário não vê caixa, relatórios nem usuários; desfazer venda e apagar despesa são só do administrador
