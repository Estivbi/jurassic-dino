// Capturas del parque con Playwright.
// Uso: node shots.mjs [--time ISO] [--calidad baja|alta] [--out dir] [--label nombre]
//                     [--mobile] [--constelaciones] [vista ...]
// Vistas: d-<especie>:<dist>  (jeep mirando al animal)
//         c-<especie>:<dist>  (cámara libre hacia el animal)
//         v-x,y,z,tx,ty,tz    (cámara libre desde/hacia)
//         moon                (cámara hacia la Luna)
import fs from 'node:fs'
import { loadChromium } from './playwright.mjs'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  if (i < 0) return def
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const flag = (name) => {
  const i = args.indexOf(`--${name}`)
  if (i < 0) return false
  args.splice(i, 1)
  return true
}
const time = opt('time', null)
const calidad = opt('calidad', 'baja')
const out = opt('out', 'shots')
const label = opt('label', 'shot')
const url = opt('url', 'http://localhost:5173/')
const mobile = flag('mobile')
const constellations = flag('constelaciones')
const views = args
fs.mkdirSync(out, { recursive: true })

const browser = await loadChromium()
const ctx = await browser.newContext({
  viewport: mobile ? { width: 390, height: 844 } : { width: 960, height: 540 },
  isMobile: mobile,
  hasTouch: mobile,
  geolocation: { latitude: 40.4168, longitude: -3.7038 },
  permissions: ['geolocation'],
  timezoneId: 'Europe/Madrid',
})
const page = await ctx.newPage()
page.setDefaultTimeout(180000)
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  // El proxy del contenedor corta las fuentes de Google: no es un error del juego.
  if (m.type() === 'error' && !m.text().includes('ERR_CERT') && !m.text().includes('fonts.g')) errors.push(m.text().slice(0, 300))
})
if (time) await page.clock.setFixedTime(new Date(time))
await page.goto(`${url}?calidad=${calidad}`)
await page.getByRole('button', { name: /Arrancar/ }).click()
await page.waitForFunction(() => window.__gameScene, null, { timeout: 60000 })
await page.waitForTimeout(12000)
if (constellations) {
  await page.locator('button[aria-expanded]').first().click()
  await page.getByLabel(/Mostrar constelaciones/).check()
  await page.waitForTimeout(800)
}
await page.screenshot({ path: `${out}/${label}-start.png` })

for (const v of views) {
  const [name, a] = v.split(':')
  await page.evaluate(
    ([name, a]) => {
      const g = window.__gameScene
      if (name.startsWith('d-')) {
        g.setDebugView(null)
        const p = g.getDinoPosition(name.slice(2))
        const d = +(a || 14)
        const jx = p.x + d * 0.6
        const jz = p.z + d * 0.8
        g.teleport(jx, jz, Math.atan2(p.x - jx, p.z - jz))
      } else if (name.startsWith('c-')) {
        const p = g.getDinoPosition(name.slice(2))
        const d = +(a || 14)
        g.setDebugView([p.x + d * 0.7, p.y + d * 0.3, p.z + d * 0.7], [p.x, p.y + d * 0.12, p.z])
      } else if (name === 'moon') {
        const st = g.clock.getState()
        const s = g.getVehicleState()
        g.setDebugView([s.x, s.y + 2, s.z], [s.x + st.moonDir[0] * 50, s.y + 2 + st.moonDir[1] * 50, s.z + st.moonDir[2] * 50])
      } else if (name.startsWith('v-')) {
        const n = name.slice(2).split(',').map(Number)
        g.setDebugView(n.slice(0, 3), n.slice(3, 6))
      }
    },
    [name, a],
  )
  await page.waitForTimeout(2500)
  // Cierra carteles de zona para que no tapen la vista.
  await page.evaluate(() => document.querySelectorAll('[aria-label="Cerrar cartel"]').forEach((b) => b.click()))
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${out}/${label}-${name.replace(/[^\w-]/g, '_')}.png` })
}

const info = await page.evaluate(() => {
  const r = window.__gameScene.renderer.info.render
  return { calls: r.calls, triangles: r.triangles }
})
console.log(label, JSON.stringify(info))
console.log(errors.length ? errors.join('\n') : 'sin errores')
await browser.close()
