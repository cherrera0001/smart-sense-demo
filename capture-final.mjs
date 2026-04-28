#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE_URL = "http://localhost:3000";
const routes = ["dashboard", "desglose", "alertas", "reporte", "ajustes"];
const viewports = [
  { width: 380, height: 667, name: "mobile-380" },
  { width: 1440, height: 900, name: "desktop-1440" },
];

// Timestamp
const now = new Date();
const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
const screenshotDir = join(process.cwd(), `screenshots-final-${timestamp}`);

mkdirSync(screenshotDir, { recursive: true });
console.log(`📸 Capturando screenshots en: ${screenshotDir}\n`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const captured = [];
  const failed = [];

  for (const route of routes) {
    for (const viewport of viewports) {
      try {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
        });

        const page = await context.newPage();
        await page.goto(`${BASE_URL}/${route}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);

        const filename = `${route}-${viewport.name}.png`;
        const filepath = join(screenshotDir, filename);

        await page.screenshot({ path: filepath, fullPage: true });
        captured.push(filename);
        console.log(`✅ ${filename}`);

        await context.close();
      } catch (err) {
        failed.push({ route, viewport: viewport.name, error: err.message });
        console.log(`❌ ${route}-${viewport.name}: ${err.message}`);
      }
    }
  }

  await browser.close();

  console.log(`\n📊 Resumen:`);
  console.log(`✅ Capturadas: ${captured.length}/10`);
  console.log(`❌ Fallidas: ${failed.length}/10`);
  console.log(`📁 Directorio: ${screenshotDir}`);

  // Guardar lista de archivos
  const manifest = {
    timestamp,
    directorio: screenshotDir,
    total_capturadas: captured.length,
    archivos: captured,
    fallidas: failed,
  };

  writeFileSync(
    join(screenshotDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  process.exit(failed.length > 0 ? 1 : 0);
})();
