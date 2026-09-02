import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@scene': path.resolve(root, 'src/scene'),
      '@components': path.resolve(root, 'src/components'),
      '@data': path.resolve(root, 'src/data'),
      '@assets': path.resolve(root, 'src/assets'),
      '@hooks': path.resolve(root, 'src/hooks'),
      '@ride-types': path.resolve(root, 'src/types'),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
})
