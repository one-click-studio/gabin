import { test, expect } from '@playwright/test'

test.describe('Setup one profile', () => {

  test('has title', async ({ page }) => {
    await page.goto('/')    
    await expect(page).toHaveTitle(/Gabin/)
  })

  test('new profile', async ({ page }) => {
    const DEFAULT = {
      name: 'E2E test'
    }

    await page.goto('/')

    // HOME
    await page.getByRole('button', { name: 'Start the configuration' }).click()    
    
    // SETUP LANDING
    await expect(page).toHaveURL(/\/setup\/landing/)
    await page.getByRole('button', { name: 'Next' }).click()

    // SETUP PROFILE
    await expect(page).toHaveURL(/\/setup\/profile/)
    await page.locator('css=div.inputui-container > input').fill(DEFAULT.name)
    await page.getByRole('button', { name: 'Next' }).click()

    // SETUP AUDIO
    await expect(page).toHaveURL(/\/setup\/audio/)
    await page.getByRole('button', { name: 'Add audio device' }).click()
    await page.locator('css=.selectui-container > button.selectui-btn').click()

    const audioDevices = await page.locator('css=ul.selectui-opts > li').count()
    expect(audioDevices).toBeGreaterThan(0)

    await page.locator('css=ul.selectui-opts > li:first-child').click()

    const tagsUi = await page.locator('css=div.tagui-container').count()
    if (tagsUi > 0) {
      await page.locator('css=div.tagui-container').first().click()
    } 
    await page.getByRole('button', { name: 'Next' }).click()
    
    // SETUP VIDEO MIXER
    await expect(page).toHaveURL(/\/setup\/video-mixer/)
    await page.getByRole('button', { name: 'OSC' }).click()
    
    // SETUP OSC
    await expect(page).toHaveURL(/\/setup\/osc/)
    await page.getByRole('button', { name: 'Connect to osc client' }).click()
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: 'Next' }).click()
    
    // SETUP MAPPING
    await expect(page).toHaveURL(/\/setup\/mapping-osc/)
    await page.locator('css=div.modal-container > div:first-child > button').click()
    await page.getByRole('button', { name: 'Add a scene' }).click()
    await page.getByRole('button', { name: 'Add a container' }).click()
    await page.getByRole('button', { name: 'Add a source' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    
    // SETUP AUTOCAM
    await expect(page).toHaveURL(/\/setup\/settings/)
    await page.getByRole('button', { name: 'Next' }).click()
    
    // SETUP SUMMARY
    await expect(page).toHaveURL(/\/setup\/summary/)
    await page.getByRole('button', { name: 'Save profile' }).click()
    
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/\/home/)
    
    const profileName = await page.locator('css=div#header-title-input > input').inputValue()
    expect(profileName).toBe(DEFAULT.name)
  })

})


