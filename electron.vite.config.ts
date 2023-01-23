import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'

console.log(__dirname)

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@src': resolve(__dirname, 'src'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@src': resolve(__dirname, 'src'),
      },
    },
  },
  renderer: {
    define: {
      '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
    },  
    resolve: {
      alias: {
        '@src': resolve(__dirname, 'src'),
      }
    },
    plugins: [vue(), Unocss()]
  }
})
