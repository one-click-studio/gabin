import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: resolve(__dirname, '../../build/main/render'),
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@src': resolve(__dirname, 'src'),
    }
  },
  plugins: [vue(), Unocss()]
})
