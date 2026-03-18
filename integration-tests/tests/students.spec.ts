import { test, expect } from '@playwright/test'

test.describe('Students', () => {
  test('student list loads', async ({ page }) => {
    await page.goto('/students')
    await expect(page.getByRole('heading', { name: /students/i })).toBeVisible()
    // Table or no-data message should be visible
    await expect(
      page.locator('table, [data-testid="no-data"]').first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('search for student by GR number in ledger', async ({ page }) => {
    await page.goto('/fees/ledger')
    await expect(page.getByPlaceholder(/gr number/i)).toBeVisible()
    // Enter a GR pattern
    await page.fill('input[placeholder*="GR" i]', 'SCH')
    // Typing triggers search on submit
    await page.keyboard.press('Enter')
    // Either shows result or no-data
    await page.waitForTimeout(1500)
  })

  test('student detail page has tabs', async ({ page }) => {
    // Navigate to students list
    await page.goto('/students')
    await page.waitForTimeout(2000)

    // Click first student row if any
    const firstRow = page.locator('table tbody tr').first()
    if (await firstRow.count() > 0) {
      await firstRow.click()
      await page.waitForURL(/\/students\/[a-f0-9-]+/)

      // Check that Fees tab is present
      await expect(page.getByRole('button', { name: /fees/i })).toBeVisible()
      // Overview tab should be active by default
      await expect(page.getByText(/personal information/i)).toBeVisible()
    }
  })

  test('student detail Fees tab shows calculator', async ({ page }) => {
    await page.goto('/students')
    await page.waitForTimeout(2000)

    const firstRow = page.locator('table tbody tr').first()
    if (await firstRow.count() > 0) {
      await firstRow.click()
      await page.waitForURL(/\/students\/[a-f0-9-]+/)

      // Switch to Fees tab
      await page.getByRole('button', { name: /fees/i }).click()
      // Fee calculator should appear
      await expect(page.getByText(/from month|collect fee/i).first()).toBeVisible({ timeout: 5000 })
    }
  })
})
