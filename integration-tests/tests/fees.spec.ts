import { test, expect } from '@playwright/test'

test.describe('Fees', () => {
  test('standalone fee calculator grade mode loads', async ({ page }) => {
    await page.goto('/fees/calculator')
    await expect(page.getByRole('heading', { name: /fee calculator/i })).toBeVisible()
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('fee config page loads', async ({ page }) => {
    await page.goto('/fees/config')
    await expect(page.getByRole('heading', { name: /fee config/i })).toBeVisible()
  })

  test('invoice list page loads', async ({ page }) => {
    await page.goto('/fees/invoices')
    await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible()
  })

  test('student ledger page loads and has GR search', async ({ page }) => {
    await page.goto('/fees/ledger')
    await expect(page.getByRole('heading', { name: /ledger/i })).toBeVisible()
    await expect(page.getByPlaceholder(/gr number/i)).toBeVisible()
  })

  test('fee calculator per-student mode via URL param', async ({ page }) => {
    // Navigate to students to get a real student ID
    await page.goto('/students')
    await page.waitForTimeout(2000)

    const firstRow = page.locator('table tbody tr').first()
    if (await firstRow.count() > 0) {
      await firstRow.click()
      const url = page.url()
      const studentId = url.split('/students/')[1]

      if (studentId) {
        // Navigate to per-student calculator
        await page.goto(`/fees/calculator?studentId=${studentId}`)
        await expect(page.getByText(/from month|collect fee/i).first()).toBeVisible({ timeout: 8000 })
        await expect(page.getByText(/to month/i)).toBeVisible()
      }
    }
  })

  test('student fees tab: term fee calculation and collect', async ({ page }) => {
    await page.goto('/students')
    await page.waitForTimeout(2000)

    const firstRow = page.locator('table tbody tr').first()
    if (await firstRow.count() > 0) {
      await firstRow.click()
      await page.waitForURL(/\/students\/[a-f0-9-]+/)

      // Go to fees tab
      await page.getByRole('button', { name: /fees/i }).click()
      await page.waitForTimeout(1000)

      // Check breakdown appears if config exists
      const breakdown = page.getByText(/fee breakdown/i)
      if (await breakdown.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Check for Already Paid or Collect Now
        const collectBtn = page.getByRole('button', { name: /collect now/i })
        if (await collectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await collectBtn.click()
          // Collect form should appear
          await expect(page.getByText(/payment mode/i)).toBeVisible()
          // Select CASH and submit
          await page.selectOption('select', 'CASH')
          const submitBtn = page.getByRole('button', { name: /collect now/i }).last()
          await submitBtn.click()
          // Receipt should appear
          await expect(page.getByText(/RCT-/)).toBeVisible({ timeout: 8000 })
        }
      }
    }
  })
})
