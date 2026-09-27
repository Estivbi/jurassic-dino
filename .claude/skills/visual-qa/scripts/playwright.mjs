// Carga Playwright desde el proyecto o, si no está, desde la instalación global del contenedor.
export async function loadChromium() {
  let pw
  try {
    pw = await import('playwright')
  } catch {
    pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
  }
  const executablePath = process.env.CHROMIUM_PATH || undefined
  return pw.chromium.launch(executablePath ? { executablePath } : {})
}
