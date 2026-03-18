import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('dashboard loads after login', async ({ page }) => {
    await page.goto('/')
    // After login (via storageState) we should be on the dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/)
    // Check that the sidebar/nav is visible
    await expect(page.locator('nav, aside').first()).toBeVisible()
  })

  test('logout redirects to Keycloak', async ({ page }) => {
    await page.goto('/')
    // Find and click logout button
    const logoutBtn = page.getByRole('button', { name: /logout|log out/i })
      .or(page.locator('[data-testid="logout"]'))
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click()
      // Should redirect to Keycloak or login page
      await page.waitForURL(/8180|\/login/, { timeout: 10000 })
    }
  })
})
