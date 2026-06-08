# Fase 8.2 — Runbook ejecutable: API staging en VPS (manual, systemd + nginx)

> Fecha: **2026-06-06**. Solo documentación. Sin secretos (placeholders `<...>`).
> Para un VPS Linux (Debian/Ubuntu) con Node 20+ y `pnpm`. Health check: **`/health`** / **`/readyz`**.

## 1. Clonar y posicionar en la rama de release

```bash
sudo mkdir -p /opt/smartsense && sudo chown "$USER" /opt/smartsense
git clone https://github.com/cherrera0001/smart-sense-demo.git /opt/smartsense
cd /opt/smartsense
git checkout release/smartsense-f0-f7
git rev-parse HEAD            # debe ser 8244169 (o el HEAD vigente de la rama)
```

## 2. Instalar dependencias

```bash
corepack enable && corepack prepare pnpm@latest --activate    # si pnpm no está
pnpm install --frozen-lockfile
```

## 3. Archivo `.env` seguro (fuera de git, chmod 600)

> NUNCA versionar este archivo. Generar JWTs fuertes: `openssl rand -base64 48`.

```bash
cat > /opt/smartsense/apps/api/.env <<'EOF'
NODE_ENV=production
SERVICE_VERSION=0.8.2-staging
PORT=8080
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
JWT_SECRET=<GENERAR_>=32_CHARS>
JWT_REFRESH_SECRET=<GENERAR_>=32_CHARS>
CORS_ORIGIN=https://smartsense-web-v2-nw0i807ro-cherrera0001s-projects.vercel.app
EOF

chmod 600 /opt/smartsense/apps/api/.env
```

## 4. Migraciones y build

```bash
cd /opt/smartsense
pnpm db:migrate:deploy        # aplica migraciones (no 'dev'); idempotente
pnpm build:api                # compila apps/api → apps/api/dist
```

## 5. Servicio systemd

```bash
sudo tee /etc/systemd/system/smartsense-api.service > /dev/null <<'EOF'
[Unit]
Description=SmartSense API (staging)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/smartsense
EnvironmentFile=/opt/smartsense/apps/api/.env
ExecStart=/usr/bin/node apps/api/dist/server.js
Restart=on-failure
RestartSec=3
User=smartsense
Group=smartsense

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now smartsense-api
sudo systemctl status smartsense-api --no-pager
```

> Si el entry compilado difiere, ajustar `ExecStart` (p. ej. `ExecStart=/usr/bin/pnpm --filter @smartsense/api start`). Verificar la ruta real del bundle (`apps/api/dist/server.js`).

## 6. Reverse proxy nginx + TLS

```bash
sudo tee /etc/nginx/sites-available/smartsense-api > /dev/null <<'EOF'
server {
    listen 80;
    server_name api-staging.<TU_DOMINIO>;

    location / {
        proxy_pass http://127.0.0.1:8080;     # = PORT del .env
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/smartsense-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS con certbot
sudo certbot --nginx -d api-staging.<TU_DOMINIO>
```

## 7. Verificación remota

```bash
STAGING_API_URL="https://api-staging.<TU_DOMINIO>"

curl -fsS "${STAGING_API_URL}/health"     # 200 { status, service, version: 0.8.2-staging, uptime_s }
curl -fsS "${STAGING_API_URL}/readyz"     # 200 db ok / 503 degraded

API_BASE_URL="${STAGING_API_URL}" pnpm smoke:api    # 7 pasos OK
```

## 8. Criterio de PASS

- `systemctl status` → **active (running)**.
- `/health` 200; `/readyz` 200 (`db: ok`); TLS válido.
- `smoke:api` **7/7** contra la URL del VPS.
- `.env` con `chmod 600`, **no** en git.
