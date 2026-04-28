---
name: Orquestación Documental con MCP + Skills
description: Plan para automatizar reorganización y mantenimiento documental a largo plazo
type: project
---

# 🤖 ORQUESTACIÓN DOCUMENTAL — MCP + Skills

**Propósito:** Evitar que la documentación vuelva a desordenarse. Automatizar clasificación, validación y mantenimiento.

**Fecha Propuesta:** 2026-04-28 (post-reorganización)

---

## 📊 PROBLEM STATEMENT

### Síntomas Actuales
- 24 archivos .md en raíz (chaos)
- 3+ versiones del mismo documento
- Reportes duplicados con timestamps
- Fases completadas nunca archivadas
- Ningún proceso de validación

### Root Causes
1. **Sin estructura** → cada uno pone docs donde quiere
2. **Sin naming convention** → imposible saber si es un duplicado
3. **Sin automatización** → archivado manual (nunca ocurre)
4. **Sin validación** → links rotos, refs outdated, metadata missing

---

## 🎯 SOLUCIÓN: MCP + SKILLS + HOOKS

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────┐
│                  DOCUMENTO NUEVO                         │
│   (usuario crea .md en cualquier lugar)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Hook: on-create-doc (settings.json)              │
│  Trigger: Cuando se crea/modifica cualquier .md         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Skill: document-curator (automatizado)                 │
│  ├─ Analizar nombre + contenido                         │
│  ├─ Sugerir categoría (00/10/20/30/40/90)               │
│  ├─ Validar frontmatter                                 │
│  ├─ Detectar duplicados                                 │
│  ├─ Actualizar _INDEX.md                                │
│  └─ Mover a carpeta correcta (opcional)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Resultado: Documento clasificado + índice actualizado   │
│  ✅ Ubicación correcta                                  │
│  ✅ Metadata consistente                                │
│  ✅ Links válidos                                       │
│  ✅ Índice al día                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 COMPONENTES

### 1️⃣ MCP Server: Local File Indexer

**Propósito:** Analizar documentación local en tiempo real.

```json
{
  "mcpServers": {
    "file-indexer": {
      "command": "node scripts/mcp-file-indexer.js",
      "env": {
        "DOCS_ROOT": "./docs",
        "NAMING_RULES": "./docs/_naming-convention.json"
      }
    }
  }
}
```

**Capacidades:**
- `index-docs()` → retorna estructura actual + duplicados
- `validate-frontmatter()` → chequea fields obligatorios
- `find-broken-links()` → busca referencias rotas
- `suggest-category()` → ML-light (regex + keywords) sugiere ubicación

**Entrega:**
```json
{
  "file": "UNIFORMITY_STANDARDIZATION_REPORT.md",
  "suggestedPath": "docs/30-Operaciones/reportes/2026-04-28_ux-standardization.md",
  "category": "30-Operaciones",
  "confidence": 0.92,
  "issues": [
    "Missing owner field in frontmatter",
    "Link to DEFINITION_OF_DONE_UX_v2.md is broken (should be DEFINITION_OF_DONE.md)"
  ],
  "duplicates": [
    "REDESIGN_REPORT_FINAL.md (70% match)"
  ]
}
```

### 2️⃣ Skill: `document-curator`

**Cuando invocar:**
```bash
/document-curator [--auto] [--file=<path>] [--report]
```

**Comportamientos:**

#### A. Interactivo (Default)
```bash
/document-curator
# Retorna:
# 1. Resumen de docs mal ubicadas (top 5)
# 2. Frontmatter incompleto (top 5)
# 3. Links rotos detectados
# 4. Duplicados sugeridos para mergear
# Usuario decide: mover, consolidar, ignorar
```

#### B. Automático (Post-creación)
```bash
/document-curator --auto --file=NUEVO_REPORTE.md
# Automáticamente:
# ✅ Sugiere categoría
# ✅ Crea frontmatter si falta
# ✅ Mueve a carpeta correcta
# ✅ Actualiza _INDEX.md
# ✅ Retorna resumen de acciones
```

#### C. Reporte Completo
```bash
/document-curator --report
# Genera: docs/_AUDIT_DOCUMENTAL_SNAPSHOT.md
# Incluye:
# - Estructura actual (tree)
# - Duplicados detectados
# - Archivos sin owner
# - Links rotos
# - Metadata missing
# - Recomendaciones
```

### 3️⃣ Hook: `on-create-doc`

**Configuración en `.claude/settings.json`:**
```json
{
  "hooks": {
    "on-file-created": {
      "patterns": ["*.md", "*.txt"],
      "exclude": ["node_modules/**", ".next/**"],
      "command": "/document-curator --auto --file={filePath}",
      "runInBackground": true,
      "notify": true
    }
  }
}
```

**Flujo:**
1. Usuario crea `NUEVO_ARCHIVO.md`
2. Hook detecta cambio
3. Skill `document-curator --auto` ejecuta automáticamente
4. Archivo se mueve + frontmatter se añade + índice se actualiza
5. Notificación: "✅ docs/30-Operaciones/NUEVO_ARCHIVO.md — fronmatter added, links validated"

### 4️⃣ Validación Continua (Skill: `docs-validator`)

**Cuando invocar:** Antes de cada PR, o scheduled diario.

```bash
/docs-validator --strict
```

**Chequeos:**
```
✅ Todos los .md tienen frontmatter completo
✅ Nombres siguen convención
✅ No hay duplicados (cosine similarity > 0.8)
✅ Todos los links internos válidos
✅ TOC (_INDEX.md) está actualizado
✅ No hay archivos huérfanos (sin categoría)
✅ Owners están asignados (para 00/10)
```

**Exit codes:**
- `0` = todo OK
- `1` = warnings (links pueden estar rotos)
- `2` = errors (duplicados, estructura rota)

---

## 📋 FRONTMATTER STANDARDIZADO

```yaml
---
name: Nombre del documento
description: Una línea explicativa (usada en índices)
type: project|user|feedback|reference
owner: [nombre, email]
status: active|archived|obsolete|draft
category: 00|10|20|30|40|90
tags: [UX, deployment, incident]
relatedDocs:
  - docs/20-Tecnologia/deployment-guide.md
  - docs/30-Operaciones/reportes/2026-04-28_audit-qa.md
dateCreated: 2026-04-28
dateModified: 2026-04-28
version: 1.0
---

# Título del Documento

Contenido aquí...
```

**Validación automática:**
- `name` (required, max 100 chars)
- `description` (required, max 150 chars)
- `type` (required, enum: project|user|feedback|reference)
- `owner` (recommended para 00/10)
- `status` (optional, enum: active|archived|obsolete|draft)
- `category` (optional, pero sugerida si es .md de docs/)

---

## 🚀 SKILL: `document-curator` — Pseudocódigo

```python
def document_curator(mode="interactive", file_path=None, auto=False):
    """
    Skill principal: clasificar, validar, consolidar documentación.
    """
    
    # 1. Index current state
    docs_index = mcp_call("file-indexer", "index-docs")
    
    if mode == "auto" and file_path:
        # 2a. Analizar archivo nuevo
        analysis = mcp_call("file-indexer", "analyze-file", file_path)
        
        # 3a. Sugerir categoría
        suggestion = mcp_call("file-indexer", "suggest-category", file_path)
        
        # 4a. Crear/actualizar frontmatter
        frontmatter = {
            "name": extract_title(file_path),
            "description": extract_summary(file_path),
            "type": "project",  # default
            "category": suggestion["category"],
            "dateCreated": today(),
            "dateModified": today(),
        }
        
        # 5a. Buscar duplicados
        duplicates = mcp_call("file-indexer", "find-similar", file_path)
        
        if duplicates:
            print(f"⚠️  Possible duplicates found:")
            for dup in duplicates:
                print(f"  - {dup['path']} ({dup['similarity']:.0%} match)")
        else:
            # 6a. Mover archivo
            move_file(file_path, f"docs/{suggestion['category']}/{new_name}")
            
            # 7a. Actualizar índice
            update_index()
            
            # 8a. Validar links
            broken = mcp_call("file-indexer", "check-links", new_path)
            
            return {
                "status": "success",
                "newPath": new_path,
                "frontmatter": frontmatter,
                "issues": broken,
            }
    
    elif mode == "interactive":
        # 2b. Mostrar reporte
        issues = {
            "misclassified": find_misclassified(),
            "incomplete_frontmatter": find_incomplete(),
            "broken_links": find_broken_links(),
            "duplicates": find_duplicates(),
        }
        
        user_actions = ask_user(issues)  # Click-based UI
        
        for action in user_actions:
            execute_action(action)  # Move, merge, delete, etc.
        
        return summary
    
    elif mode == "report":
        # 2c. Generar snapshot
        return generate_audit_snapshot(docs_index)
```

---

## 📅 CALENDARIO DE IMPLEMENTACIÓN

### Fase 1: Setup (Hoy — 1h)
- [ ] Crear estructura `/docs`
- [ ] Migrar archivos manualmente (validado por usuario)
- [ ] Crear frontmatter template
- [ ] Commit: "docs: reorganize structure"

### Fase 2: Automatización (Mañana — 2h)
- [ ] Escribir `scripts/mcp-file-indexer.js`
- [ ] Crear Skill `document-curator`
- [ ] Configurar hook en `.claude/settings.json`
- [ ] Test: crear nuevo archivo, validar movimiento automático
- [ ] Commit: "automation: add document curator"

### Fase 3: Validación (Semana próxima — 30min)
- [ ] Crear Skill `docs-validator`
- [ ] Integrar en pre-commit hook (opcional)
- [ ] Documentar en `docs/00-Gobierno/normas.md`
- [ ] Commit: "validation: add docs validator"

### Fase 4: Monitoreo (Ongoing)
- [ ] `/schedule` job para `docs-validator --report` cada lunes
- [ ] Revisar duplicados detectados

---

## ✅ BENEFICIOS

| Aspecto | Antes | Después |
|--------|-------|---------|
| **Búsqueda** | 24 archivos en raíz | Índice estructurado + búsqueda por categoría |
| **Duplicados** | Manual, nunca detectados | Automático, 90% de confidence |
| **Consistency** | Ad-hoc | Frontmatter + validación enforced |
| **Onboarding** | "Dónde están los docs?" | `docs/README.md` + `docs/_INDEX.md` |
| **Links rotos** | Descubiertos en lectura | Pre-commit validation |
| **Mantenimiento** | 0 proceso | Automático + reportes semanales |

---

## 🔗 REFERENCIAS

- **MCP spec:** [anthropic.com/mcp](https://docs.anthropic.com/mcp)
- **Skills:** `/help` → "Skills & Automation"
- **Hooks:** `update-config` skill → "Configure hooks"
- **Testing automation:** `/loop` → "Recurring tasks"

---

**Estado:** Propuesta lista  
**Viabilidad:** Alta (todos los componentes existen)  
**Next step:** ¿Quieres ejecutar Fase 1 hoy + Fase 2 mañana?
