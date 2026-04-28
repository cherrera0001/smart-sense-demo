# 📚 Documentación — Smart Sense Demo

Bienvenido a la base documental central. Los documentos están organizados por dominios para facilitar búsqueda y mantenimiento.

## 📂 Estructura

- **[00-Gobierno](./00-Gobierno/)** — Normas, definiciones, criterios de aceptación
- **[10-Producto](./10-Producto/)** — Visión, roadmap, features
- **[20-Tecnologia](./20-Tecnologia/)** — Stack, deployment, troubleshooting, arquitectura
- **[30-Operaciones](./30-Operaciones/)** — Reportes, auditorías, checklists, runbooks
- **[40-Clientes](./40-Clientes/)** — Handoff, presentaciones, defensas
- **[90-Archivo](./90-Archivo/)** — Documentos completados, versiones anteriores, obsoleto

## 🔍 Búsqueda Rápida

### Por Tipo
- 🎯 **Guías operacionales:** [20-Tecnologia/TROUBLESHOOTING.md](./20-Tecnologia/TROUBLESHOOTING.md)
- 📊 **Reportes:** [30-Operaciones/reportes/](./30-Operaciones/reportes/)
- ✅ **Criterios de aceptación:** [00-Gobierno/DEFINITION_OF_DONE.md](./00-Gobierno/DEFINITION_OF_DONE.md)
- 🚀 **Deploy:** [20-Tecnologia/deployment-guide.md](./20-Tecnologia/deployment-guide.md)

### Por Dominio
- 💻 **Tecnología & DevOps**
  - [Deployment Guide](./20-Tecnologia/deployment-guide.md)
  - [DNS & Cloudflare Config](./20-Tecnologia/dns-cloudflare.md)
  - [Troubleshooting](./20-Tecnologia/TROUBLESHOOTING.md)

- 🎨 **Producto & UX**
  - [CLAUDE.md](./10-Producto/CLAUDE.md) — Stack & instrucciones para agentes
  - [Definition of Done](./00-Gobierno/DEFINITION_OF_DONE.md)

- 📈 **Reportes & QA**
  - [Redesign Final Report](./30-Operaciones/reportes/2026-04-28_redesign-final.md)
  - [UX Standardization Report](./30-Operaciones/reportes/2026-04-28_ux-standardization.md)
  - [Audit QA Report](./30-Operaciones/reportes/2026-04-28_audit-qa.md)

## 📝 Convención de Nombres

| Patrón | Uso | Ejemplo |
|--------|-----|---------|
| `TITULO.md` | Documentos principales | `CLAUDE.md`, `DEFINITION_OF_DONE.md` |
| `YYYY-MM-DD_titulo.md` | Reportes con fecha | `2026-04-28_audit-qa.md` |
| `runbook_<sistema>.md` | Procedimientos operativos | `runbook_pnpm-node.md` |
| `minusculas-kebab.md` | Documentos técnicos | `deployment-guide.md` |

## 📋 Frontmatter Estándar

Todo documento debe incluir (YAML frontmatter):

```yaml
---
name: Nombre del documento
description: Una línea explicativa
type: project|user|feedback|reference
owner: [nombre, email]
status: active|archived|obsolete|draft
category: 00|10|20|30|40|90
tags: [tag1, tag2]
dateCreated: YYYY-MM-DD
dateModified: YYYY-MM-DD
---
```

## 🔗 Índice Completo

Ver **[_INDEX.md](./_INDEX.md)** para tabla de contenidos detallada con metadata.

## ⚡ Quick Links

- 🚀 **Cómo deployar:** [20-Tecnologia/deployment-guide.md](./20-Tecnologia/deployment-guide.md#quick-deploy)
- 🐛 **Solucionar problemas:** [20-Tecnologia/TROUBLESHOOTING.md](./20-Tecnologia/TROUBLESHOOTING.md)
- ✅ **Qué se considera "hecho":** [00-Gobierno/DEFINITION_OF_DONE.md](./00-Gobierno/DEFINITION_OF_DONE.md)
- 📊 **Últimos reportes:** [30-Operaciones/reportes/](./30-Operaciones/reportes/)

---

**Última actualización:** 2026-04-28  
**Mantenedor:** Cristóbal Herrera
