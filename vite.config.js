import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const blogDir = resolve(__dirname, 'blog')
const blogInputs = {}
if (fs.existsSync(blogDir)) {
  for (const file of fs.readdirSync(blogDir)) {
    if (!file.endsWith('.html')) continue
    if (file.startsWith('template-')) continue
    const name = `blog-${file.replace(/\.html$/, '')}`
    blogInputs[name] = resolve(blogDir, file)
  }
}

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
        ...blogInputs,
      }
    }
  }
})
