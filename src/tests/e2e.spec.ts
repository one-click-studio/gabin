import { resolve } from 'path'
import { ElectronApplication, Page, _electron } from 'playwright'
import { afterAll, beforeAll, expect, test } from 'vitest'

let electronApp: ElectronApplication
let mainPage: Page

const waitUntilMainPageLoad = async () => {
  while (mainPage === undefined) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

beforeAll(async () => {
  electronApp = await _electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js')],
  })

  electronApp.on('window', async (page) => {
    const title = await page.title()
    if (title !== 'DevTools') mainPage = page
  })

  await waitUntilMainPageLoad()
})

afterAll(async () => {
  await electronApp.close()
})

test('App launches', async () => {
  const title = await mainPage.title()
  expect(title).toBe('Electron')
})

test('Layout renders', async () => {
  await mainPage.waitForSelector('#app')
  expect(await mainPage.isVisible('#main')).toBe(true)
})

test('Home page', async () => {
  await mainPage.waitForNavigation({ url: /.*home/})
  await new Promise((resolve) => setTimeout(resolve, 500))

  const btnHandle = await mainPage.waitForSelector('button.primary')
  const text = await btnHandle.textContent()
  expect(text?.trim()).toBe("Start the configuration")
})
