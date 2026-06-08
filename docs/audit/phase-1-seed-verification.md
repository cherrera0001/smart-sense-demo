# Fase 1.1 — Verificación de Seeds

> Estado: ⏳ **PENDIENTE — bloqueada por entorno** (engine Docker no inicializó; ver `phase-1-runtime-verification.md`). El seed (`packages/db/prisma/seed.ts`) está autorizado y revisado estáticamente, pero **no se ejecutó contra una DB real**. No se afirma que pase.

## Comprobaciones a ejecutar (cuando Docker funcione)

```bash
docker compose up -d db && pnpm db:migrate && pnpm db:seed
# Verificación (psql o prisma studio):
```
| # | Verificación | Esperado |
|---|---|---|
| 1 | `SELECT count(*) FROM device_categories;` | ≥ 5 (Refrigeración, Climatización, Iluminación, Electrónica, Lavado) |
| 2 | `SELECT count(*) FROM distributors;` | ≥ 2 (CGE, Enel) |
| 3 | `SELECT code FROM tariffs;` | BT-1 (165 CLP/kWh), BT-1A |
| 4 | `SELECT name,is_demo FROM organizations WHERE is_demo;` | "DEMO — SmartSense", is_demo=true |
| 5 | `SELECT count(*) FROM installations;` | ≥ 1 (demo, Coquimbo, segment home) |
| 6 | `SELECT count(*) FROM energy_kits WHERE status='active';` | ≥ 1 (kit demo) |
| 7 | `SELECT count(*) FROM devices;` | 4 (Refrigerador, Lavadora, Microondas, TV) |
| 8 | `SELECT count(*) FROM electricity_bills;` | ≥ 1 (demo) si se sembró |
| 9 | `SELECT count(*) FROM alerts; SELECT count(*) FROM recommendations;` | ≥ 2 / ≥ 2 demo |
| 10 | Todos los datos demo cuelgan de la org `is_demo=true` | ✔ (marca explícita) |

## Marca de datos demo
Convención adoptada (desviación documentada): **`organizations.is_demo=true`**; todas las filas demo (installation/kit/devices/bill/alerts/recommendations) heredan ese carácter por pertenencia a la org demo. El catálogo global (device_categories/distributors/tariffs) NO es demo (reutilizable en todos los entornos).
