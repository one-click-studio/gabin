import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge } from 'electron'
import { exposeApiToGlobalWindow } from '@src/common/ipcs'

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