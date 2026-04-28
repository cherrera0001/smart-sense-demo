#!/usr/bin/env node

const BASE_URL = "https://smart-sense-demo-owm1udbbo-cherrera0001s-projects.vercel.app";
const routes = ["dashboard", "desglose", "alertas", "reporte", "ajustes"];
const assets = ["manifest.webmanifest", "_next/static/", "sw.js"];

const results = {
  routes: {},
  assets: {},
  timestamp: new Date().toISOString(),
};

console.log("🚀 FASE 4 — VALIDACIÓN POST-DEPLOY\n");
console.log(`📍 URL de producción: ${BASE_URL}\n`);
console.log("=".repeat(70));

// Validate routes
console.log("\n📊 VALIDANDO RUTAS:\n");

(async () => {
  for (const route of routes) {
    try {
      const url = `${BASE_URL}/${route}`;
      const response = await fetch(url, { method: "HEAD", redirect: "follow" });
      const status = response.status;
      const pass = status === 200;

      results.routes[route] = { status, pass, url };
      console.log(`${pass ? "✅" : "❌"} ${route.padEnd(12)} => ${status} (${url})`);

      if (!pass) {
        const fullResponse = await fetch(url);
        const contentType = fullResponse.headers.get("content-type");
        console.log(`   Content-Type: ${contentType}`);
      }
    } catch (err) {
      results.routes[route] = { status: null, pass: false, error: err.message };
      console.log(`❌ ${route.padEnd(12)} => ERROR: ${err.message}`);
    }
  }

  // Validate PWA assets
  console.log("\n📱 VALIDANDO ASSETS PWA:\n");

  for (const asset of assets) {
    try {
      const url = `${BASE_URL}/${asset}`;
      const response = await fetch(url, { method: "HEAD", redirect: "follow" });
      const status = response.status;
      const pass = status === 200 || status === 304;

      results.assets[asset] = { status, pass, url };
      console.log(`${pass ? "✅" : "⚠️ "} ${asset.padEnd(20)} => ${status} (${url})`);

      if (asset === "manifest.webmanifest" && pass) {
        const fullResponse = await fetch(url);
        const manifest = await fullResponse.json();
        console.log(`   ✅ PWA name: "${manifest.name}"`);
        console.log(`   ✅ Start URL: "${manifest.start_url}"`);
        console.log(`   ✅ Display: "${manifest.display}"`);
      }
    } catch (err) {
      results.assets[asset] = { status: null, pass: false, error: err.message };
      console.log(`⚠️  ${asset.padEnd(20)} => ERROR: ${err.message}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  const routesPassed = Object.values(results.routes).filter(r => r.pass).length;
  const assetsPassed = Object.values(results.assets).filter(a => a.pass).length;

  console.log(`\n📈 RESUMEN:`);
  console.log(`   Rutas: ${routesPassed}/5 respondiendo 200 OK`);
  console.log(`   Assets PWA: ${assetsPassed}/3 cargando correctamente`);
  console.log(`   Estado general: ${routesPassed === 5 && assetsPassed >= 2 ? "✅ PASSOU" : "⚠️  REVISAR"}`);

  // Detailed results
  console.log(`\n📋 DETALLE COMPLETO:\n`);
  console.log(JSON.stringify(results, null, 2));

  process.exit(routesPassed === 5 ? 0 : 1);
})();
