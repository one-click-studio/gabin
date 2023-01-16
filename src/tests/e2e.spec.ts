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

test('Onboarding [1] - landing', async () => {
  await mainPage.waitForNavigation({ url: /.*onboarding\/landing/})
  await new Promise((resolve) => setTimeout(resolve, 500))

  const btnHandle = await mainPage.waitForSelector('button.primary')
  const text = await btnHandle.textContent()
  expect(text?.trim()).toBe("Let's go!")

  btnHandle.click()
})

test('Onboarding [2] - profile', async () => {
  await mainPage.waitForNavigation({ url: /.*onboarding\/profile/})
  await new Promise((resolve) => setTimeout(resolve, 500))
  
  const btnHandle = await mainPage.waitForSelector('button.primary')
  const text = await btnHandle.textContent()
  expect(text?.trim()).toBe("Next")

  btnHandle.click()
})

test('Onboarding [3] - TCP', async () => {
  await mainPage.waitForNavigation({ url: /.*onboarding\/tcp/})
  await new Promise((resolve) => setTimeout(resolve, 500))

  const btnHandle = await mainPage.waitForSelector('button.primary')
  const text = await btnHandle.textContent()
  expect(text?.trim()).toBe("Next")

  btnHandle.click()
})

test('Onboarding [4] - mixers', async () => {
  await mainPage.waitForNavigation({ url: /.*onboarding\/vision-mixer/})
  await new Promise((resolve) => setTimeout(resolve, 500))

  const btnsHandle = await mainPage.$$('button')
  const txts: string[] = []

  for (const btnHandle of btnsHandle) {
    const text = await btnHandle.textContent()
    txts.push(text?.trim() ?? '')
    if (text?.trim() === 'OBS') {
      btnHandle.click()
      break
    }
  }

  expect(txts.indexOf('OBS') > -1).toBe(true)
})

test('Onboarding [5] - OBS', async () => {
  await mainPage.waitForNavigation({ url: /.*onboarding\/obs/})
  await new Promise((resolve) => setTimeout(resolve, 500))

  const btnHandle = await mainPage.waitForSelector('button.primary')
  const text = await btnHandle.textContent()
  expect(text?.trim()).toBe("Next")

  btnHandle.click()
})

test('Home', async () => {
  await mainPage.waitForNavigation({ url: /.*home/})
  await new Promise((resolve) => setTimeout(resolve, 500))

  const btnHandle = await mainPage.waitForSelector('button.primary')
  const text = await btnHandle.textContent()
  expect(text?.trim()).toBe("Start the configuration")
})
