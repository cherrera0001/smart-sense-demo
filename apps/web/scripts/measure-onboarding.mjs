import { chromium } from '@playwright/test'
import { writeFileSync } from 'fs'
import { join } from 'path'

const BASE_URL = 'http://localhost:3000'

async function measureOnboarding() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 380, height: 800 } })
  const page = await context.newPage()

  const measurements = []
  const startTotal = Date.now()

  try {
    console.log('🎯 ONBOARDING MEASUREMENT: /onboarding → /dashboard\n')

    // Step 1: Load onboarding
    console.log('Step 1️⃣  [Onboarding Load]')
    const t1 = Date.now()
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' })
    const onboardingLoad = Date.now() - t1
    measurements.push({ step: 'Onboarding load', ms: onboardingLoad })
    console.log(`   Time: ${onboardingLoad}ms\n`)

    // Step 2: Click through steps (simulated navigation)
    console.log('Step 2️⃣  [Navigate through steps]')
    const t2 = Date.now()

    // Find all "Siguiente" buttons and click through
    let stepCount = 0
    let clickTime = 0

    // Try clicking next buttons (up to 5 steps max)
    for (let i = 0; i < 5; i++) {
      const nextBtn = await page.locator('button:has-text("Siguiente"), button:has-text("Completar")')
      const count = await nextBtn.count()

      if (count > 0) {
        const btnStart = Date.now()
        await nextBtn.first().click()
        clickTime += Date.now() - btnStart
        stepCount++
        await page.waitForTimeout(200)
        console.log(`   Step ${i + 1}: clicked (${Date.now() - btnStart}ms)`)
      } else {
        console.log(`   Step ${i + 1}: no more buttons found`)
        break
      }
    }

    const navigateTime = Date.now() - t2
    measurements.push({ step: 'Navigate through steps', ms: navigateTime, clickCount: stepCount })
    console.log(`   Total navigation time: ${navigateTime}ms\n`)

    // Step 3: Verify we ended at dashboard or onboarding complete
    const currentUrl = page.url()
    console.log(`Step 3️⃣  [Verify end state]`)
    console.log(`   Current URL: ${currentUrl}`)
    const urlEnd = currentUrl.includes('dashboard') ? 'Dashboard' : 'Onboarding'
    console.log(`   End state: ${urlEnd}\n`)
    measurements.push({ step: 'End verification', ms: 0, url: currentUrl, endState: urlEnd })

    const totalJourney = Date.now() - startTotal

    // Report
    console.log('═══════════════════════════════════════════════════')
    console.log('📊 ONBOARDING METRICS\n')
    measurements.forEach(m => {
      if (m.clickCount) {
        console.log(`${m.step.padEnd(30)} ${m.ms}ms (${m.clickCount} clicks)`)
      } else if (m.url) {
        console.log(`${m.step.padEnd(30)} ${m.endState}`)
      } else {
        console.log(`${m.step.padEnd(30)} ${m.ms}ms`)
      }
    })
    console.log('\n═══════════════════════════════════════════════════')
    console.log(`\n⏱️  TOTAL ONBOARDING TIME: ${totalJourney}ms (${(totalJourney / 1000).toFixed(2)}s)`)
    console.log(`\n✓ SLA Check: ≤30s? ${totalJourney <= 30000 ? '✅ PASS' : '❌ FAIL'} (${totalJourney}ms)`)

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      journey: 'Onboarding /onboarding → /dashboard',
      viewport: '380x800 (mobile)',
      server: BASE_URL,
      measurements,
      totalMs: totalJourney,
      totalSeconds: (totalJourney / 1000).toFixed(2),
      slaTarget: 30000,
      slaPass: totalJourney <= 30000,
      endState: urlEnd
    }

    writeFileSync(
      join(process.cwd(), 'onboarding-report.json'),
      JSON.stringify(report, null, 2)
    )
    console.log(`\n📄 Report saved: onboarding-report.json`)

  } catch (err) {
    console.error('\n❌ Measurement failed:', err.message)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

measureOnboarding()
