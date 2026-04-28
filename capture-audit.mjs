import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://localhost:3000";
const routes = ["dashboard", "desglose", "alertas", "reporte", "ajustes"];
const viewports = [
  { width: 380, height: 667, name: "mobile-380" },
  { width: 1440, height: 900, name: "desktop-1440" },
];

const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, "");
const screenshotDir = path.join(process.cwd(), `screenshots-audit-${timestamp}`);

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch();

  for (const route of routes) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });

      const page = await context.newPage();
      try {
        console.log(`📸 Capturando: /${route} @ ${viewport.width}px...`);
        await page.goto(`${BASE_URL}/${route}`, { waitUntil: "networkidle" });
        
        const filename = `${route}-${viewport.name}.png`;
        const filepath = path.join(screenshotDir, filename);
        
        await page.screenshot({ path: filepath, fullPage: true });
        console.log(`✅ Guardado: ${filepath}`);
      } catch (err) {
        console.error(`❌ Error en /${route}: ${err.message}`);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
  console.log(`\n✅ Screenshots guardadas en: ${screenshotDir}`);
})();
