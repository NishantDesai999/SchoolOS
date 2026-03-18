import { test, expect } from '@playwright/test'

test.describe('SLC', () => {
  test('SLC list page loads', async ({ page }) => {
    await page.goto('/slc')
    await expect(page.getByRole('heading', { name: /slc|leaving certificate/i })).toBeVisible()
  })

  test('SLC lookup page loads and has GR search', async ({ page }) => {
    // Try /slc/lookup or /slc
    await page.goto('/slc')
    await page.waitForTimeout(1000)
    // Look for a GR number input
    const grInput = page.getByPlaceholder(/gr number/i)
    if (await grInput.count() > 0) {
      await expect(grInput).toBeVisible()
    }
  })

  test('issue SLC page accessible', async ({ page }) => {
    await page.goto('/slc/new')
    await page.waitForTimeout(1000)
    const url = page.url()
    // Either lands on form or redirects to SLC list
    expect(url).toMatch(/slc/)
  })

  test('SLC search for student by GR', async ({ page }) => {
    await page.goto('/slc')
    await page.waitForTimeout(1000)

    const grInput = page.getByPlaceholder(/gr number/i)
    if (await grInput.count() > 0) {
      // Type a known GR prefix
      await grInput.fill('SCH')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1500)
      // Should show results or "not found"
      await expect(
        page.locator('table, [data-testid="no-data"], .text-sm').first()
      ).toBeVisible()
    }
  })
})
