# Document Curator Skill

Este skill automatiza clasificación, validación y mantenimiento de documentación.

## Uso

```bash
/document-curator [--auto] [--file=<path>] [--report]
```

### Modos

**Interactivo (default):**
```bash
/document-curator
```
Retorna reporte de:
- Documentos mal ubicados
- Frontmatter incompleto
- Links rotos
- Duplicados sugeridos

**Automático (post-creación):**
```bash
/document-curator --auto --file=nuevo-documento.md
```
Automáticamente:
- Sugiere categoría
- Crea frontmatter
- Mueve a carpeta correcta
- Actualiza índice

**Reporte Completo:**
```bash
/document-curator --report
```
Genera snapshot de auditoría en `docs/_AUDIT_SNAPSHOT.md`

## Integración con Hooks

Configurado en `.claude/settings.json`:
```json
{
  "hooks": {
    "on-file-created": {
      "patterns": ["*.md", "*.txt"],
      "command": "/document-curator --auto --file={filePath}"
    }
  }
}
```

## Validaciones Automáticas

- ✅ Frontmatter completo (name, description, type)
- ✅ Nombre sigue convención (TITULO.md o YYYY-MM-DD_titulo.md)
- ✅ Links internos válidos
- ✅ Sin duplicados (>80% similarity)
- ✅ Categoría correcta según contenido

## Salida

```json
{
  "file": "nuevo-documento.md",
  "status": "success",
  "suggestedPath": "docs/20-Tecnologia/nuevo-documento.md",
  "category": "20-Tecnologia",
  "confidence": 0.92,
  "actions": {
    "moved": true,
    "frontmatter_added": true,
    "index_updated": true
  },
  "issues": [
    {
      "type": "broken_link",
      "path": "./TROUBLESHOOTING.md",
      "suggestion": "Should be docs/20-Tecnologia/TROUBLESHOOTING.md"
    }
  ]
}
```
