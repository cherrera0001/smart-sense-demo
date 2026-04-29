# 🏗️ Backlog MVP Backend — Semanas 1.5–3 (2.5 semanas, 8 tareas)

**Enfoque:** Backend-first. No hacer frontend cambios hasta que API esté definida.

**Stack sugerido:** Node.js (Express) + PostgreSQL + TypeScript

---

## FASE 1: DOMINIO + MODELO DE DATOS (3 días)

### TAREA B1️⃣: Definir Dominio y Entidades (1 día, 4 horas)

**Objetivo:** Documento con bounded contexts, entidades, reglas de negocio.

**Archivos:**
- Crear `backend/docs/DOMAIN.md` (nuevo documento)

**Criterio de terminado:**
- [ ] Documento dominio define: usuarios, cuentas, tarifas, dispositivos, consumo, alertas
- [ ] Cada entidad tiene: id, invariantes, reglas de negocio
- [ ] Relaciones entre entidades están claras
- [ ] No hay ambigüedad en "quién es dueño de qué"

**Contenido del documento:**

```markdown
# Dominio SmartSense

## Bounded Contexts

### 1. Identity (Usuarios)
- Entidad: User
  - id (UUID)
  - email (unique, normalized)
  - passwordHash (bcrypt)
  - createdAt
  - Reglas: email validado (RFC 5322), password >= 8 chars

### 2. Account (Cuentas)
- Entidad: Account (1:1 con User)
  - id (UUID)
  - userId (FK)
  - tariffType ('BT-1' | 'BT-1A')
  - region ('Coquimbo' | 'Santiago' | ...)
  - distribuidora (string)
  - clpPerKwh (number, clamped 100–500)
  - createdAt, updatedAt
  - Reglas: 1 usuario = 1 cuenta. Tarifa puede cambiar, histórico no se borra.

### 3. Energy (Consumo)
- Entidad: DailyConsumption
  - id (UUID)
  - accountId (FK)
  - date (date, unique per account)
  - kwhTotal (number, >= 0)
  - clpTotal (calculated: kwhTotal × account.clpPerKwh)
  - hourlyBreakdown (JSON: [{ hour: 0..23, kwh: number, clp: number }])
  - projectionEndOfMonthCLP (calculated, based on trend)
  - Reglas: immutable once created. Una entrada por día.

### 4. Devices (Enchufes)
- Entidad: SmartPlug
  - id (UUID)
  - accountId (FK)
  - alias (string, user-defined)
  - deviceType ('refrigerator' | 'washing_machine' | ...)
  - state ('online' | 'offline' | 'reconnecting')
  - lastPingMs (number)
  - createdAt
  - Reglas: online/offline es snapshot, no historizado en MVP.

### 5. Monitoring (Alertas)
- Entidad: Alert
  - id (UUID)
  - accountId (FK)
  - alertType ('anomaly' | 'suggestion' | 'tip')
  - title (string)
  - message (string)
  - estimatedSavingsCLP (number, nullable)
  - isRead (boolean, default false)
  - createdAt
  - Reglas: alertType define icono/color. isRead es mutable. Sin soft delete en MVP.

## Actors (Actores)

1. **User (Homeowner)**
   - Primary actor
   - Goals: entender consumo, reducir factura
   - Interaction: web app (móvil/desktop)

2. **Admin (Ops)**
   - Secondary actor
   - Goals: monitorear alertas, generar reportes
   - Interaction: admin API (futuro MVP+1)

## Casos de Uso Críticos

### UC1: Registrarse
- Actor: Usuario
- Entrada: email, password
- Proceso: crear User + Account (con tarifa default)
- Salida: JWT token, redirect a dashboard
- Reglas: email único, validar contraseña

### UC2: Loguear
- Actor: Usuario
- Entrada: email, password
- Proceso: validar credentials, generar JWT
- Salida: JWT token
- Reglas: max 3 intentos fallidos (implementar después)

### UC3: Ver Consumo Hoy
- Actor: Usuario
- Entrada: userId (via JWT)
- Proceso: GET /account → consumo de hoy (o yesterday si no existe)
- Salida: { clpTotal, kwhTotal, hourlyBreakdown, projectionEndOfMonth }
- Reglas: consumo es calculado del hourlyBreakdown

### UC4: Marcar Alerta Leída
- Actor: Usuario
- Entrada: userId, alertId
- Proceso: PATCH /alerts/:id { isRead: true }
- Salida: alert actualizada
- Reglas: solo propietario de account puede editar

### UC5: Seleccionar Tarifa (Onboarding)
- Actor: Usuario
- Entrada: tariffType, region, distribuidora
- Proceso: POST /account { tariffType, region, distribuidora }
- Salida: Account actualizada
- Reglas: validar tariffType enum, region enum, clpPerKwh update

## Invariantes de Negocio

- [ ] 1 User = 1 Account
- [ ] consumo.clpTotal === consumo.kwhTotal × account.clpPerKwh (siempre)
- [ ] DailyConsumption.clpTotal es recalculado si account.clpPerKwh cambia
- [ ] Alert solo visible a dueño de account
- [ ] projectionEndOfMonth está basado en consumo.hourly (no random)
```

**Deliverable:** Commit con `backend/docs/DOMAIN.md` bien completado.

---

### TAREA B2️⃣: Diseñar Schema PostgreSQL (1 día, 6 horas)

**Objetivo:** SQL migrations listas para ejecutar.

**Archivos:**
- Crear `backend/migrations/001_initial_schema.sql` (nuevo)
- Crear `backend/migrations/README.md` (instrucciones)

**Criterio de terminado:**
- [ ] Schema SQL compila sin errores
- [ ] PK/FK/indexes definidos
- [ ] Constraints: NOT NULL, UNIQUE, CHECK donde corresponde
- [ ] Tipos de datos correctos (uuid, text, numeric, boolean, timestamp, jsonb)
- [ ] Audit columns: created_at, updated_at (con defaults)
- [ ] Seed data incluído (usuario default + tarifa default)

**Contenido SQL:**

```sql
-- backend/migrations/001_initial_schema.sql

-- Users (Identity)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT email_valid CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);

-- Accounts (Account bounded context)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tariff_type TEXT NOT NULL CHECK (tariff_type IN ('BT-1', 'BT-1A')),
  region TEXT NOT NULL,
  distribuidora TEXT NOT NULL,
  clp_per_kwh NUMERIC(10, 2) NOT NULL CHECK (clp_per_kwh > 0 AND clp_per_kwh < 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Daily Consumption (Energy context)
CREATE TABLE daily_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  kwh_total NUMERIC(10, 2) NOT NULL CHECK (kwh_total >= 0),
  clp_total NUMERIC(10, 2) NOT NULL CHECK (clp_total >= 0),
  hourly_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  projection_end_of_month_clp NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, date)
);

CREATE INDEX idx_consumptions_account_date ON daily_consumptions(account_id, date DESC);

-- Smart Plugs (Devices)
CREATE TABLE smart_plugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  device_type TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('online', 'offline', 'reconnecting')),
  last_ping_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plugs_account_id ON smart_plugs(account_id);

-- Alerts (Monitoring)
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('anomaly', 'suggestion', 'tip')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  estimated_savings_clp NUMERIC(10, 2),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_account_id ON alerts(account_id);
CREATE INDEX idx_alerts_is_read ON alerts(account_id, is_read) WHERE NOT is_read;

-- SEED DATA
INSERT INTO users (email, password_hash)
VALUES ('demo@example.com', '$2b$10$...')
ON CONFLICT (email) DO NOTHING;

INSERT INTO accounts (user_id, tariff_type, region, distribuidora, clp_per_kwh)
SELECT id, 'BT-1', 'Coquimbo', 'CGE', 165
FROM users WHERE email = 'demo@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

**Deliverable:** Commit con migrations SQL listas.

---

### TAREA B3️⃣: Crear OpenAPI v1 Spec (1 día, 4 horas)

**Objetivo:** Contrato API documentado. Frontend y backend pueden trabajar en paralelo.

**Archivos:**
- Crear `backend/openapi.yaml` (especificación)

**Criterio de terminado:**
- [ ] OpenAPI 3.0.0 spec válido (validar con `openapi-generator-cli` o web tool)
- [ ] 5 endpoints mínimos: auth/register, auth/login, GET /account, POST /account, PATCH /alerts/:id
- [ ] Schemas definidos para request/response
- [ ] Error responses documentadas (400, 401, 404, 500)
- [ ] Security scheme: Bearer token JWT

**Contenido OpenAPI (resumen):**

```yaml
# backend/openapi.yaml
openapi: 3.0.0
info:
  title: SmartSense Energy API
  version: 0.1.0
  description: Energy monitoring and alerting for Chilean households

paths:
  /auth/register:
    post:
      summary: Register new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
              required: [email, password]
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'
        '400':
          description: Invalid input
        '409':
          description: Email already exists

  /auth/login:
    post:
      summary: Login user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                password:
                  type: string
              required: [email, password]
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
        '401':
          description: Invalid credentials

  /account:
    get:
      summary: Get user account and today's consumption
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Account details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AccountResponse'
        '401':
          description: Unauthorized
    post:
      summary: Update account (tariff, region)
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                tariff_type:
                  enum: [BT-1, BT-1A]
                region:
                  type: string
                distribuidora:
                  type: string
      responses:
        '200':
          description: Account updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Account'

  /alerts:
    get:
      summary: List alerts for account
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of alerts
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Alert'

  /alerts/{id}:
    patch:
      summary: Mark alert as read
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                is_read:
                  type: boolean
      responses:
        '200':
          description: Alert updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Alert'
        '404':
          description: Alert not found

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
    
    Account:
      type: object
      properties:
        id:
          type: string
          format: uuid
        tariff_type:
          enum: [BT-1, BT-1A]
        region:
          type: string
        distribuidora:
          type: string
        clp_per_kwh:
          type: number

    AccountResponse:
      allOf:
        - $ref: '#/components/schemas/Account'
        - type: object
          properties:
            today_consumption:
              type: object
              properties:
                kwh_total:
                  type: number
                clp_total:
                  type: number
                hourly_breakdown:
                  type: array
                projection_end_of_month_clp:
                  type: number

    Alert:
      type: object
      properties:
        id:
          type: string
          format: uuid
        alert_type:
          enum: [anomaly, suggestion, tip]
        title:
          type: string
        message:
          type: string
        is_read:
          type: boolean
        created_at:
          type: string
          format: date-time

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

**Deliverable:** `backend/openapi.yaml` válido. Puede validarse en https://editor.swagger.io/

---

## FASE 2: IMPLEMENTACIÓN BACKEND (5 días)

### TAREA B4️⃣: Setup Backend + Database (1 día, 6 horas)

**Objetivo:** Repo backend funcional, DB conectada, migrations aplicadas.

**Archivo:** Crear `backend/` carpeta (nuevo directorio)

**Criterio de terminado:**
- [ ] `backend/package.json` con dependencias: express, pg, bcryptjs, jsonwebtoken, dotenv
- [ ] `backend/.env.local` (gitignored) con DATABASE_URL, JWT_SECRET
- [ ] `backend/src/db.ts` — instancia de Pool PostgreSQL
- [ ] `backend/migrations/` — carpeta con SQL migrations
- [ ] `pnpm install` en backend ejecuta sin errores
- [ ] `pnpm run migrate` aplica schema a DB local (PostgreSQL)
- [ ] Seed data creado (demo user con password hasheada)

**Setup exacto:**

```bash
# En raíz del proyecto (ya está git init)
mkdir backend
cd backend
pnpm init

# Agregar a package.json:
# "scripts": {
#   "dev": "ts-node src/index.ts",
#   "migrate": "node scripts/migrate.js",
#   "build": "tsc"
# }

pnpm add express pg bcryptjs jsonwebtoken dotenv cors
pnpm add -D typescript ts-node @types/node @types/express
```

**Archivos clave:**

`backend/src/db.ts`:
```typescript
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function query(text: string, params?: any[]) {
  return pool.query(text, params)
}

export async function getClient() {
  return pool.connect()
}
```

`backend/.env.local`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/smartsense_dev
JWT_SECRET=test-secret-key-change-in-production
PORT=3001
```

**Deliverable:** Backend repo estructura lista, DB conectada, migrations aplicadas.

---

### TAREA B5️⃣: Implementar Autenticación (Register + Login) (1 día, 6 horas)

**Objetivo:** Usuarios pueden registrarse y loguear con JWT.

**Archivos:**
- `backend/src/routes/auth.ts` — nuevo
- `backend/src/middleware/auth.ts` — nuevo
- `backend/src/index.ts` — main app

**Criterio de terminado:**
- [ ] POST /auth/register crea usuario + account
- [ ] POST /auth/login valida credentials, retorna JWT
- [ ] Middleware de autenticación verifica JWT en headers
- [ ] Password hasheado con bcrypt
- [ ] No hay passwords en logs/responses

**Código esencial:**

`backend/src/routes/auth.ts`:
```typescript
import express, { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db'

const router = express.Router()

router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body

  // Validate
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Invalid email or password' })
  }

  try {
    // Hash password
    const hash = await bcrypt.hash(password, 10)

    // Create user
    const userResult = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    )
    const userId = userResult.rows[0].id

    // Create account with default tariff
    await query(
      `INSERT INTO accounts (user_id, tariff_type, region, distribuidora, clp_per_kwh)
       VALUES ($1, 'BT-1', 'Coquimbo', 'CGE', 165)`,
      [userId]
    )

    // Generate token
    const token = jwt.sign({ userId, email }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    })

    return res.status(201).json({ token, user: { id: userId, email } })
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' })
    }
    return res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  try {
    const userResult = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    )
    const user = userResult.rows[0]

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    })

    return res.json({ token })
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' })
  }
})

export default router
```

`backend/src/middleware/auth.ts`:
```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    req.userId = decoded.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

`backend/src/index.ts`:
```typescript
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'

const app = express()
app.use(express.json())
app.use(cors())

app.use('/auth', authRoutes)

app.listen(3001, () => {
  console.log('Server running on :3001')
})
```

**Deliverable:** Auth endpoints funcionan, puedes registrar + loguear.

---

### TAREA B6️⃣: Implementar Account + Consumo (1 día, 5 horas)

**Objetivo:** GET /account retorna consumo de hoy; POST /account actualiza tarifa.

**Archivos:**
- `backend/src/routes/account.ts` — nuevo
- `backend/src/services/energyService.ts` — lógica de cálculo

**Criterio de terminado:**
- [ ] GET /account retorna account + consumo de hoy
- [ ] Consumo es calculado (no hardcodeado)
- [ ] POST /account { tariff_type, region } actualiza y recalcula
- [ ] projectionEndOfMonth es estimado de trend
- [ ] Tests: cálculo de tarifa (kwh × clp/kwh = clp_total)

**Código esencial:**

`backend/src/services/energyService.ts`:
```typescript
import { query } from '../db'

export async function getTodayConsumption(accountId: string) {
  // Get or seed consumption for today
  const today = new Date().toISOString().split('T')[0]

  let result = await query(
    `SELECT * FROM daily_consumptions WHERE account_id = $1 AND date = $2`,
    [accountId, today]
  )

  if (result.rows.length === 0) {
    // Seed mock consumption for today
    const hourlyBreakdown = generateMockHourly()
    const kwhTotal = hourlyBreakdown.reduce((sum, h) => sum + h.kwh, 0)

    const accountResult = await query(
      'SELECT clp_per_kwh FROM accounts WHERE id = $1',
      [accountId]
    )
    const clpPerKwh = accountResult.rows[0].clp_per_kwh
    const clpTotal = kwhTotal * clpPerKwh

    result = await query(
      `INSERT INTO daily_consumptions (account_id, date, kwh_total, clp_total, hourly_breakdown)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [accountId, today, kwhTotal, clpTotal, JSON.stringify(hourlyBreakdown)]
    )
  }

  return result.rows[0]
}

function generateMockHourly() {
  // Same pattern as frontend mock-data
  return [
    { hour: 0, kwh: 0.14 },
    { hour: 1, kwh: 0.12 },
    // ... etc (7.58 total for day)
  ]
}

export async function updateAccount(accountId: string, tariffType: string, region: string) {
  // Lookup clpPerKwh from tariff table (or hardcoded mapping)
  const clpPerKwh = tariffType === 'BT-1' ? 165 : 180

  return query(
    `UPDATE accounts SET tariff_type = $1, region = $2, clp_per_kwh = $3, updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [tariffType, region, clpPerKwh, accountId]
  )
}
```

`backend/src/routes/account.ts`:
```typescript
import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { query } from '../db'
import { getTodayConsumption, updateAccount } from '../services/energyService'

const router = express.Router()

router.get('/account', authMiddleware, async (req: Request, res: Response) => {
  try {
    const accountResult = await query(
      'SELECT * FROM accounts WHERE user_id = $1',
      [req.userId]
    )
    const account = accountResult.rows[0]

    const consumptionResult = await getTodayConsumption(account.id)
    const consumption = consumptionResult

    return res.json({
      account: {
        id: account.id,
        tariff_type: account.tariff_type,
        region: account.region,
        distribuidora: account.distribuidora,
        clp_per_kwh: account.clp_per_kwh,
      },
      today_consumption: {
        kwh_total: consumption.kwh_total,
        clp_total: consumption.clp_total,
        hourly_breakdown: consumption.hourly_breakdown,
        projection_end_of_month_clp: consumption.projection_end_of_month_clp,
      },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get account' })
  }
})

router.post('/account', authMiddleware, async (req: Request, res: Response) => {
  const { tariff_type, region, distribuidora } = req.body

  try {
    const accountResult = await query(
      'SELECT id FROM accounts WHERE user_id = $1',
      [req.userId]
    )
    const accountId = accountResult.rows[0].id

    const updated = await updateAccount(accountId, tariff_type, region)
    return res.json(updated.rows[0])
  } catch (err) {
    return res.status(400).json({ error: 'Failed to update account' })
  }
})

export default router
```

En `backend/src/index.ts`, agregar:
```typescript
import accountRoutes from './routes/account'
app.use(accountRoutes)
```

**Deliverable:** GET /account y POST /account funcionan end-to-end.

---

### TAREA B7️⃣: Implementar Alerts (1 día, 4 horas)

**Objetivo:** GET /alerts y PATCH /alerts/:id funcionales.

**Archivos:**
- `backend/src/routes/alerts.ts` — nuevo

**Criterio de terminado:**
- [ ] GET /alerts retorna lista de alertas para cuenta
- [ ] PATCH /alerts/:id { is_read: true } actualiza y persiste
- [ ] Data validation: only owner of account can read/update alerts
- [ ] Seed data: 3 alertas por cuenta nueva

**Código esencial:**

`backend/src/routes/alerts.ts`:
```typescript
import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { query } from '../db'

const router = express.Router()

router.get('/alerts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const accountResult = await query(
      'SELECT id FROM accounts WHERE user_id = $1',
      [req.userId]
    )
    const accountId = accountResult.rows[0].id

    const alertsResult = await query(
      `SELECT * FROM alerts WHERE account_id = $1 ORDER BY created_at DESC`,
      [accountId]
    )

    return res.json(alertsResult.rows)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get alerts' })
  }
})

router.patch('/alerts/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params
  const { is_read } = req.body

  try {
    // Verify ownership
    const alertResult = await query(
      `SELECT a.* FROM alerts a
       JOIN accounts acc ON a.account_id = acc.id
       WHERE a.id = $1 AND acc.user_id = $2`,
      [id, req.userId]
    )

    if (!alertResult.rows.length) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    const updated = await query(
      `UPDATE alerts SET is_read = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [is_read, id]
    )

    return res.json(updated.rows[0])
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update alert' })
  }
})

export default router
```

Seed alerts en migration o en account creation.

**Deliverable:** Alertas persisten, marcar como leída funciona.

---

### TAREA B8️⃣: Tests + CI/CD (1 día, 5 horas)

**Objetivo:** Tests pasan, API contrato validado, CI pipeline verde.

**Archivos:**
- `backend/__tests__/auth.test.ts` — nuevos
- `backend/__tests__/account.test.ts`
- `backend/__tests__/alerts.test.ts`
- `backend/jest.config.js`
- `.github/workflows/backend-ci.yml`

**Criterio de terminado:**
- [ ] Unit tests: tariff calculation (kwh × clp = total)
- [ ] Integration tests: auth → account → alert flow
- [ ] Contract tests: API responses match OpenAPI spec
- [ ] Tests pasan en local
- [ ] CI runs on push (GitHub Actions)
- [ ] Coverage > 70%

**Test esencial (ejemplo):**

`backend/__tests__/account.test.ts`:
```typescript
import { getTodayConsumption } from '../src/services/energyService'

describe('Account', () => {
  it('calculates clp_total = kwh_total × clp_per_kwh', async () => {
    const consumption = await getTodayConsumption('test-account-id')
    
    expect(consumption.clp_total).toBe(
      consumption.kwh_total * consumption.clp_per_kwh
    )
  })

  it('returns hourly breakdown that sums to kwh_total', async () => {
    const consumption = await getTodayConsumption('test-account-id')
    const sum = consumption.hourly_breakdown.reduce((acc, h) => acc + h.kwh, 0)
    
    expect(sum).toBeCloseTo(consumption.kwh_total, 2)
  })
})
```

**Deliverable:** All tests green, CI pipeline configured.

---

## CHECKLIST GATE 2 (Fin MVP Backend)

- [ ] B1: Dominio + entidades documentados
- [ ] B2: Schema SQL migrado a DB
- [ ] B3: OpenAPI spec validado
- [ ] B4: Backend setup + DB conectada
- [ ] B5: Auth register + login funcional
- [ ] B6: GET /account + POST /account funcional
- [ ] B7: GET /alerts + PATCH /alerts/:id funcional
- [ ] B8: Tests > 70% coverage, CI verde
- [ ] Verificación E2E: login → ver consumo → marcar alerta → logout funciona sin errors

**Si TODO cumple:** Pasar a GATE 2. Caso contrario, volver a tareas fallidas.

---

## INTEGRACIÓN CON FRONTEND (Paralelo a B5–B8)

Una vez backend esté en B4–B5, frontend comienza:

**Tareas Frontend paralelas (durante B6–B8):**

1. **Crear API client** (`lib/api.ts`)
   ```typescript
   const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
   
   export async function fetchAccount(token: string) {
     return fetch(`${API_BASE}/account`, {
       headers: { Authorization: `Bearer ${token}` }
     }).then(r => r.json())
   }
   ```

2. **Conectar onboarding a backend** (`app/onboarding/page.tsx`)
   - Step3Tarifa ahora hace POST /account, guarda token en localStorage/cookie

3. **Conectar dashboard a API** (`app/dashboard/page.tsx`)
   - HeroNumerico ahora lee de `fetchAccount()` en lugar de mock

4. **Tests de integración** (Playwright)
   - Full flow: register → onboarding → dashboard works end-to-end

---

## ESTIMACIÓN TOTAL

| Fase | Tareas | Horas | Timeline |
|------|--------|-------|----------|
| **Fase 1** | B1-B3 (Dominio + Schema + API spec) | 11 | 1.5 días |
| **Fase 2** | B4-B8 (Backend impl + tests) | 26 | 3.5 días |
| **TOTAL** | 8 tareas | **37 horas** | **2.5 semanas** (con paralelismo frontend) |

Si work es focused y frontend comienza en B5: ambas terminan juntas en semana 3.

