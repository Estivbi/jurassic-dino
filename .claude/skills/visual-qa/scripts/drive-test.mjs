// Prueba de conducción: acelera, gira, intenta entrar en el lago y choca con un dinosaurio.
// Uso: node drive-test.mjs [url]
import { loadChromium } from './playwright.mjs'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await loadChromium()
const page = await browser.newPage({ viewport: { width: 480, height: 300 } })
page.setDefaultTimeout(180000)
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(`${url}?calidad=baja`)
await page.getByRole('button', { name: /Arrancar/ }).click()
await page.waitForFunction(() => window.__gameScene, null, { timeout: 60000 })
await page.waitForTimeout(6000)
const state = () => page.evaluate(() => ({ ...window.__gameScene.getVehicleState(), speed: window.__gameScene.vehicle.speed }))

const s0 = await state()
await page.keyboard.down('KeyW')
await page.waitForTimeout(5000)
await page.keyboard.down('KeyA')
await page.waitForTimeout(2500)
await page.keyboard.up('KeyA')
await page.keyboard.up('KeyW')
const s1 = await state()

// El lago está en (84, 84) con radio 30: el jeep debe quedarse en la orilla.
await page.evaluate(() => window.__gameScene.teleport(84, 44, 0))
await page.keyboard.down('KeyW')
await page.waitForTimeout(7000)
await page.keyboard.up('KeyW')
const s2 = await state()

// Choque frontal a 15 m/s contra un Triceratops: debe rebotar.
await page.evaluate(() => {
  const g = window.__gameScene
  const d = g.dinoInstances.find((x) => x.id === 'triceratops')
  g.teleport(d.group.position.x, d.group.position.z + d.radius + 12, Math.PI)
  g.vehicle.speed = 15
})
await page.waitForTimeout(4000)
const s3 = await state()

console.log('inicio', JSON.stringify(s0))
console.log('tras conducir', JSON.stringify(s1), 'recorrido', Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(1), 'm')
console.log('lago: distancia al centro', Math.hypot(s2.x - 84, s2.z - 84).toFixed(1), '(>= ~30 es orilla)')
console.log('choque: velocidad tras el golpe', s3.speed.toFixed(2), '(negativa = rebotó)')
console.log(errors.length ? errors.join('\n') : 'sin errores')
await browser.close()
