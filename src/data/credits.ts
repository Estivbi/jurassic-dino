export interface Credit {
  what: string
  title: string
  author: string
  license: string
  licenseUrl: string
  source: string
  /** Cambios que se han hecho sobre el original (obligatorio indicarlo en CC BY). */
  changes?: string
}

const CC_BY_4 = { license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' }
const OPTIMIZED = 'Optimizado para web: malla simplificada/comprimida y texturas reducidas a WebP.'

/** Atribuciones de todos los recursos de terceros que usa el parque. */
export const credits: Credit[] = [
  { what: 'Tyrannosaurus rex', title: 'Tyrant King - Tyrannosaurus', author: 'Marcel Schanz', ...CC_BY_4, source: 'https://sketchfab.com/3d-models/tyrant-king-tyrannosaurus-6465a297fa784598adc49f6e0042d449', changes: OPTIMIZED },
  { what: 'Velociraptor', title: 'Dinosaur', author: 'MrTomas', ...CC_BY_4, source: 'https://sketchfab.com/3d-models/dinosaur-38e1ae4d19cb417eb78a034ee7786e06', changes: OPTIMIZED },
  { what: 'Triceratops', title: 'Triceratops dinosaur', author: 'wojciechmiedziocha', ...CC_BY_4, source: 'https://sketchfab.com/3d-models/triceratops-dinosaur-87527079bad44917ab1b98a456b46c7e', changes: OPTIMIZED },
  { what: 'Brachiosaurus', title: 'Brachiosaurus altithorax', author: 'IagoMendez', ...CC_BY_4, source: 'https://sketchfab.com/3d-models/brachiosaurus-altithorax-c987f8cbfb7a4657af49eaa0998addec', changes: OPTIMIZED },
  { what: 'Spinosaurus', title: 'Spinosaurus_animation', author: 'seirogan', ...CC_BY_4, source: 'https://sketchfab.com/3d-models/spinosaurus-animation-c11709dbf9e3472f9533343f1f342564', changes: OPTIMIZED },
  { what: 'Baryonyx', title: 'Baryonyx', author: 'kenchoo', ...CC_BY_4, source: 'https://sketchfab.com/3d-models/baryonyx-85bbdc8c20bc4bdbb42380227f838f4b', changes: OPTIMIZED },
  { what: 'Argentinosaurus', title: 'Argentinosaurus Accurate', author: 'Saurus', ...CC_BY_4, source: 'https://sketchfab.com/3d-models/argentinosaurus-accurate-08754d19e7784614a3c00bea6f1505f8', changes: OPTIMIZED },
  { what: 'Megalosaurus', title: 'Megalosaurus', author: 'dinoguy263allo', ...CC_BY_4, source: 'https://sketchfab.com/3d-models/megalosaurus-fb2913237a764519ae0a06241b6e4602', changes: OPTIMIZED },
  { what: 'Pistosaurus', title: 'Pistosaur Animated', author: 'ricksticky', ...CC_BY_4, source: 'https://sketchfab.com/3d-models/pistosaur-animated-773667575a264c7baa4ec404115a044b', changes: OPTIMIZED },
  {
    what: 'Árboles (generador) y rocas, texturas de suelo y hojas',
    title: 'EZ-Tree',
    author: 'Daniel Greenheck',
    license: 'MIT',
    licenseUrl: 'https://github.com/dgreenheck/ez-tree/blob/main/LICENSE',
    source: 'https://github.com/dgreenheck/ez-tree',
    changes: 'Árboles generados con EZ-Tree y exportados a glTF; texturas convertidas a WebP.',
  },
  { what: 'Textura de corteza de pino', title: 'Pine bark', author: 'TextureCan', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://www.texturecan.com/details/588/' },
  { what: 'Textura de corteza de roble', title: 'Bark Brown 02', author: 'Poly Haven', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://polyhaven.com/a/bark_brown_02' },
  {
    what: 'Cielo físico, agua reflectante, textura de la Luna y del agua',
    title: 'three.js (Sky, Water y texturas de ejemplo)',
    author: 'Autores de three.js',
    license: 'MIT',
    licenseUrl: 'https://github.com/mrdoob/three.js/blob/dev/LICENSE',
    source: 'https://github.com/mrdoob/three.js',
  },
  {
    what: 'Catálogo de estrellas y constelaciones',
    title: 'd3-celestial (datos del catálogo Yale Bright Star / Hipparcos)',
    author: 'Olaf Frohn',
    license: 'BSD-3-Clause',
    licenseUrl: 'https://github.com/ofrohn/d3-celestial/blob/master/LICENSE',
    source: 'https://github.com/ofrohn/d3-celestial',
    changes: 'Estrellas hasta magnitud 5,5 y líneas de constelaciones, reducidas a un JSON compacto.',
  },
  {
    what: 'Posición del Sol y de la Luna',
    title: 'SunCalc',
    author: 'Volodymyr Agafonkin',
    license: 'BSD-2-Clause',
    licenseUrl: 'https://github.com/mourner/suncalc/blob/master/LICENSE',
    source: 'https://github.com/mourner/suncalc',
  },
]
