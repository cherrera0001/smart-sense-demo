# Pendientes Backend-First

Backlog operativo para ejecutar construccion backend-first de forma ordenada y verificable.

## Reglas de uso

- Prioridad: `P0` (critico), `P1` (alto), `P2` (normal).
- Estado: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`.
- No iniciar implementacion de endpoints sin contrato OpenAPI definido.
- No cerrar una fase sin evidencia (archivo, test o comando ejecutado).

## Fase 0 - Alineación de alcance

- [ ] `P0` Definir alcance v1 (que entra / que no entra) - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P0` Listar modulos backend iniciales (auth, devices, consumption, alerts, reports) - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P1` Definir criterios de exito por modulo (DoD) - Owner: ___ - Estado: TODO - Fecha: ___

## Fase 1 - Dominio y reglas de negocio

- [ ] `P0` Definir entidades y atributos obligatorios por modulo - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P0` Definir relaciones y cardinalidades (1:1, 1:N, N:M) - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P0` Definir invariantes y transiciones de estado - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P1` Crear diccionario de dominio (terminos canonicos) - Owner: ___ - Estado: TODO - Fecha: ___

## Fase 2 - Modelo de datos

- [ ] `P0` Diseñar esquema relacional v1 (tablas, PK/FK, constraints) - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P0` Definir estrategia de auditoria (`created_at`, `updated_at`, `deleted_at`) - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P1` Definir indices para consultas criticas - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P1` Preparar migraciones iniciales - Owner: ___ - Estado: TODO - Fecha: ___

## Fase 3 - Contrato API

- [ ] `P0` Publicar `openapi.yaml` v1 con endpoints criticos - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P0` Estandarizar errores (codes, mensajes, estructura) - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P1` Definir paginacion, filtros y ordenamiento - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P1` Incluir ejemplos request/response realistas - Owner: ___ - Estado: TODO - Fecha: ___

## Fase 4 - Implementación backend

- [ ] `P0` Definir estructura por capas (`domain/application/infrastructure/api`) - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P0` Implementar 2-3 casos de uso criticos end-to-end - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P1` Implementar repositorios y adapters de DB - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P1` Implementar validaciones de entrada y manejo de errores - Owner: ___ - Estado: TODO - Fecha: ___

## Fase 5 - Calidad y validación

- [ ] `P0` Tests unitarios de dominio (reglas e invariantes) - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P0` Tests de integracion (repositorio + DB) - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P0` Contract tests (API vs OpenAPI) - Owner: ___ - Estado: TODO - Fecha: ___
- [ ] `P1` Configurar pipeline CI (lint, typecheck, tests) - Owner: ___ - Estado: TODO - Fecha: ___

## Bloqueados

- [ ] _Sin bloqueos registrados_

## Hecho

- [x] Documentar workflow backend-first en `README.md` y `CLAUDE.md`.

## Seguimiento semanal

- Semana: ___
- Objetivo principal: ___
- Riesgos activos: ___
- Decisiones pendientes: ___
