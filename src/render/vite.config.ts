import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
  },  
  resolve: {
    alias: {
      '@src': resolve(__dirname, 'src'),
    }
  },
  plugins: [vue(), Unocss()]
})
