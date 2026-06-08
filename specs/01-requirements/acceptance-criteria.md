# Criterios de Aceptación (Gherkin) — SmartSense

> Deriva de `functional-requirements.md` y `non-functional-requirements.md`. Formato Gherkin (Dado/Cuando/Entonces) para los flujos críticos.
> Cada feature referencia el/los FR (y NFR) que cubre. Idioma: español.

---

## Feature: Onboarding completo (escaneo → claim → emparejamiento → perfil)
**Cubre:** FR-ONB-001, FR-ONB-002, FR-ONB-003, FR-ONB-004, FR-ONB-005, FR-ONB-006, FR-ONB-008, FR-PROF-001.

```gherkin
Antecedentes:
  Dado que estoy autenticado como "owner" de la organización "Org A"
  Y existe una instalación "Casa Principal" en "Org A"
  Y existe un kit con qr_code "KIT-XYZ" en estado "unclaimed"

Escenario: Reclamar un kit no reclamado y emparejar dispositivos
  Cuando escaneo el QR "KIT-XYZ"
  Entonces veo el serial, modelo y firmware del kit
  Cuando confirmo reclamar el kit para "Casa Principal"
  Entonces el kit queda en estado "active" con claimed_at registrado
  Y se crea un registro en audit_logs con action "kit.claimed"
  Cuando el kit reporta dispositivos detectados
  Entonces veo cada dispositivo en estado "scanning"
  Y luego en estado "recommended"
  Cuando acepto un dispositivo "recommended" y le asigno nombre y categoría
  Entonces se crea un Device asociado al kit y el pairing pasa a "paired"

Escenario: Selección de segmento y perfil
  Dado que el kit está "active" con al menos un Device "paired"
  Cuando selecciono el tipo de instalación "home"
  Y registro 4 personas y sistema de calefacción "gas"
  Entonces installations.segment es "home"
  Y el installation_profile queda guardado con occupants=4
  Y el onboarding se marca como completo

Escenario: Intentar reclamar un kit ya activo en otra instalación
  Dado que el kit "KIT-XYZ" está "active" en otra instalación
  Cuando intento reclamarlo para "Casa Principal"
  Entonces el sistema rechaza el claim
  Y el kit conserva su instalación original

Escenario: QR inexistente
  Cuando escaneo un QR "KIT-NOEXISTE"
  Entonces recibo un mensaje de error de kit no encontrado
  Y no se crea ninguna asociación
```

---

## Feature: Ingesta de telemetría con idempotencia
**Cubre:** FR-DASH-001 (consumo en vivo), NFR-028 (idempotencia), NFR-029 (doble timestamp), NFR-030 (validez referencial), NFR-031 (rangos), NFR-021 (latencia).

```gherkin
Antecedentes:
  Dado un Device "DEV-1" perteneciente a un kit "active" de la instalación "Casa Principal"

Escenario: Ingesta de una lectura válida
  Cuando el kit publica una lectura para "DEV-1" con event_hash "H1", source_timestamp "2026-06-01T10:00:00Z" y active_power_w 1200
  Entonces la lectura se persiste con ingestion_status "accepted"
  Y se almacena source_timestamp y received_timestamp
  Y received_timestamp es mayor o igual a source_timestamp

Escenario: Lectura duplicada (idempotencia por event_hash)
  Dado que ya existe una lectura persistida con event_hash "H1"
  Cuando llega otra lectura con el mismo event_hash "H1"
  Entonces no se inserta una segunda fila para "H1"
  Y la lectura repetida se clasifica como ingestion_status "duplicate"
  Y los agregados de energía no se ven alterados por el duplicado

Escenario: Telemetría de un device inválido
  Cuando llega una lectura con device_id que no pertenece a ningún kit activo
  Entonces la lectura se rechaza con ingestion_status "invalid"
  Y no contamina los agregados de ninguna instalación

Escenario: Lectura fuera de rango físico
  Cuando llega una lectura con active_power_w negativo o power_factor 2.0
  Entonces la lectura se marca como "invalid"
  Y no se agrega al consumo

Escenario: Reconexión tras pérdida de IoT sin pérdida ni duplicados
  Dado que el kit estuvo desconectado y acumuló lecturas en buffer
  Cuando el kit se reconecta y reenvía el buffer
  Entonces todas las lecturas únicas se persisten como "accepted"
  Y las lecturas ya recibidas se clasifican como "duplicate"
  Y no hay filas duplicadas por event_hash
```

---

## Feature: Dashboard sin datos (empty state)
**Cubre:** FR-DASH-007, FR-DASH-003, NFR-018 (degradación elegante).

```gherkin
Antecedentes:
  Dado que estoy autenticado como "viewer" de "Org A"
  Y la instalación "Casa Nueva" no tiene telemetría ni agregados históricos

Escenario: Render del dashboard sin datos históricos
  Cuando abro el dashboard de "Casa Nueva"
  Entonces el dashboard se renderiza sin errores
  Y veo un estado vacío que indica "aún sin datos"
  Y veo una guía para cargar la boleta o esperar lecturas

Escenario: Costo sin tarifa configurada
  Dado que "Casa Nueva" no tiene tarifa ni boleta confirmada
  Cuando consulto el costo estimado del día
  Entonces no se muestra un valor en CLP inventado
  Y veo el mensaje "configura tarifa o carga tu boleta"

Escenario: Comparación con periodo anterior sin histórico
  Dado que no existe consumo del periodo anterior
  Cuando veo el dashboard
  Entonces el comparativo con el periodo anterior se omite
  Y no se muestra un porcentaje ficticio
```

---

## Feature: Control con y sin permisos
**Cubre:** FR-CTRL-001, FR-CTRL-002, FR-CTRL-008, FR-CTRL-009, FR-AUTH-009, NFR-003, NFR-013 (auditoría).

```gherkin
Antecedentes:
  Dado un Device "DEV-1" con capacidad "switch" en la instalación "Local PyME"

Escenario: Operator enciende un dispositivo
  Dado que estoy autenticado como "operator" de "Org A"
  Cuando solicito encender "DEV-1"
  Entonces se crea una ControlAction tipo "turn_on" en estado "pending"
  Y se registra la acción en audit_logs
  Cuando el dispositivo confirma la ejecución (ACK)
  Entonces la ControlAction pasa a estado "success" con resolved_at

Escenario: Timeout sin confirmación del dispositivo
  Dado que estoy autenticado como "admin"
  Y solicité apagar "DEV-1" (ControlAction "pending")
  Cuando transcurre el timeout sin ACK del dispositivo
  Entonces la ControlAction pasa a estado "failed"
  Y el resultado documenta el motivo (timeout)

Escenario: Viewer intenta controlar (sin permiso)
  Dado que estoy autenticado como "viewer" de "Org A"
  Cuando intento apagar "DEV-1"
  Entonces recibo un error 403
  Y no se envía ningún comando al dispositivo
  Y el intento queda registrado en audit_logs

Escenario: Acción de control sobre device de otro tenant
  Dado que estoy autenticado como "operator" de "Org A"
  Y "DEV-9" pertenece a "Org B"
  Cuando intento controlar "DEV-9"
  Entonces recibo 403 o 404
  Y no se ejecuta ninguna acción (sin fuga cross-tenant)
```

---

## Feature: Alerta de sobreconsumo
**Cubre:** FR-ALRT-003, FR-CTRL-005, FR-CTRL-006, FR-ALRT-005, FR-REC-001.

```gherkin
Antecedentes:
  Dado un Device "DEV-1" con un ConsumptionLimit de 50 kWh por ventana "month" y pre_alert_pct 80
  Y la instalación tiene una tarifa configurada

Escenario: Pre-alerta al alcanzar el umbral
  Cuando el consumo mensual de "DEV-1" alcanza 40 kWh (80% del límite)
  Entonces se genera una Alert tipo "over_budget" con severidad "warning"
  Y se emite una notificación al usuario
  Y no se generan pre-alertas adicionales para el mismo umbral en la ventana

Escenario: Superar el límite con acción de apagado
  Dado que el ConsumptionLimit tiene action_on_exceed "turn_off"
  Y "DEV-1" no está marcado como equipo crítico
  Cuando el consumo supera 50 kWh
  Entonces se genera una Alert "over_budget" con estimated_impact_clp
  Y se ejecuta una ControlAction "turn_off" auditada

Escenario: No apagar un equipo crítico al exceder
  Dado que "DEV-1" está marcado como equipo crítico
  Y el ConsumptionLimit tiene action_on_exceed "turn_off"
  Cuando el consumo supera el límite
  Entonces se genera la alerta de sobreconsumo
  Pero no se ejecuta el apagado automático del equipo crítico

Escenario: Revisar la alerta
  Dado una Alert "over_budget" en estado "open"
  Cuando un "operator" la marca como revisada
  Entonces la alerta pasa a estado "reviewed" con reviewed_by y reviewed_at
  Y el contador de alertas pendientes del dashboard disminuye
```

---

## Feature: Carga de boleta
**Cubre:** FR-BILL-001, FR-BILL-002, FR-BILL-003, FR-BILL-004, FR-BILL-005, FR-BILL-006, FR-BILL-007, NFR-005 (almacenamiento seguro).

```gherkin
Antecedentes:
  Dado que estoy autenticado como "operator" de "Org A"
  Y existe la instalación "Casa Principal"

Escenario: Cargar archivo y registrar datos manualmente
  Cuando subo un PDF válido de mi boleta
  Entonces se crea una ElectricityBill en estado "uploaded" con file_url
  Cuando ingreso distribuidora "Enel", nº cliente "123456", periodo 2026-05-01 a 2026-05-31, consumo 320 kWh y total 45000 CLP
  Entonces la boleta pasa a estado "parsed"
  Y los montos quedan en CLP entero

Escenario: Confirmar la boleta como base de comparación
  Dado una boleta en estado "parsed" con datos válidos
  Cuando la confirmo
  Entonces la boleta pasa a estado "confirmed"
  Y queda disponible como base para proyecciones y comparación

Escenario: Periodo inválido
  Cuando ingreso un periodo con period_end anterior a period_start
  Entonces el sistema rechaza los datos con error de validación
  Y la boleta permanece en estado "uploaded"

Escenario: Tipo de archivo no permitido
  Cuando intento subir un archivo de tipo no permitido
  Entonces la carga es rechazada
  Y no se crea ninguna ElectricityBill

Escenario: Acceso seguro al archivo de boleta
  Dado una boleta con file_url de "Org A"
  Cuando un usuario de "Org B" intenta acceder al archivo
  Entonces el acceso es denegado (sin fuga cross-tenant)
```

---

## Trazabilidad

| Feature | FR cubiertos | NFR clave | Pantalla |
|---|---|---|---|
| Onboarding completo | FR-ONB-001..006, 008; FR-PROF-001 | NFR-008, NFR-013 | Onboarding (págs. 3–7) |
| Ingesta con idempotencia | FR-DASH-001 | NFR-021, 028, 029, 030, 031 | Dashboard / backend (pág. 9) |
| Dashboard sin datos | FR-DASH-003, 007 | NFR-018 | Dashboard (pág. 9b) |
| Control con/sin permisos | FR-CTRL-001, 002, 008, 009; FR-AUTH-009 | NFR-003, 013 | Control (pág. 17) |
| Alerta de sobreconsumo | FR-ALRT-003, 005; FR-CTRL-005, 006; FR-REC-001 | NFR-013 | Alertas/Límites (págs. 19–20) |
| Carga de boleta | FR-BILL-001..007 | NFR-005 | Boleta (pág. 8) |
```
