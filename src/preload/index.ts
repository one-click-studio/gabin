import { Color, Titlebar } from 'custom-electron-titlebar'
import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge } from 'electron'
import { exposeApiToGlobalWindow } from '@src/common/ipcs'

if (process.platform !== 'darwin') {
  // setup custom titlebar
  window.addEventListener('DOMContentLoaded', () => {
    // eslint-disable-next-line no-new
    new Titlebar({
      backgroundColor: Color.fromHex('#000'),
      enableMnemonics: true,
      // @ts-ignore
      menu: null,
    })
  })
}

// Custom APIs for renderer
const { api } = exposeApiToGlobalWindow({
  exposeAll: true, // expose handlers, invokers and removers
})

contextBridge.exposeInMainWorld('electron', electronAPI)

declare global {
  interface Window {
    electron: typeof electronAPI
    api: typeof api
  }
}