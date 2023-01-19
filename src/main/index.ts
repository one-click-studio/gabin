import { app, shell, BrowserWindow } from 'electron'
import * as path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

import { ipcMain } from '@src/common/ipcs'
import { Gabin } from '@src/main/gabin';
import { ProfileSetup } from '@src/main/modules/setup';
import db from '@src/main/utils/db'
import { isDev } from '@src/main/utils/utils'

const { invoke, handle } = ipcMain
let gabin: Gabin | undefined

const initGabin = () => {
  gabin = new Gabin()
  gabin.shoot$.subscribe(shoot => {
    BrowserWindow.getAllWindows().forEach(bw => {
      invoke.handleNewShot(bw, shoot)
    })
  })
  gabin.autocam$.subscribe(autocam => {
    BrowserWindow.getAllWindows().forEach(bw => {
      invoke.handleAutocam(bw, autocam)
    })
  })
  gabin.timeline$.subscribe(micId => {
    BrowserWindow.getAllWindows().forEach(bw => {
      invoke.handleTimeline(bw, micId)
    })
  })
  gabin.availableMics$.subscribe(availableMics => {
    BrowserWindow.getAllWindows().forEach(bw => {
      invoke.handleAvailableMics(bw, availableMics)
    })
  })
  gabin.connections$.subscribe((c => {
      BrowserWindow.getAllWindows().forEach(bw => {
        invoke.handleObsConnected(bw, c.obs)
      })
      BrowserWindow.getAllWindows().forEach(bw => {
        invoke.handleStreamdeckConnected(bw, c.streamdeck)
      })
  }))
}

function handler() {
  const profileSetup = new ProfileSetup()

  profileSetup.obs.reachable$.subscribe((reachable => {
      BrowserWindow.getAllWindows().forEach(bw => {
        invoke.handleObsConnected(bw, reachable)
      })
  }))

  profileSetup.obs.scenes$.subscribe((scenes => {
      BrowserWindow.getAllWindows().forEach(bw => {
        invoke.handleObsScenes(bw, scenes)
      })
  }))

  // ELECTRON
  handle.openLink(async (_, link) => shell.openExternal(link.data))

  // OBS
  handle.connectObs(async (_, c) => profileSetup.connectObs(c.data))
  handle.disconnectObs(async () => profileSetup.disconnectObs())
  
  // AUDIO
  handle.getAudioDevices(async () => profileSetup.getAllAudioDevices())
  
  // PROFILE
  handle.saveProfile(async (_, p) => profileSetup.setProfile(p.data))
  handle.getProfiles(async () => profileSetup.getProfiles())
  handle.setDefaultProfile(async (_, id) => profileSetup.setDefault(id.data))
  handle.setProfileIcon(async (_, p) => profileSetup.setIcon(p.data.id, p.data.icon))
  handle.setProfileName(async (_, p) => profileSetup.setName(p.data.id, p.data.name))
  handle.setAutostart(async (_, p) => profileSetup.setAutostart(p.data.id, p.data.autostart))
  handle.deleteProfile(async (_, id) => {
    profileSetup.deleteProfile(id.data)
    gabin = undefined
  })

  // SHOTS
  handle.triggerShot(async (_, s) => gabin?.triggeredShot$.next(s.data))
  handle.toggleAvailableMic(async (_, m) => gabin?.toggleAvailableMic(m.data))
  handle.toggleAutocam(async (_, a) => gabin?.autocam$.next(a.data))

  // GABIN
  handle.togglePower(async (_, power) => {
      // init Gabin
      if (!gabin && power.data) {
          initGabin()
      }
      if (gabin) {
          gabin.power(power.data)
      }

      BrowserWindow.getAllWindows().forEach(bw => {
        invoke.handlePower(bw, power.data)
      })
  })
}

async function createWindow(): Promise<void> {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 768,
    minHeight: 550,
    show: false,
    title: 'Gabin',
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    ...(process.platform === 'linux'
      ? {
          icon: path.join(__dirname, '../../build/icon.png')
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (isDev()) mainWindow.webContents.openDevTools()

  // init db
  await db.connect()

  handler()

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // setTimeout(() => {
    //   invoke.simpleString(mainWindow, "")
    // }, 1000)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await createWindow()

  app.on('activate', async function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) await createWindow()
  })

})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
