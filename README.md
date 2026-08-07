# 🚗 LMC Veículos — Sistema ERP

Sistema de gestão completo para concessionária. Desenvolvido com **FastAPI** (backend), **Next.js** (frontend), **PostgreSQL** e **Redis**, orquestrado com **Docker Compose**.

---

## 🏗️ Arquitetura

```
nginx (porta 80/443)
├── /api/v1/*     → FastAPI (porta 8000)
└── /*            → Next.js (porta 3000)

PostgreSQL (banco de dados)
Redis (cache / sessões)
```

---

## 🚀 Deploy em Nova VPS (Hostinger / qualquer Ubuntu 22+)

### Pré-requisitos
- VPS com Ubuntu 22.04
- DNS apontando para o IP da VPS
- Porta 80 e 443 liberadas no firewall da Hostinger

### 1. Acesse a VPS via SSH
```bash
ssh root@IP_DA_VPS
```

### 2. Instale o Docker (se não tiver)
```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker --now
```

### 3. Clone o repositório
```bash
git clone https://github.com/SEU_USUARIO/SEU_REPO.git /opt/lmc
cd /opt/lmc
```

### 4. Configure as variáveis de ambiente
```bash
cp backend/.env.example backend/.env.production
nano backend/.env.production
# Preencha: POSTGRES_PASSWORD, SECRET_KEY, CORS_ORIGINS (com seu domínio)
```

### 5. Suba os containers
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 6. Inicialize o banco de dados (somente no PRIMEIRO deploy)
```bash
docker compose -f docker-compose.prod.yml exec backend python scripts/setup_db.py
docker compose -f docker-compose.prod.yml exec backend python scripts/create_admin.py
```

### 7. Configure o SSL (Certbot)
```bash
docker run --rm \
  -v /opt/lmc/certbot/conf:/etc/letsencrypt \
  -v /opt/lmc/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email SEU_EMAIL \
  --agree-tos --no-eff-email \
  -d SEU_SUBDOMINIO.seudominio.com
```

### 8. Reconfigure o nginx para HTTPS
Edite `nginx/nginx.conf` habilitando o bloco SSL e reinicie:
```bash
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 🔄 Atualizar Deploy (após git push)

Na VPS, execute:
```bash
cd /opt/lmc
git pull origin main
docker compose -f docker-compose.prod.yml build --no-cache frontend backend
docker compose -f docker-compose.prod.yml up -d
```

Ou use o script automático:
```bash
bash deploy.sh
```

---

## 🔑 Credenciais Iniciais (trocar após primeiro acesso)

| Campo  | Valor                  |
|--------|------------------------|
| Email  | `admin@lmcveiculos.com` |
| Senha  | `Admin@123`            |

> ⚠️ **Troque a senha imediatamente após o primeiro login!**

---

## 🐳 Comandos Docker Úteis

```bash
# Ver status dos containers
docker compose -f docker-compose.prod.yml ps

# Ver logs em tempo real
docker compose -f docker-compose.prod.yml logs -f

# Logs de um serviço específico
docker compose -f docker-compose.prod.yml logs -f backend

# Reiniciar um serviço
docker compose -f docker-compose.prod.yml restart nginx

# Acessar terminal do backend
docker compose -f docker-compose.prod.yml exec backend bash
```

---

## 📁 Estrutura do Projeto

```
├── backend/           # FastAPI (Python)
│   ├── app/
│   ├── scripts/       # setup_db.py, create_admin.py
│   ├── Dockerfile
│   └── .env.example   # Modelo das variáveis (NÃO commitar .env.production)
├── frontend/          # Next.js (React)
│   ├── src/
│   └── Dockerfile
├── nginx/
│   └── nginx.conf     # Config do proxy reverso + SSL
├── docker-compose.prod.yml  # Produção
├── docker-compose.yml       # Desenvolvimento local
└── deploy.sh          # Script de deploy automatizado
```

---

## 🔒 Segurança

- Nunca commitar arquivos `.env.production` no git
- Trocar a senha do admin no primeiro acesso
- Manter o `SECRET_KEY` único e seguro (min 64 chars aleatórios)
- O certificado SSL é renovado automaticamente pelo Certbot
