import { test, expect } from '@playwright/test'

// NEED TO ADD PROFILE CONFIG TO GABIN BEFORE THESE TESTS

test.beforeAll(async () => {
})

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page).toHaveURL(/\/setup\/settings/)
})

test.describe('Edit profile', () => {
  
  test('edit audio', async ({ page }) => {
    await page.getByRole('link', { name: 'Audio device 🎧' }).click()
    await expect(page).toHaveURL(/\/setup\/audio/)
    
    await page.locator('css=button.i-round').click()

    await page.getByRole('button', { name: 'Add audio device' }).click()
    await page.locator('css=.selectui-container > button.selectui-btn').click()

    const devices = await page.locator('css=ul.selectui-opts > li').allInnerTexts()
    expect(devices).not.toContain('Empty')

    await page.locator('css=ul.selectui-opts > li:first-child').click()
    
    const tagsUi = await page.locator('css=div.tagui-container').count()
    if (tagsUi > 0) {
      await page.locator('css=div.tagui-container').first().click()
    }
    await page.getByRole('button', { name: 'Save' }).click()
    const toast = await page.locator('css=div.toast-container > span').innerText()
    expect(toast).toContain('Profile saved !')
  })

  test('edit connection', async ({ page }) => {
    await page.getByRole('link', { name: 'Connections 🔗' }).click()
    await expect(page).toHaveURL(/\/setup\/osc/)

    await page.getByRole('button', { name: 'Connect to osc client' }).click()
    await page.waitForTimeout(1500)

    await page.getByRole('button', { name: 'Save' }).click()
    const toast = await page.locator('css=div.toast-container > span').innerText()
    expect(toast).toContain('Profile saved !')
  })

  test('edit mapping', async ({ page }) => {
    await page.getByRole('link', { name: 'Mapping 🗺️' }).click()
    await expect(page).toHaveURL(/\/setup\/mapping-osc/)

    await page.locator('css=button.i-round').first().click()
    await page.getByRole('button', { name: 'Add a scene' }).click()
    await page.getByRole('button', { name: 'Add a container' }).click()
    await page.getByRole('button', { name: 'Add a source' }).click()

    await page.getByRole('button', { name: 'Save' }).click()
    const toast = await page.locator('css=div.toast-container > span').innerText()
    expect(toast).toContain('Profile saved !')
  })

  test('edit settings', async ({ page }) => {
    await page.getByRole('link', { name: 'Auto cam settings 🔧' }).click()
    await expect(page).toHaveURL(/\/setup\/settings/)

    await page.getByRole('button', { name: 'Reset All' }).click()

    await page.getByRole('button', { name: 'Save' }).click()
    const toast = await page.locator('css=div.toast-container > span').innerText()
    expect(toast).toContain('Profile saved !')
  })

})


