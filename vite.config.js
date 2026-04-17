import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        strategy: resolve(__dirname, 'strategy.html'),
        guide: resolve(__dirname, 'guide.html'),
        notice: resolve(__dirname, 'notice.html'),
        insta: resolve(__dirname, 'insta.html'),
      }
    }
  }
})
