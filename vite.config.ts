import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const root = import.meta.dirname

/**
 * Las vistas previas de redes sociales necesitan URLs absolutas. En Vercel se usa el dominio
 * de producción del proyecto; se puede forzar otro con SITE_URL (p. ej. al comprar dominio).
 */
function siteUrl(): string {
  const explicit = process.env.SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return vercel ? `https://${vercel}` : ''
}

const injectSiteUrl: Plugin = {
  name: 'inject-site-url',
  transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl()),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), injectSiteUrl],
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
    sourcemap: true,
  },
})
