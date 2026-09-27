import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fuentes alojadas en el propio sitio: ninguna petición a Google (ni a nadie más) al cargar.
import '@fontsource/archivo/400.css'
import '@fontsource/archivo/500.css'
import '@fontsource/archivo/600.css'
import '@fontsource/archivo/700.css'
import '@fontsource/bevan/400.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
