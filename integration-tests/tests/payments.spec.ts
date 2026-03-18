import { test, expect } from '@playwright/test'

test.describe('Payments', () => {
  test('payment history list loads', async ({ page }) => {
    await page.goto('/payments')
    await expect(page.getByRole('heading', { name: /payment/i })).toBeVisible()
  })

  test('payment history table renders rows or no-data', async ({ page }) => {
    await page.goto('/payments')
    await page.waitForTimeout(2000)
    // Either a table with rows or a no-data message
    const hasTable  = await page.locator('table tbody tr').count()
    const hasNoData = await page.getByText(/no records|no data/i).count()
    expect(hasTable + hasNoData).toBeGreaterThan(0)
  })

  test('payment form page accessible', async ({ page }) => {
    await page.goto('/payments/new')
    await page.waitForTimeout(1000)
    // Should show a form or redirect
    const url = page.url()
    expect(url).toMatch(/payment/)
  })
})
