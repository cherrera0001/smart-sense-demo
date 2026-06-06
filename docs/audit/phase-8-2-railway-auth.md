# Fase 8.2 — Estado de autenticación Railway (API staging)

> Fecha: **2026-06-06**. Solo documentación. **No se tocó código.** Sin secretos (placeholders).
> Estado: **⛔ BLOQUEADO** — no hay forma de autenticarse contra Railway de forma no interactiva en este entorno.

## 1. Evidencia recolectada

| Comprobación | Comando | Resultado real |
|---|---|---|
| Identidad Railway | `railway whoami` | **Unauthorized** (sin sesión) |
| Token en entorno bash | `printenv RAILWAY_TOKEN` | **ausente** (vacío) |
| Token en entorno Windows | `$env:RAILWAY_TOKEN` (PowerShell) | **ausente** (vacío) |
| CLI alternativo (Fly) | `flyctl version` | **ausente** (no instalado) |
| CLI alternativo (Render) | — | sin CLI; Render se opera por dashboard/API key |

> Resumen: el único CLI de hosting de API presente es `railway`, y **no está autenticado** (ni sesión interactiva ni `RAILWAY_TOKEN`). `vercel` y `gh` sí están autenticados, pero sirven para web/PR, no para desplegar la API Fastify.

## 2. Decisión

**BLOQUEADO.** No se desplegó la API a staging y **no se inventó** ningún resultado de despliegue. Desplegar requiere una de las dos acciones humanas mínimas siguientes.

## 3. Acción mínima humana requerida

### Opción A — Login interactivo (recomendada para una sola persona)

```bash
railway login        # abre el navegador y autentica la sesión del CLI
railway whoami        # debe devolver el usuario/equipo, no "Unauthorized"
```

### Opción B — Token de servicio (recomendada para CI / ejecución delegada)

Generar un token en Railway (`Account → Tokens` o `Project → Tokens`) y exportarlo:

```bash
# bash
export RAILWAY_TOKEN="<RAILWAY_PROJECT_OR_ACCOUNT_TOKEN>"

# PowerShell
$env:RAILWAY_TOKEN = "<RAILWAY_PROJECT_OR_ACCOUNT_TOKEN>"

railway whoami        # validar
```

> Tras cualquiera de las dos opciones, el despliegue se ejecuta siguiendo los pasos exactos de `docs/audit/phase-8-2-api-staging-railway.md`. **No commitear el token** (fuera de git; usar `.env` gitignored o variable de sesión).

## 4. Conclusión

API staging en Railway = **⛔ BLOQUEADO por credenciales**. Acción mínima: `railway login` (interactivo) **o** exportar `RAILWAY_TOKEN`. Una vez disponible la auth, el despliegue es ejecutable end-to-end (runbook en `phase-8-2-api-staging-railway.md`). Producción intacta.
