import type { ZoneId } from '@ride-types/ride'

export interface ZoneInfo {
  id: ZoneId
  title: string
  subtitle: string
  text: string
}

/** Carteles que aparecen al entrar en cada zona del parque. */
export const zoneInfo: Record<ZoneId, ZoneInfo> = {
  jungla: {
    id: 'jungla',
    title: 'Bosque de coníferas',
    subtitle: 'Flora del Jurásico',
    text: 'Araucarias, pinos primitivos, helechos arborescentes y cícadas formaban los bosques de los dinosaurios. Las plantas con flor aún no existían: aparecieron en el Cretácico, hace unos 130 millones de años.',
  },
  llanura: {
    id: 'llanura',
    title: 'Llanura de helechos',
    subtitle: 'Sin praderas de hierba',
    text: 'En casi todo el Mesozoico no había praderas: el suelo lo cubrían helechos, colas de caballo y cícadas. La hierba ya existía al final del Cretácico (se han encontrado restos en excrementos fósiles de saurópodos de la India), pero era rara.',
  },
  rocosa: {
    id: 'rocosa',
    title: 'Cañones rocosos',
    subtitle: 'Donde aparecen los fósiles',
    text: 'Los fósiles se forman en rocas sedimentarias como la arenisca o la lutita. Cuando la erosión excava cañones, como en Utah, la Patagonia o Teruel, los huesos quedan al descubierto.',
  },
  laguna: {
    id: 'laguna',
    title: 'La laguna',
    subtitle: 'Pescadores del Cretácico',
    text: 'Ríos y lagos atraían a todo tipo de animales. Los espinosáuridos, como Spinosaurus y Baryonyx, eran pescadores. Lo que nada en el agua no es un dinosaurio: Pistosaurus es un reptil marino.',
  },
}

/** Curiosidades sobre el cielo que el panel del cielo va rotando. */
export const skyFacts: string[] = [
  'El Sol y la Luna que ves están calculados para tu ubicación y tu hora reales.',
  'La Luna se aleja de la Tierra unos 3,8 cm cada año: en tiempos de los dinosaurios estaba algo más cerca.',
  'Hace 70 millones de años el día duraba unas 23 horas y media: la Tierra giraba más rápido.',
  'Las estrellas también se mueven: en 66 millones de años las constelaciones han cambiado por completo. Un T. rex no veía la Osa Mayor.',
  'La fase lunar sale sola: la cara iluminada de la Luna es la que mira al Sol.',
  'Los dinosaurios vivieron unos 165 millones de años. Los humanos llevamos unos 300.000.',
]
