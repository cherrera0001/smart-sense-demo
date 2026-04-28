import { test, chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const BASE_URL = 'http://localhost:3000'
const ROUTES = ['/', '/dashboard', '/desglose', '/alertas', '/reporte', '/ajustes', '/onboarding']
const VIEWPORTS = [
  { name: 'mobile', width: 380, height: 800 },
  { name: 'desktop', width: 1440, height: 900 }
]

async function captureScreenshots() {
  const screenshotsDir = join(process.cwd(), 'screenshots')
  mkdirSync(screenshotsDir, { recursive: true })

  const browser = await chromium.launch()

  try {
    for (const route of ROUTES) {
      for (const viewport of VIEWPORTS) {
        const context = await browser.newContext({ viewport })
        const page = await context.newPage()

        const url = `${BASE_URL}${route}`
        console.log(`Capturing ${url} at ${viewport.width}x${viewport.height}...`)

        try {
          await page.goto(url, { waitUntil: 'networkidle' })
          await page.waitForTimeout(500)

          const routeName = route === '/' ? 'index' : route.slice(1)
          const filename = `${routeName}-${viewport.name}.png`
          const filepath = join(screenshotsDir, filename)

          await page.screenshot({ path: filepath })
          console.log(`✓ Saved: ${filename}`)
        } catch (err) {
          console.error(`Error on ${url}:`, err.message)
        }

        await context.close()
      }
    }

    console.log('\n✅ All screenshots captured successfully!')
  } finally {
    await browser.close()
  }
}

captureScreenshots().catch(err => {
  console.error('Screenshot capture failed:', err)
  process.exit(1)
})
