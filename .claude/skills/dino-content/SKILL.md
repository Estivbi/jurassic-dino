---
name: dino-content
description: Cómo redactar y revisar el contenido educativo del parque (fichas de especies, mitos, quiz, carteles de zona y curiosidades del cielo) con datos contrastados y el tono del proyecto. Úsala al añadir o editar cualquier texto de src/data/dinos.ts o src/data/education.ts.
---

# Contenido educativo

## Rigor

- Solo datos que puedas respaldar con divulgación de referencia (museos de historia
  natural, Smithsonian, Holtz 2007) o con el artículo original. Si dudas de una cifra,
  no la pongas.
- Las masas y longitudes de dinosaurios son **estimaciones**: da rangos
  ("6-9 t (estimación)") y no una cifra cerrada.
- Distingue siempre dinosaurio de lo que no lo es (reptiles marinos, pterosaurios):
  `isDinosaur: false` y dilo en el texto.
- Nunca dejes TODO, notas internas ni bromas privadas en textos que ve el usuario.

## Estructura de una ficha (`DinoData`)

- `period` y `yearsAgo` coherentes entre sí.
- `stats`: 5 datos cortos (longitud, peso, dieta, rasgo llamativo, dónde se encontró).
- `funFacts`: 3 curiosidades concretas, con nombre, lugar o fecha si se puede.
- `mythTitle` + `myth` + `truth`: un mito extendido (a menudo de las películas) y lo que
  dice la ciencia actual.
- `quiz`: una pregunta con 3 opciones plausibles, `answer` (índice) y `explanation`
  breve que enseñe algo además de dar la solución.

## Tono

Español de España, cercano y divertido pero sin sacrificar la precisión. Frases cortas,
pensadas para leer en el móvil. Unidades del SI con coma decimal ("~1,6 m").
