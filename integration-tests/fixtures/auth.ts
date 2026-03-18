import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = 'fixtures/auth.json'

/**
 * Logs in via Keycloak once and saves storage state for all other tests.
 * Run automatically by playwright setup project before the main tests.
 */
setup('authenticate', async ({ page }) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
  const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8180'

  // Navigate to app — Keycloak will redirect to login
  await page.goto(baseUrl)

  // Wait for Keycloak login page
  await page.waitForURL(/.*8180.*\/login.*/, { timeout: 15000 })

  // Fill credentials
  await page.fill('#username', process.env.ADMIN_EMAIL || 'admin@school.com')
  await page.fill('#password', process.env.ADMIN_PASSWORD || 'Admin@123')
  await page.click('#kc-login')

  // Wait for redirect back to app
  await page.waitForURL(`${baseUrl}/**`, { timeout: 15000 })
  await expect(page).toHaveURL(new RegExp(baseUrl))

  // Save auth state
  await page.context().storageState({ path: AUTH_FILE })
})
