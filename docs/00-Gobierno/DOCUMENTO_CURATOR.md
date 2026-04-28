---
name: Document Curator - Guía de Automatización
description: Cómo la documentación se clasifica, valida y mantiene automáticamente
type: reference
---

# 🤖 Document Curator — Automatización Documental

**Versión:** 1.0  
**Fecha:** 2026-04-28  
**Estado:** Active

---

## Resumen

El **Document Curator** automatiza:
1. **Clasificación** de nuevos documentos → categoría correcta
2. **Validación** de estructura → frontmatter, links, naming
3. **Mantenimiento** → índices actualizados, duplicados detectados

---

## 🎯 Flujo Automático

```
┌─────────────────────────────────┐
│  Nuevo archivo .md creado        │
│  (cualquier ubicación)           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Hook: on-file-created           │
│ (from settings.json)            │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ /document-curator --auto        │
│ • Analiza contenido             │
│ • Sugiere categoría             │
│ • Genera frontmatter            │
│ • Mueve a carpeta               │
│ • Actualiza _INDEX.md           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ ✅ Documento listo para usar    │
│ • Ubicado correctamente         │
│ • Metadata completa             │
│ • Enlazado en índice            │
└─────────────────────────────────┘
```

---

## 🛠️ Herramientas Disponibles

### 1. **Skill: `/document-curator`**

#### Modo Interactivo (Default)
```bash
/document-curator
```

Retorna reporte interactivo:
- Top 5 documentos mal ubicados
- Top 5 con frontmatter incompleto
- Links rotos detectados
- Duplicados sugeridos para mergear

**Uso:** Ejecutar semanalmente para mantenimiento.

#### Modo Automático
```bash
/document-curator --auto --file=docs/nuevo.md
```

Automáticamente:
- ✅ Sugiere categoría (con confidence)
- ✅ Crea frontmatter YAML
- ✅ Mueve a carpeta correcta
- ✅ Actualiza `docs/_INDEX.md`
- ✅ Valida links internos

**Uso:** Invocado automáticamente por hooks en settings.json

#### Modo Reporte
```bash
/document-curator --report
```

Genera `docs/_AUDIT_SNAPSHOT_YYYY-MM-DD.md` con:
- Estructura actual (tree)
- Duplicados detectados (>80% similarity)
- Archivos sin owner asignado
- Links rotos mapeados
- Metadata missing por categoría

**Uso:** Antes de merge a master para validación final.

---

### 2. **Script: `validate-docs.js`**

Valida toda la documentación de forma exhaustiva.

```bash
node scripts/validate-docs.js
```

Chequeos:
- ✅ Todos los .md tienen frontmatter YAML
- ✅ Campos obligatorios: name, description, type
- ✅ Nombres siguen convención (TITULO.md o YYYY-MM-DD_titulo.md)
- ✅ Links internos válidos
- ✅ Archivos sin title (#) heading

**Modo Strict:**
```bash
node scripts/validate-docs.js --strict
```
Warnings cuentan como errores (exit code 1).

**Modo Fix:**
```bash
node scripts/validate-docs.js --fix
```
Automáticamente agrega frontmatter faltante.

---

### 3. **Script: `mcp-file-indexer.js`**

Herramienta de bajo nivel para análisis documental.

```bash
# Index todo
node scripts/mcp-file-indexer.js index

# Sugerir categoría
node scripts/mcp-file-indexer.js suggest-category docs/nuevo.md

# Validar links en archivo
node scripts/mcp-file-indexer.js validate-links docs/20-Tecnologia/deployment.md

# Encontrar duplicados
node scripts/mcp-file-indexer.js find-duplicates

# Análisis completo
node scripts/mcp-file-indexer.js analyze docs/nuevo.md
```

---

## 🔧 Configuración (settings.json)

En `.claude/settings.json`:

```json
{
  "hooks": {
    "on-file-created": {
      "patterns": ["docs/**/*.md", "*.md"],
      "exclude": ["node_modules/**", ".next/**"],
      "command": "/document-curator --auto --file={filePath}",
      "runInBackground": true,
      "notify": true
    },
    "on-file-modified": {
      "patterns": ["docs/**/*.md"],
      "command": "node scripts/mcp-file-indexer.js validate-links {filePath}",
      "runInBackground": true,
      "notify": false
    }
  }
}
```

### ¿Cómo funciona?

1. **on-file-created:** Cuando creas nuevo .md (en docs/ o raíz)
   - Hook ejecuta automáticamente `/document-curator --auto`
   - Archivo se mueve + metadata se agrega
   - Notificación al usuario

2. **on-file-modified:** Cuando modificas .md en docs/
   - Hook valida links
   - Silencioso (sin notificación)
   - Warnings en segundo plano

---

## 📋 Frontmatter Estándar

Todos los documentos en `docs/` deben tener:

```yaml
---
name: Nombre del documento (requerido)
description: Una línea explicativa (requerido)
type: project|user|feedback|reference (requerido)
owner: [nombre, email] (recomendado para 00/10)
status: active|archived|obsolete|draft (opcional)
category: 00|10|20|30|40|90 (auto-detectado)
tags: [tag1, tag2] (opcional)
dateCreated: YYYY-MM-DD (auto-generado)
dateModified: YYYY-MM-DD (auto-generado)
---

# Título del Documento

Contenido aquí...
```

---

## 🚀 Flujo de Trabajo Recomendado

### Crear Nuevo Documento

```bash
# 1. Crear archivo (en cualquier lado)
echo "# Mi Nuevo Documento" > mi-nuevo-doc.md

# 2. Hook ejecuta automáticamente
# → Archivo movido a docs/30-Operaciones/
# → Frontmatter agregado
# → Notificación: "✅ docs/30-Operaciones/mi-nuevo-doc.md"

# 3. Editar y comitear
git add docs/
git commit -m "docs: add new documentation"
```

### Validar Antes de Merge

```bash
# Validar strict (warnings = errores)
node scripts/validate-docs.js --strict

# Si hay issues, usar --fix
node scripts/validate-docs.js --fix

# Reporte completo
/document-curator --report
```

### Mantenimiento Semanal

```bash
# Check interactivo
/document-curator

# Actuar sobre sugerencias del reporte
# (mover, consolidar, archivar según corresponda)

# Commit
git add docs/
git commit -m "docs: maintenance (consolidate duplicates, fix links)"
```

---

## 🎯 Categorización Automática

El curator sugiere categoría basándose en:

| Patrón | Categoría |
|--------|-----------|
| `DEFINITION_OF_DONE`, `norma`, `glosario` | 00-Gobierno |
| `CLAUDE`, `product`, `overview`, `roadmap` | 10-Producto |
| `deploy`, `config`, `tech`, `troubleshoot` | 20-Tecnologia |
| `report`, `audit`, `checklist`, `qa` | 30-Operaciones |
| `handoff`, `presentation`, `defense` | 40-Clientes |
| `fase`, `archive`, `obsolete` | 90-Archivo |

Confidence > 0.7 = auto-move. < 0.7 = usuario elige.

---

## ⚠️ Limitaciones

- **No valida contenido:** solo estructura (frontmatter, links, naming)
- **Duplicados:** detecta >80% similarity en títulos (no content hash)
- **Categorización:** basada en heurísticas (nombre + keywords)
- **Links:** solo valida rutas relativas válidas (no href content)

---

## 📚 Referencia Rápida

| Tarea | Comando |
|-------|---------|
| Validar todo | `node scripts/validate-docs.js` |
| Validar strict | `node scripts/validate-docs.js --strict` |
| Auto-fix | `node scripts/validate-docs.js --fix` |
| Reporte interactivo | `/document-curator` |
| Reporte completo | `/document-curator --report` |
| Index actual | `node scripts/mcp-file-indexer.js index` |
| Encontrar duplicados | `node scripts/mcp-file-indexer.js find-duplicates` |

---

## 🔗 Ver También

- [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) — Criterios de aceptación
- [docs/README.md](../README.md) — Navegación documental
- [ORQUESTACION_MCP_SKILLS.md](../../ORQUESTACION_MCP_SKILLS.md) — Arquitectura detallada

---

**Última actualización:** 2026-04-28  
**Maintainer:** Cristóbal Herrera  
**Status:** Active — production ready
