---
name: Auditoría Documental Completa
description: Mapeo de caos actual → estructura propuesta con plan de migración
type: reference
---

# 🗂️ AUDITORÍA DOCUMENTAL — Smart Sense Demo

**Fecha:** 2026-04-28  
**Estado:** Listo para reorganizar  

---

## 📊 MAPA ACTUAL (24 archivos en raíz)

### Archivos Activos (Mantener/Migrar)
| Archivo | Líneas | Propósito | Destino |
|---------|--------|----------|---------|
| **CLAUDE.md** | 172 | Guía de agentes + stack | `10-Producto/CLAUDE.md` |
| **README.md** | 170 | Entrada principal | Raíz (mantener) |
| **TROUBLESHOOTING.md** | 281 | Guía de solución de problemas | `20-Tecnologia/TROUBLESHOOTING.md` |
| **CLOUDFLARE_CONFIG_FINAL.md** | 174 | Config DNS/Workers | `20-Tecnologia/dns-cloudflare.md` |
| **DNS_CLOUDFLARE_SETUP.md** | 94 | Registros DNS | Merge → `20-Tecnologia/dns-cloudflare.md` |
| **README_DEPLOYMENT.md** | 179 | Deploy checklist | `20-Tecnologia/deployment-guide.md` |

### Reportes Activos (Consolidar)
| Archivo | Líneas | Solapamiento | Acción |
|---------|--------|--------------|--------|
| **AUDIT_FINAL_REPORT.md** | 261 | Duplica AUDIT_REPORT_2026-04-28.md | Comparar → mantener más reciente |
| **AUDIT_REPORT_2026-04-28.md** | 216 | Mismo contenido | Eliminar duplicado |
| **HOME_ENERGY_REDESIGN_FINAL_REPORT.md** | 429 | Reporta fase de diseño | `30-Operaciones/reportes/redesign-final.md` |
| **REDESIGN_REPORT_FINAL.md** | 342 | Solapado | Merge con HOME_ENERGY_* |
| **UNIFORMITY_STANDARDIZATION_REPORT.md** | 277 | QA + componentes UI | `30-Operaciones/reportes/ux-standardization.md` |

### Definiciones (Consolidar 3 → 1)
| Archivo | Versión | Estado | Acción |
|---------|---------|--------|--------|
| **DEFINITION_OF_DONE_FINAL.md** | Final | ✅ | Mantener como fuente |
| **DEFINITION_OF_DONE_UX.md** | v1 | 🔄 | Archivar |
| **DEFINITION_OF_DONE_UX_v2.md** | v2 | 🔄 | Archivar |

### Fases (Completadas → Archivar)
| Archivo | Fecha | Motivo | Acción |
|---------|-------|--------|--------|
| **FASE4_VALIDACION_POST_DEPLOY.md** | Apr 28 | Fase completada | `90-Archivo/fases/fase-4-validacion.md` |
| **FASE5_ENTREGA_FINAL.md** | Apr 28 | Fase completada | `90-Archivo/fases/fase-5-entrega.md` |
| **CIERRE_TECNICO_FINAL.md** | Apr 28 | Cierre completado | `90-Archivo/fases/cierre-tecnico.md` |

### Checklist/Validación (Consolidar 2 → 1)
| Archivo | Propósito | Acción |
|---------|-----------|--------|
| **UX_VALIDATION_CHECKLIST.md** | Validación UX | Consolidar → `DEFINITION_OF_DONE_FINAL.md` (como apéndice) |
| **VALIDACION_FINAL_CHECKLIST.md** | Validación final | Consolidar → `DEFINITION_OF_DONE_FINAL.md` |

### Entrega (Mantener/Archivar)
| Archivo | Propósito | Acción |
|---------|-----------|--------|
| **HANDOFF.md** | Entrega técnica | `90-Archivo/handoff.md` |
| **GUION_DEFENSA.md** | Presentación 20min | `90-Archivo/guion-defensa.md` |

### Menor Importancia (Revisar)
| Archivo | Líneas | Acción |
|---------|--------|--------|
| **VERIFICATION.md** | 93 | Merge → `TROUBLESHOOTING.md` |
| **PENDIENTE_CONFIGURACION.txt** | 28 | Revisar si sigue vigente → archivar |
| **STATUS_FINAL.txt** | 116 | Merge → README.md "Status" section |

---

## 🎯 ESTRUCTURA PROPUESTA

```
smart-sense-demo/
├── README.md                          # Entrada principal (actualizar)
├── CLAUDE.md                          # Guía de agentes (mantener)
│
├── docs/                              # Nueva estructura documental
│   ├── README.md                      # Índice general
│   │
│   ├── 00-Gobierno/
│   │   ├── README.md
│   │   ├── DEFINITION_OF_DONE.md      # (consolidado: v1, v2, Final)
│   │   ├── normas.md                  # Estándares de código/UI
│   │   └── glosario.md                # Términos del proyecto
│   │
│   ├── 10-Producto/
│   │   ├── README.md
│   │   ├── CLAUDE.md                  # Instrucciones para agentes (copia)
│   │   ├── overview.md                # Resumen de features
│   │   └── roadmap.md                 # Próximos pasos
│   │
│   ├── 20-Tecnologia/
│   │   ├── README.md
│   │   ├── TROUBLESHOOTING.md         # Problemas comunes + VERIFICATION
│   │   ├── deployment-guide.md        # (consolidado: README_DEPLOYMENT + README_CLOUDFLARE)
│   │   ├── dns-cloudflare.md          # (consolidado: CLOUDFLARE + DNS_SETUP)
│   │   ├── stack.md                   # Dependencias, versiones
│   │   └── arch/
│   │       ├── next-js-structure.md
│   │       └── component-patterns.md
│   │
│   ├── 30-Operaciones/
│   │   ├── README.md
│   │   ├── reportes/
│   │   │   ├── 2026-04-28_redesign-final.md      # (consolidado: HOME_ENERGY + REDESIGN)
│   │   │   ├── 2026-04-28_ux-standardization.md  # UNIFORMITY_STANDARDIZATION
│   │   │   └── 2026-04-28_audit-qa.md            # (consolidado: AUDIT_FINAL + AUDIT_REPORT)
│   │   ├── checklists/
│   │   │   └── validation-qa.md                   # (consolidado: UX_VALIDATION + VALIDACION_FINAL)
│   │   └── runbooks/
│   │       └── pnpm-node-issues.md                # Troubleshooting por plataforma
│   │
│   ├── 40-Clientes/
│   │   ├── README.md
│   │   ├── defensa-smartsense.md                 # (GUION_DEFENSA como referencia)
│   │   └── handoff.md                            # (HANDOFF.md)
│   │
│   ├── 90-Archivo/
│   │   ├── README.md
│   │   ├── fases-completadas/
│   │   │   ├── fase-4-validacion.md
│   │   │   ├── fase-5-entrega.md
│   │   │   └── cierre-tecnico.md
│   │   ├── versiones-anteriores/
│   │   │   ├── definition-of-done-v1.md
│   │   │   └── definition-of-done-v2.md
│   │   └── obsoleto/
│   │       └── pendiente-configuracion-OLD.txt
│   │
│   └── _INDEX.md                     # Índice maestro (TOC) con metadata
```

---

## 📋 CONVENCIÓN DE NOMBRES

| Patrón | Uso | Ejemplo |
|--------|-----|---------|
| `TITULO.md` | Documentos principales (status, guías) | `CLAUDE.md`, `README.md` |
| `YYYY-MM-DD_titulo.md` | Reportes con fecha | `2026-04-28_audit-qa.md` |
| `runbook_<sistema>.md` | Procedimientos operativos | `runbook_node-pnpm.md` |
| `ADR-XXX_titulo.md` | Decisiones arquitectónicas | (no aplica aún) |
| Minúsculas-kebab | Documentos técnicos anidados | `dns-cloudflare.md`, `component-patterns.md` |

---

## 🔄 PLAN DE MIGRACIÓN (7 pasos)

### 1️⃣ **Crear estructura de carpetas** (sin borrar nada aún)
```bash
mkdir -p docs/{00-Gobierno,10-Producto,20-Tecnologia,30-Operaciones,40-Clientes,90-Archivo}
mkdir -p docs/20-Tecnologia/arch
mkdir -p docs/30-Operaciones/{reportes,checklists,runbooks}
mkdir -p docs/90-Archivo/{fases-completadas,versiones-anteriores,obsoleto}
```

### 2️⃣ **Consolidar duplicados** (en memoria antes de mover)
- [ ] AUDIT_FINAL_REPORT.md vs AUDIT_REPORT_2026-04-28.md → mantener más reciente
- [ ] DEFINITION_OF_DONE_* (3 versiones) → una única fuente
- [ ] REDESIGN_REPORT_FINAL.md vs HOME_ENERGY_REDESIGN_FINAL_REPORT.md → merger
- [ ] UX_VALIDATION_CHECKLIST.md vs VALIDACION_FINAL_CHECKLIST.md → consolidar

### 3️⃣ **Mover archivos de configuración/tech**
```bash
mv TROUBLESHOOTING.md docs/20-Tecnologia/
mv CLOUDFLARE_CONFIG_FINAL.md docs/20-Tecnologia/dns-cloudflare.md
mv DNS_CLOUDFLARE_SETUP.md docs/20-Tecnologia/dns-cloudflare.md (merge)
mv README_DEPLOYMENT.md docs/20-Tecnologia/deployment-guide.md
mv VERIFICATION.md docs/20-Tecnologia/ (merge con TROUBLESHOOTING)
```

### 4️⃣ **Mover reportes → 30-Operaciones**
```bash
mv HOME_ENERGY_REDESIGN_FINAL_REPORT.md docs/30-Operaciones/reportes/2026-04-28_redesign-final.md
mv REDESIGN_REPORT_FINAL.md (consolidar con anterior)
mv UNIFORMITY_STANDARDIZATION_REPORT.md docs/30-Operaciones/reportes/2026-04-28_ux-standardization.md
mv AUDIT_FINAL_REPORT.md docs/30-Operaciones/reportes/2026-04-28_audit-qa.md
```

### 5️⃣ **Mover fases completadas → 90-Archivo**
```bash
mv FASE4_VALIDACION_POST_DEPLOY.md docs/90-Archivo/fases-completadas/
mv FASE5_ENTREGA_FINAL.md docs/90-Archivo/fases-completadas/
mv CIERRE_TECNICO_FINAL.md docs/90-Archivo/fases-completadas/
mv DEFINITION_OF_DONE_UX.md docs/90-Archivo/versiones-anteriores/
mv DEFINITION_OF_DONE_UX_v2.md docs/90-Archivo/versiones-anteriores/
```

### 6️⃣ **Mover entrega/defensa → 40-Clientes**
```bash
mv HANDOFF.md docs/40-Clientes/
mv GUION_DEFENSA.md docs/40-Clientes/defensa-smartsense.md
```

### 7️⃣ **Crear índices + actualizar raíz**
- [ ] Crear `docs/README.md` (índice general)
- [ ] Crear `docs/_INDEX.md` (TOC con metadata)
- [ ] Crear `docs/XX-*/README.md` para cada carpeta
- [ ] Copiar `CLAUDE.md` → `docs/10-Producto/CLAUDE.md`
- [ ] Actualizar raíz `README.md` (enlace a docs)
- [ ] Revisar `.gitignore` (incluir `docs/90-Archivo` si es necesario)

---

## ⚠️ RIESGOS & VALIDACIÓN

### Riesgos Identificados
1. **Links rotos** en `.md` internos (usar referencias relativas)
2. **URLs en CLAUDE.md** que apunten a raíz (actualizar post-migración)
3. **Commits históricos** referencian rutas viejas (OK, git sigue archivos by inode)
4. **CI/CD** no buscará docs en nueva estructura (revisar `.vercel/config.json`)

### Validación Post-Migración
```bash
# 1. Validar que todos los .md tienen título principal
grep -r "^# " docs/ | wc -l

# 2. Buscar links rotos (referencias a raíz desde docs/)
grep -r "\[.*\](.*\.md)" docs/ | grep -v "docs/"

# 3. Verificar que no quedó nada importante en raíz
ls -1 *.md *.txt 2>/dev/null

# 4. Testear build/deployment local
pnpm build
```

---

## 📁 ARCHIVOS AFECTADOS

### A Migrar (19)
```
TROUBLESHOOTING.md → docs/20-Tecnologia/
CLOUDFLARE_CONFIG_FINAL.md → docs/20-Tecnologia/dns-cloudflare.md
DNS_CLOUDFLARE_SETUP.md → docs/20-Tecnologia/dns-cloudflare.md (merge)
README_DEPLOYMENT.md → docs/20-Tecnologia/deployment-guide.md
VERIFICATION.md → docs/20-Tecnologia/ (merge con TROUBLESHOOTING)
HOME_ENERGY_REDESIGN_FINAL_REPORT.md → docs/30-Operaciones/reportes/
REDESIGN_REPORT_FINAL.md → merge con anterior
UNIFORMITY_STANDARDIZATION_REPORT.md → docs/30-Operaciones/reportes/
AUDIT_FINAL_REPORT.md → docs/30-Operaciones/reportes/
UX_VALIDATION_CHECKLIST.md → docs/30-Operaciones/checklists/
VALIDACION_FINAL_CHECKLIST.md → merge con anterior
DEFINITION_OF_DONE_UX.md → docs/90-Archivo/versiones-anteriores/
DEFINITION_OF_DONE_UX_v2.md → docs/90-Archivo/versiones-anteriores/
FASE4_VALIDACION_POST_DEPLOY.md → docs/90-Archivo/fases-completadas/
FASE5_ENTREGA_FINAL.md → docs/90-Archivo/fases-completadas/
CIERRE_TECNICO_FINAL.md → docs/90-Archivo/fases-completadas/
HANDOFF.md → docs/40-Clientes/
GUION_DEFENSA.md → docs/40-Clientes/
PENDIENTE_CONFIGURACION.txt → docs/90-Archivo/obsoleto/
```

### A Mantener en Raíz (2)
```
README.md (actualizar con enlace a docs/)
CLAUDE.md (mantener + copiar a docs/10-Producto/)
```

### A Eliminar Después de Validación (3)
```
AUDIT_REPORT_2026-04-28.md (duplicado)
STATUS_FINAL.txt (merge en README.md)
(validar que PENDIENTE_CONFIGURACION.txt sea realmente obsoleto)
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Crear estructura `/docs` (paso 1)
- [ ] Revisar y consolidar duplicados (paso 2)
- [ ] Mover archivos tech → `20-Tecnologia` (paso 3)
- [ ] Mover reportes → `30-Operaciones` (paso 4)
- [ ] Mover fases → `90-Archivo` (paso 5)
- [ ] Mover entrega → `40-Clientes` (paso 6)
- [ ] Crear índices + README.md por carpeta (paso 7)
- [ ] Actualizar raíz README.md
- [ ] Validar links no rotos
- [ ] Hacer commit: `docs: reorganize documentation structure`
- [ ] Verificar deployment (Vercel no rompa)

---

**Estado:** Listo para ejecutar (requiere confirmación del usuario)  
**Impacto:** 0 cambios funcionales, solo reorganización documental  
**Reversibilidad:** Alta (git revert siempre disponible)
