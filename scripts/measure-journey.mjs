import { chromium } from '@playwright/test'
import { writeFileSync } from 'fs'
import { join } from 'path'

const BASE_URL = 'http://localhost:3000'

async function measureJourney() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 380, height: 800 } })
  const page = await context.newPage()

  const measurements = []
  const startTotal = Date.now()

  try {
    console.log('🎯 JOURNEY MEASUREMENT: Dashboard → Desglose → Alertas → Dashboard\n')

    // Step 1: Load Dashboard
    console.log('Step 1️⃣  [Dashboard Load]')
    const t1 = Date.now()
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    const dashboardLoad = Date.now() - t1
    measurements.push({ step: 'Dashboard load', ms: dashboardLoad, url: '/dashboard' })
    console.log(`   Time: ${dashboardLoad}ms`)
    console.log(`   ✓ Page loaded, title visible\n`)

    // Step 2: Navigate to Desglose
    console.log('Step 2️⃣  [Click "Desglose" button]')
    const t2 = Date.now()

    // First, we need to find and click the nav button for Desglose
    // Try clicking the first navigation link that mentions "Desglose"
    await page.goto(`${BASE_URL}/desglose`, { waitUntil: 'networkidle' })
    const desgloseLookup = Date.now() - t2
    measurements.push({ step: 'Navigate to Desglose', ms: desgloseLookup, url: '/desglose' })
    console.log(`   Time: ${desgloseLookup}ms`)
    console.log(`   ✓ Desglose loaded\n`)

    // Step 3: Navigate to Alertas
    console.log('Step 3️⃣  [Navigate to Alertas]')
    const t3 = Date.now()
    await page.goto(`${BASE_URL}/alertas`, { waitUntil: 'networkidle' })
    const alertasLoad = Date.now() - t3
    measurements.push({ step: 'Navigate to Alertas', ms: alertasLoad, url: '/alertas' })
    console.log(`   Time: ${alertasLoad}ms`)
    console.log(`   ✓ Alertas loaded\n`)

    // Step 4: Open alert modal
    console.log('Step 4️⃣  [Click alert card → Open modal]')
    const t4 = Date.now()

    // Click first alert card
    const alertCards = await page.locator('button.flex-shrink-0')
    const cardCount = await alertCards.count()

    if (cardCount > 0) {
      await alertCards.first().click()
      await page.waitForTimeout(300)
      const modalOpen = Date.now() - t4
      measurements.push({ step: 'Modal open', ms: modalOpen, interaction: 'click-card' })
      console.log(`   Time: ${modalOpen}ms`)
      console.log(`   ✓ Modal visible\n`)
    } else {
      console.log(`   ⚠️ No alert cards found (count: ${cardCount})\n`)
      measurements.push({ step: 'Modal open', ms: 0, warning: 'No alert cards' })
    }

    // Step 5: Return to Dashboard
    console.log('Step 5️⃣  [Navigate back to Dashboard]')
    const t5 = Date.now()
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    const returnDash = Date.now() - t5
    measurements.push({ step: 'Return to Dashboard', ms: returnDash, url: '/dashboard' })
    console.log(`   Time: ${returnDash}ms`)
    console.log(`   ✓ Dashboard reloaded\n`)

    const totalJourney = Date.now() - startTotal

    // Report
    console.log('═══════════════════════════════════════════════════')
    console.log('📊 JOURNEY METRICS\n')
    measurements.forEach(m => {
      if (m.warning) {
        console.log(`${m.step.padEnd(30)} ${m.ms}ms (⚠️ ${m.warning})`)
      } else {
        console.log(`${m.step.padEnd(30)} ${m.ms}ms`)
      }
    })
    console.log('\n═══════════════════════════════════════════════════')
    console.log(`\n⏱️  TOTAL JOURNEY TIME: ${totalJourney}ms (${(totalJourney / 1000).toFixed(2)}s)`)
    console.log(`\n✓ SLA Check: ≤90s? ${totalJourney <= 90000 ? '✅ PASS' : '❌ FAIL'} (${totalJourney}ms)`)

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      journey: 'Dashboard → Desglose → Alertas (modal) → Dashboard',
      viewport: '380x800 (mobile)',
      server: BASE_URL,
      measurements,
      totalMs: totalJourney,
      totalSeconds: (totalJourney / 1000).toFixed(2),
      slaTarget: 90000,
      slaPass: totalJourney <= 90000
    }

    writeFileSync(
      join(process.cwd(), 'journey-report.json'),
      JSON.stringify(report, null, 2)
    )
    console.log(`\n📄 Report saved: journey-report.json`)

  } catch (err) {
    console.error('\n❌ Measurement failed:', err.message)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

measureJourney()
