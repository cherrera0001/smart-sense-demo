import { chromium } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'

async function testDemoFlow() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 380, height: 800 } })
  const page = await context.newPage()

  const startTime = Date.now()

  try {
    console.log('▶ Starting demo flow timing...\n')

    // Dashboard
    console.log('1️⃣  Loading Dashboard...')
    let routeStart = Date.now()
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    let routeTime = Date.now() - routeStart
    console.log(`   ✓ Dashboard loaded: ${routeTime}ms\n`)

    // Click Desglose
    console.log('2️⃣  Navigating to Desglose...')
    routeStart = Date.now()
    await page.click('button:has-text("Desglose")')
    await page.waitForTimeout(500)
    routeTime = Date.now() - routeStart
    console.log(`   ✓ Desglose loaded: ${routeTime}ms\n`)

    // Click Alertas
    console.log('3️⃣  Navigating to Alertas...')
    routeStart = Date.now()
    await page.click('button:has-text("Alertas")')
    await page.waitForTimeout(500)
    routeTime = Date.now() - routeStart
    console.log(`   ✓ Alertas loaded: ${routeTime}ms\n`)

    // Click alert modal
    console.log('4️⃣  Opening alert modal...')
    routeStart = Date.now()
    const alertButtons = await page.locator('button.flex-shrink-0')
    if (await alertButtons.count() > 0) {
      await alertButtons.first().click()
      await page.waitForTimeout(300)
    }
    routeTime = Date.now() - routeStart
    console.log(`   ✓ Modal opened: ${routeTime}ms\n`)

    // Navigate back to Dashboard
    console.log('5️⃣  Returning to Dashboard...')
    routeStart = Date.now()
    await page.click('button:has-text("Inicio")')
    await page.waitForTimeout(300)
    routeTime = Date.now() - routeStart
    console.log(`   ✓ Dashboard loaded: ${routeTime}ms\n`)

    const totalTime = Date.now() - startTime
    console.log(`⏱️  TOTAL DEMO FLOW TIME: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`)
    console.log(`✅ Result: ${totalTime < 90000 ? '✓ PASS - Under 90s' : '✗ FAIL - Over 90s'}`)

  } catch (err) {
    console.error('Error during demo flow:', err.message)
  } finally {
    await browser.close()
  }
}

testDemoFlow()
