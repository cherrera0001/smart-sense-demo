const { chromium } = require('playwright');
const { mkdir } = require('fs/promises');
const { join } = require('path');

(async () => {
  const screenshotDir = './screenshots-redesign';
  await mkdir(screenshotDir, { recursive: true });

  const routes = [
    { path: '/dashboard', name: 'dashboard' },
    { path: '/alertas', name: 'alertas' },
  ];

  const viewports = [
    { width: 380, height: 812, name: 'mobile' },
    { width: 1440, height: 900, name: 'desktop' },
  ];

  const browser = await chromium.launch({ headless: true });

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();

    for (const route of routes) {
      try {
        await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);

        const filename = `${route.name}-${viewport.name}.png`;
        await page.screenshot({ path: join(screenshotDir, filename), fullPage: true });
        console.log(`✓ ${filename}`);
      } catch (err) {
        console.log(`✗ ${route.path} (${viewport.name}): ${err.message}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log(`\n✓ Screenshots captured`);
})();
