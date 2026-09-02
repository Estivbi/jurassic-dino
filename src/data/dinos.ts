import type { DinoData } from '@ride-types/ride'

/**
 * Datos verificados con divulgación paleontológica estándar (Erickson, Sereno,
 * Holtz, Taylor & Wedel). Las cifras de peso en dinosaurios son siempre
 * estimaciones con rango amplio -- se marca con TODO donde una cifra concreta
 * necesitaría contrastarse con un paper específico antes de publicarse como
 * dato "cerrado".
 */
export const dinos: DinoData[] = [
  {
    id: 'velociraptor',
    name: 'Velociraptor',
    scientificName: 'Velociraptor mongoliensis',
    emoji: '🦖',
    period: 'Cretácico superior',
    yearsAgo: 'hace 75-71 millones de años',
    zoneId: 'jungla',
    color: '#8a6d3b',
    accent: '#f3b93f',
    stats: [
      { label: 'Altura a la cadera', value: '~0,5 m' },
      { label: 'Longitud', value: '~2 m (con cola)' },
      { label: 'Peso', value: '15-20 kg' }, // TODO: contrastar con estimación de masa más reciente (Paul, 2016)
      { label: 'Dieta', value: 'Carnívoro' },
      { label: 'Se encontró en', value: 'Desierto de Gobi, Mongolia' },
    ],
    funFacts: [
      'Tenía plumas. En serio. En 2007 se encontraron marcas de folículos de pluma en un cúbito fósil: por muy de reptil que suene su nombre, iba emplumado como un pavo gigante con muy mala leche.',
      'La garra curva del segundo dedo del pie no era para rajar como una navaja de cine: los estudios biomecánicos apuntan a que se usaba más bien para clavar y sujetar a la presa, tipo gancho de carnicero.',
      'Cazaba de noche o al atardecer: su cráneo tenía una estructura ocular compatible con buena visión con poca luz.',
    ],
    mythTitle: 'El mito: era del tamaño de una persona',
    myth: 'Todo el mundo se lo imagina como en la peli: un bicho a la altura de tu cintura, casi de tu estatura si se pone de puntillas.',
    truth: 'El Velociraptor real medía lo que un pavo grande, apenas medio metro a la cadera. El "tamaño de cine" que todos tenemos en la cabeza pertenece en realidad a su primo norteamericano, el Deinonychus, que sí rondaba el metro de altura. Rodney, si nos lees: el nombre lo hicieron sonar más grande a propósito.',
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    scientificName: 'Triceratops horridus',
    emoji: '🦕',
    period: 'Cretácico superior',
    yearsAgo: 'hace 68-66 millones de años',
    zoneId: 'llanura',
    color: '#5b7a5b',
    accent: '#9fd8a3',
    stats: [
      { label: 'Longitud', value: '8-9 m' },
      { label: 'Peso', value: '6-12 toneladas' }, // TODO: rango muy amplio según el estudio, acotar con fuente concreta
      { label: 'Dieta', value: 'Herbívoro' },
      { label: 'Cuernos', value: '3 (dos de ~1 m sobre los ojos)' },
      { label: 'Convivió con', value: 'El T-Rex, literalmente' },
    ],
    funFacts: [
      'Su nombre significa "cara con tres cuernos", que para ser sinceros es de los nombres científicos menos creativos... y más directos.',
      'El pico córneo cortaba plantas duras como cícadas y helechos, y las muelas en batería trituraban como una picadora vegetal industrial.',
      'Se han encontrado cráneos con marcas de mordisco de T-Rex curadas (cicatrizadas): sobrevivió al ataque. Le costó un cuerno, pero vivió para contarlo.',
    ],
    mythTitle: 'El mito: la gola era solo un escudo',
    myth: 'La gran placa ósea del cuello (la "gola") se suele explicar como una armadura para protegerse del mordisco del T-Rex, sin más.',
    truth: 'La ciencia actual apunta a que su función principal era de exhibición: reconocerse entre miembros de su especie, atraer pareja e impresionar a la manada, como una cornamenta de ciervo a lo bestia. Tenía vasos sanguíneos y quizás hasta color vivo. Que además sirviera de escudo de refilón, vale, pero no era su trabajo principal.',
  },
  {
    id: 'brachiosaurus',
    name: 'Brachiosaurus',
    scientificName: 'Brachiosaurus altithorax',
    emoji: '🦕',
    period: 'Jurásico superior',
    yearsAgo: 'hace 154-150 millones de años',
    zoneId: 'laguna',
    color: '#3f6b8a',
    accent: '#8fd7e8',
    stats: [
      { label: 'Altura', value: '~13 m (a la cabeza)' },
      { label: 'Longitud', value: '18-21 m' },
      { label: 'Peso', value: '~35-40 toneladas' }, // TODO: estimaciones van de 28 a 58 t según método
      { label: 'Dieta', value: 'Herbívoro (copas de árboles)' },
      { label: 'Se encontró en', value: 'Formación Morrison, EE. UU.' },
    ],
    funFacts: [
      'A diferencia de la mayoría de saurópodos, tenía las patas delanteras más largas que las traseras: de ahí el nombre, "lagarto de brazos".',
      'Sus fosas nasales estaban en lo alto del cráneo. Durante décadas eso hizo pensar que usaba la nariz como snorkel; hoy se sabe que era puramente terrestre.',
      'Para bombear sangre hasta esa cabeza tan alta necesitaba un corazón descomunal y una tensión arterial que haría palidecer a cualquier cardiólogo.',
    ],
    mythTitle: 'El mito: vivía metido en pantanos',
    myth: 'Los primeros dibujos de principios del siglo XX lo mostraban medio sumergido en un lago, usando el agua para "flotar" su enorme peso.',
    truth: 'La presión del agua sobre una caja torácica tan grande le habría impedido literalmente respirar bajo un par de metros de profundidad: se le habrían colapsado los pulmones. Las patas robustas tipo columna y las huellas fósiles confirman que era un bicho de tierra firme, un gigante de pastoreo en llanuras y bosques abiertos, no un hipopótamo prehistórico.',
  },
  {
    id: 't-rex',
    name: 'Tyrannosaurus rex',
    scientificName: 'Tyrannosaurus rex',
    emoji: '🦖',
    period: 'Cretácico superior (Maastrichtiense)',
    yearsAgo: 'hace 68-66 millones de años',
    zoneId: 'rocosa',
    color: '#7a3b3b',
    accent: '#f36b3f',
    stats: [
      { label: 'Longitud', value: '~12-13 m' },
      { label: 'Altura a la cadera', value: '~4 m' },
      { label: 'Peso', value: '~8-9 toneladas' }, // TODO: rango citado 5,4-9,5 t según el fósil y método
      { label: 'Mordida', value: 'Una de las más fuertes conocidas' },
      { label: 'Dieta', value: 'Carnívoro (y carroñero ocasional)' },
    ],
    funFacts: [
      'Sus dientes no eran cuchillas finas: eran gruesos como plátanos y podían triturar hueso, no solo carne. Se han encontrado excrementos fósiles llenos de fragmentos óseos que lo confirman.',
      'Los brazos cortos eran diminutos, sí, pero nada débiles: tenían la fuerza suficiente para levantar bastante peso pese al tamaño ridículo que se les suele achacar en broma.',
      'Algunos parientes cercanos y crías de tiranosáurido tenían plumón, así que es probable que un T-Rex joven fuera bastante más "peludo" de lo que imaginamos. TODO: matizar según los últimos hallazgos de impresiones de piel en ejemplares adultos.',
    ],
    mythTitle: 'El mito: solo veía lo que se movía',
    myth: 'La frase de la película lo dejó grabado a fuego: "su visión se basa en el movimiento", así que quedarte quieto te salvaba.',
    truth: 'Es justo al revés. Sus ojos, orientados hacia delante como los de un águila o un humano, le daban visión binocular y cálculo de profundidad de primer nivel: se estima que veía mejor que un halcón. Quedarte inmóvil frente a un T-Rex no te habría salvado ni un segundo. Toca correr (en zigzag, por si acaso).',
  },
]

export const totalStops = dinos.length
