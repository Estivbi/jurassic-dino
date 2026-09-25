// Muestra autor, licencia, origen, animaciones y tamaño de uno o varios GLB.
// Uso: node glbinfo.mjs modelo.glb [...]
import fs from 'node:fs'
import path from 'node:path'

for (const file of process.argv.slice(2)) {
  const buf = fs.readFileSync(file)
  if (buf.readUInt32LE(0) !== 0x46546c67) {
    console.log(`${path.basename(file)}: no es un GLB`)
    continue
  }
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'))
  const extras = json.asset?.extras ?? {}
  console.log(`\n=== ${path.basename(file)} (${(buf.length / 1e6).toFixed(2)} MB)`)
  console.log(`  título:   ${extras.title ?? '-'}`)
  console.log(`  autor:    ${extras.author ?? '-'}`)
  console.log(`  licencia: ${extras.license ?? '-'}`)
  console.log(`  origen:   ${extras.source ?? '-'}`)
  const anims = (json.animations ?? []).map((a) => a.name)
  console.log(`  mallas=${(json.meshes ?? []).length} imágenes=${(json.images ?? []).length} esqueletos=${(json.skins ?? []).length} animaciones=${anims.length} ${anims.slice(0, 6).join(', ')}`)
}
