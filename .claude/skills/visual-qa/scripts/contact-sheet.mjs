// Junta varias capturas en una sola imagen para revisarlas de un vistazo.
// Uso: node contact-sheet.mjs salida.png columnas ancho alto img1.png img2.png ...
import fs from 'node:fs'
import path from 'node:path'
import { loadChromium } from './playwright.mjs'

const [out, cols, w, h, ...files] = process.argv.slice(2)
const imgs = files
  .filter((f) => fs.existsSync(f))
  .map((f) => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" width="${w}" height="${h}" title="${path.basename(f)}">`)
const html = `<html><body style="margin:0;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:2px;background:#000">${imgs.join('')}</body></html>`
const browser = await loadChromium()
const page = await browser.newPage({ viewport: { width: cols * (+w + 2), height: +h } })
await page.setContent(html)
await page.screenshot({ path: out, fullPage: true })
await browser.close()
console.log(out)
