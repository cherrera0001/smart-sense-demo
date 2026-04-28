# 🔗 Configuración Final — smartsense.c4a.cl

**Fecha:** 2026-04-28  
**Status:** ⚠️ PARCIALMENTE COMPLETO (falta DNS + desactivar protection)

---

## 📋 ESTADO ACTUAL

| Componente | Status | Notas |
|-----------|--------|-------|
| **Deployment** | ✅ Activo | Vercel: smart-sense-demo |
| **Dominio** | ✅ Registrado | smartsense.c4a.cl en Vercel |
| **DNS Propagado** | ❌ NO | Falta crear registro en Cloudflare |
| **Protection** | ⚠️ Activo | Bloqueando acceso público (401) |
| **Rutas** | ✅ Compiladas | 5/5 rutas en producción |

---

## 🔐 BLOQUEO 1: Deployment Protection

**Problema:** Las rutas responden **401 Unauthorized**

**Causa:** Vercel Deployment Protection está habilitado por defecto

**Solución:** Desactivar en Vercel Dashboard (30 segundos)

### Pasos:

1. Ve a: https://vercel.com/dashboard
2. Selecciona proyecto: **smart-sense-demo**
3. Navega a: **Settings > Deployment Protection**
4. En la sección **Production**:
   - Busca: "Vercel Authentication"
   - **Desactiva** el toggle
5. Guarda cambios

**Resultado esperado:** Rutas pasarán de 401 → 200 OK

---

## 🌍 BLOQUEO 2: DNS No Configurado

**Problema:** `smartsense.c4a.cl` no apunta a Vercel

**Causa:** Falta crear el registro DNS en Cloudflare

**Solución:** Crear registro A (1 minuto)

### Registro a Crear:

```
Type:     A
Name:     smartsense
Value:    76.76.21.21
TTL:      Auto (3600)
Proxy:    DNS only (☁️ gray cloud — IMPORTANTE)
```

### Pasos en Cloudflare:

1. Ve a: https://dash.cloudflare.com
2. Selecciona dominio: **c4a.cl**
3. Navega a: **DNS > Records**
4. Haz click: **+ Add record**
5. Completa:
   - **Type:** A
   - **Name:** smartsense
   - **Content:** 76.76.21.21
   - **TTL:** Auto
   - **Proxy:** DNS only ☁️ (GRIS, no naranja)
6. Haz click: **Save**

**⚠️ IMPORTANTE:** 
- El Proxy DEBE ser **"DNS only"** (nube gris)
- NO usar "Proxied" (nube naranja)
- Vercel necesita ver directamente el registro

### Propagación:

- **Típico:** 5-10 minutos
- **Máximo:** 30 minutos
- **Verificar:** `nslookup smartsense.c4a.cl`

---

## ✅ DESPUÉS DE AMBAS ACCIONES

Una vez completadas ambas cosas:

1. Desactivar Protection en Vercel ✅
2. Crear DNS A record en Cloudflare ✅
3. Esperar propagación (5-30 min) ✅

Entonces esto funcionará:

```
✅ https://smartsense.c4a.cl/dashboard   → HTTP 200
✅ https://smartsense.c4a.cl/desglose    → HTTP 200
✅ https://smartsense.c4a.cl/alertas     → HTTP 200
✅ https://smartsense.c4a.cl/reporte     → HTTP 200
✅ https://smartsense.c4a.cl/ajustes     → HTTP 200
```

---

## 🔍 VERIFICACIÓN POST-CONFIGURACIÓN

### 1. Verificar DNS propagado:

```powershell
nslookup smartsense.c4a.cl
# Output esperado:
# Name:    smartsense.c4a.cl
# Address: 76.76.21.21
```

### 2. Verificar acceso público:

```bash
curl -I https://smartsense.c4a.cl/dashboard
# Esperado: HTTP/1.1 200 OK
```

### 3. En navegador:

- Abre: https://smartsense.c4a.cl/dashboard
- Debe cargar SIN error de authentication
- Estilos deben verse (Tailwind CSS aplicado)
- Console (F12) debe estar limpia de errores

---

## 📞 INFORMACIÓN TÉCNICA

**URL de Vercel (sin custom domain):**
```
https://smart-sense-demo-owm1udbbo-cherrera0001s-projects.vercel.app
```

**Dominio personalizado:**
```
smartsense.c4a.cl
```

**IP de Vercel:**
```
76.76.21.21
```

**Nameservers actuales (Cloudflare):**
```
kelly.ns.cloudflare.com
titan.ns.cloudflare.com
```

---

## ⚡ CHECKLIST FINAL

- [ ] Desactivé Deployment Protection en Vercel
- [ ] Creé registro A en Cloudflare (smartsense → 76.76.21.21)
- [ ] Proxy configurado como "DNS only" (gris)
- [ ] Esperé 5-30 minutos para propagación
- [ ] Verifiqué con `nslookup smartsense.c4a.cl`
- [ ] Accedí a https://smartsense.c4a.cl/dashboard → HTTP 200
- [ ] Probé todas las 5 rutas
- [ ] Console sin errores

---

**Estado:** 🔴 BLOQUEADO (Requiere 2 acciones manuales: Protection + DNS)  
**Tiempo estimado:** 5-35 minutos (incluye propagación)  
**Complejidad:** ⭐ Baja (dos toggles/formularios)
