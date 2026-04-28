# DNS Configuration for smartsense.c4a.cl

**Cuando el dominio esté agregado en Vercel, crea este registro en Cloudflare:**

---

## 📋 REGISTRO DNS A CREAR EN CLOUDFLARE

| Campo | Valor |
|-------|-------|
| **Type** | CNAME |
| **Name** | smartsense |
| **Target/Content** | cname.vercel-dns.com |
| **TTL** | Auto (or 3600) |
| **Proxy status** | DNS only (gray cloud) ☁️ |

---

## 🚀 PASOS EN CLOUDFLARE

1. **Inicia sesión** en https://dash.cloudflare.com
2. **Selecciona** dominio: c4a.cl
3. **Navega a** DNS > Records
4. **Click** "Add record"
5. **Completa:**
   - Type: **CNAME**
   - Name: **smartsense**
   - Content: **cname.vercel-dns.com**
   - TTL: **Auto**
   - Proxy: **DNS only** (must be gray cloud ☁️, NOT orange)
6. **Click** Save
7. **Espera** 5-30 minutos para propagación

---

## ✅ VALIDACIÓN POST-CONFIGURACIÓN

Una vez propagado el DNS (verifica con `nslookup`):

```powershell
nslookup smartsense.c4a.cl
# Debe retornar: cname.vercel-dns.com
```

Luego, estas rutas estarán públicas:
```
✅ https://smartsense.c4a.cl/dashboard
✅ https://smartsense.c4a.cl/desglose
✅ https://smartsense.c4a.cl/alertas
✅ https://smartsense.c4a.cl/reporte
✅ https://smartsense.c4a.cl/ajustes
```

---

## 📝 MENSAJE PARA ADMIN DE DNS

Si necesitas darle esto al admin de c4a.cl (copiar/pegar):

---

> **Solicitud: Agregar CNAME para smartsense.c4a.cl en Cloudflare**
>
> Favor crear este registro DNS en c4a.cl:
> - Type: CNAME
> - Name: smartsense
> - Target: cname.vercel-dns.com
>
> Esto redirigirá smartsense.c4a.cl al deployment de Smart Sense en Vercel.

---

## ⚠️ NOTAS IMPORTANTES

- **Proxy status DEBE ser "DNS only"** (gray cloud ☁️)
  - NO orange cloud (Cloudflare proxy activo)
  - Vercel necesita ver directamente el CNAME
  
- **TTL recomendado:** Auto
  - Si lo cambias manualmente, usa 3600 (1 hora)

- **Propagación:** Puede tomar 5-30 minutos
  - Verifica con: `nslookup smartsense.c4a.cl`
  - O: `dig smartsense.c4a.cl`

- **Una vez propagado:**
  - Vercel emitirá certificado SSL automáticamente
  - HTTPS funcionará sin configuración adicional

---

**Generado:** 2026-04-28  
**Para:** smartsense.c4a.cl  
**Proveedor:** Vercel + Cloudflare
