import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { test } from '@playwright/test'

const OUT = path.join(process.cwd(), 'screenshots')

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true })
})

test.describe('Capturas para validación vs deck', () => {
  test('móvil 380px — rutas principales', async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 820 })
    await page.addInitScript(() => {
      localStorage.setItem('onboardingDone', 'true')
    })

    for (const route of ['/dashboard', '/desglose', '/alertas', '/reporte', '/ajustes']) {
      await page.goto(route, { waitUntil: 'load' })
      const name = route.replace(/\//g, '') || 'home'
      await page.screenshot({
        path: path.join(OUT, `mobile-380-${name}.png`),
        fullPage: true,
      })
    }
  })

  test('móvil 380px — onboarding paso 2 (LEDs)', async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 820 })
    await page.addInitScript(() => {
      localStorage.removeItem('onboardingDone')
    })
    await page.goto('/onboarding', { waitUntil: 'load' })
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await page.waitForTimeout(3500)
    await page.screenshot({
      path: path.join(OUT, 'mobile-380-onboarding-step2-leds.png'),
      fullPage: true,
    })
  })

  test('escritorio 1440px — dashboard y desglose con marco iPhone', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.addInitScript(() => {
      localStorage.setItem('onboardingDone', 'true')
      localStorage.setItem('showIPhoneFrame', JSON.stringify(true))
    })

    await page.goto('/dashboard', { waitUntil: 'load' })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(OUT, 'desktop-1440-dashboard-frame.png'),
      fullPage: true,
    })

    await page.goto('/desglose', { waitUntil: 'load' })
    await page.waitForTimeout(300)
    await page.screenshot({
      path: path.join(OUT, 'desktop-1440-desglose-frame.png'),
      fullPage: true,
    })
  })
})
