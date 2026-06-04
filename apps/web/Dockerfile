# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# SmartSense Web — imagen multi-stage (Next.js 15, pnpm workspaces).
#
# Build desde la RAÍZ del monorepo (contexto = raíz, no apps/web):
#   docker build -f apps/web/Dockerfile -t smartsense-web .
#
# Variables en build/runtime (NUNCA se copia .env):
#   NEXT_PUBLIC_*  → deben estar presentes en BUILD time (se inlinean en el bundle).
#   NODE_ENV=production, PORT (default 3000).
#
# NOTA sobre output standalone (recomendado para imágenes más pequeñas):
#   apps/web/next.config.js NO define `output: 'standalone'`. Si se añade
#   (`const nextConfig = { reactStrictMode: true, output: 'standalone' }`), el
#   runtime puede copiar solo `.next/standalone` + `.next/static` + `public` y
#   ejecutar `node apps/web/server.js`, eliminando node_modules del runtime.
#   Este Dockerfile NO modifica código: usa `next start` con node_modules.
# -----------------------------------------------------------------------------

# ----------------------------- Stage 1: build --------------------------------
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/iot-bridge/package.json apps/iot-bridge/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile=false

COPY . .

# NEXT_PUBLIC_* se inlinean aquí; sobreescribir con --build-arg si aplica.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @smartsense/web build

RUN pnpm prune --prod=false

# ---------------------------- Stage 2: runtime -------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

# Runtime con `next start`: requiere node_modules + el build .next + public + config.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/next.config.js ./apps/web/next.config.js
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["pnpm", "--filter", "@smartsense/web", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
