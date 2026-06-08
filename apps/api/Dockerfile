# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# SmartSense API — imagen multi-stage (Fastify, pnpm workspaces, Prisma).
#
# Build desde la RAÍZ del monorepo (el contexto debe ser la raíz, no apps/api):
#   docker build -f apps/api/Dockerfile -t smartsense-api .
#
# Variables inyectadas en RUNTIME (NUNCA se hornean en la imagen, NUNCA se copia .env):
#   DATABASE_URL, DIRECT_URL, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN,
#   API_PORT (default 3001), NODE_ENV=production, SERVICE_VERSION (opcional).
#
# NOTA de runtime: el paquete @smartsense/db expone TypeScript directamente
# (exports → ./src/index.ts), por lo que el proceso se ejecuta con `tsx`
# (loader TS para Node) en lugar de `node dist/server.js` puro. El build de tsc
# (apps/api/dist) se ejecuta igualmente como verificación de tipos en el stage build.
# -----------------------------------------------------------------------------

# ----------------------------- Stage 1: build --------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# pnpm vía corepack (versión la fija el packageManager/engines del repo).
RUN corepack enable

# Copia manifiestos primero para cachear la capa de instalación.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/iot-bridge/package.json apps/iot-bridge/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

# Instala todo el workspace (incluye devDeps: tsx, prisma, typescript).
# --frozen-lockfile=false tolera lockfile ausente/desfasado en este entorno.
RUN pnpm install --frozen-lockfile=false

# Copia el resto del código fuente.
COPY . .

# Genera el cliente Prisma y compila la API (verificación de build de tsc).
RUN pnpm --filter @smartsense/db generate \
  && pnpm --filter @smartsense/api build

# Deja el store de pnpm limpio para reducir tamaño al copiar node_modules.
RUN pnpm prune --prod=false

# ---------------------------- Stage 2: runtime -------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=3001
ENV HOST=0.0.0.0

RUN corepack enable

# Artefactos necesarios en runtime:
#  - node_modules (incluye tsx + cliente Prisma generado y symlinks del workspace)
#  - manifiestos de workspace para que pnpm resuelva los filtros
#  - código de la API (src + dist) y del paquete @smartsense/db (src + prisma + generated)
#  - packages/shared (dependencia del workspace)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/src ./apps/api/src
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/tsconfig.json ./apps/api/tsconfig.json

COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/packages/shared ./packages/shared

EXPOSE 3001

# Liveness check contra /health (no requiere auth ni DB).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${API_PORT}/health" || exit 1

# Ejecuta la API con tsx (resuelve @smartsense/db, que es TS de origen).
# Las migraciones se aplican aparte (pnpm db:migrate:deploy), NO en el arranque.
CMD ["pnpm", "--filter", "@smartsense/api", "exec", "tsx", "src/server.ts"]
