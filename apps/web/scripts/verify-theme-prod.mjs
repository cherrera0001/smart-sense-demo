import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = 'https://smartsense.c4a.cl'
const outDir = path.resolve('artifacts')

await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()

const result = {
  changedToLight: false,
  persistedLightAfterReload: false,
  changedToDark: false,
  lightScreenshot: path.join(outDir, 'dashboard-light.png'),
  darkScreenshot: path.join(outDir, 'dashboard-dark.png'),
}

try {
  await page.goto(`${baseUrl}/ajustes`, { waitUntil: 'networkidle', timeout: 60000 })

  const lightButton = page.getByRole('button', { name: /claro/i })
  await lightButton.click()
  await page.waitForTimeout(700)
  result.changedToLight = (await page.evaluate(() => localStorage.getItem('theme'))) === 'light'

  await page.reload({ waitUntil: 'networkidle', timeout: 60000 })
  result.persistedLightAfterReload = (await page.evaluate(() => localStorage.getItem('theme'))) === 'light'

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.screenshot({ path: result.lightScreenshot, fullPage: true })

  await page.goto(`${baseUrl}/ajustes`, { waitUntil: 'networkidle', timeout: 60000 })
  const darkButton = page.getByRole('button', { name: /oscuro/i })
  await darkButton.click()
  await page.waitForTimeout(700)
  result.changedToDark = (await page.evaluate(() => localStorage.getItem('theme'))) === 'dark'

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.screenshot({ path: result.darkScreenshot, fullPage: true })
} finally {
  await browser.close()
}

console.log(JSON.stringify(result, null, 2))
