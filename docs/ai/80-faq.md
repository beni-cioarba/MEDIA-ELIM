# 80 · Întrebări frecvente (preguntas frecuentes)

> Lee este shard antes de tocar **`/intrebari-frecvente`**, la franja de la
> portada, las preguntas de `/invitati` o sus textos. Hecho el 24/11/2026.

## Qué es

Módulo propio con **todas** las preguntas (25, en cinco temas). Hasta ahora sólo
existían once, escondidas al final de `/invitati` (fuera del menú, `noindex`).

| Dónde sale | Qué enseña | De dónde sale la lista |
| --- | --- | --- |
| `/intrebari-frecvente` (menú «Biserica», indexable) | Todas, por temas, con buscador | `FAQ_GROUPS` |
| `/intrebari-frecvente#<id>` | Esa pregunta, abierta | ancla = id |
| Portada, última franja | 6 en escritorio, 4 en el teléfono | `HOME_FAQ` |
| `/invitati` → «Întrebări» | Las 11 de siempre + «Toate întrebările» | `GUEST_FAQ` (`guests.config.ts`) |
| Buscador de la cabecera | Cada una, con su ancla | `faq.search.ts` |
| Contact | Enlace junto al formulario | — |

| Pieza | Fichero |
| --- | --- |
| Estructura (temas, orden, enlaces) | `core/faq.config.ts` |
| Textos (`q` pregunta, `a` respuesta, `k` sinónimos) | `assets/i18n/faq.{ro,es}.json` (paquete `faq`, no arranque) |
| Datos vivos de las respuestas (`{{sunday}}`, `{{address}}`, `{{name}}`…) | `features/faq/public/faq-params.service.ts` |
| Lista desplegable (la única) | `features/faq/public/faq-list/` |
| Franja de la portada | `features/faq/public/faq-teaser/` (`@defer (on viewport)`) |
| Página | `features/faq/faq.component.*` |

## Receta: una pregunta más

1. `core/faq.config.ts`: `{ id: 'wifi' }` en su tema, con `actions` si lleva a
   algún sitio (página, Google Maps, YouTube, llamar, WhatsApp).
2. `faq.ro.json` **y** `faq.es.json`: `faq.items.wifi.{q,a,k}`. Los sinónimos (`k`)
   los usan el buscador de la página y el de la cabecera. Rótulo de enlace
   nuevo: `faq.actions.<label>`.

Con eso sale en la página y en los buscadores. `faq.config.spec.ts` comprueba
textos, enlaces, ids y que no queden textos huérfanos.

**Nada se inventa**: una pregunta se publica si la respuesta la ha dado la
iglesia o ya está en otra página. Las horas, la dirección y el pastor **no se
escriben** en el texto: van como parámetro. Si el horario deja de ser el mismo de
lunes a viernes, un test avisa (`schedule` lo da por hecho).

## Decisiones

- **En la portada, una franja y no la lista.** Medido: la portada ya mide
  3.772 px a 1440 y 5.472 a 375 (6,7 pantallas). Las once preguntas a 60 px
  serían otra pantalla. La franja son 225 px (+6 %) y ~402 px (+7 %), y se
  responde ahí mismo. Sólo lo que no contesta otra sección de la portada
  (idioma, avisar, niños, duración, aparcar, ropa); el resto, en la página.
- **Dos columnas seguidas** (`splitColumns`): se lee una entera y luego la otra,
  así que el orden de pantalla es el del teclado, y abrir una respuesta no mueve
  la otra columna. El corte lo decide el número de preguntas. CSS `columns` no:
  reequilibra al abrir y las preguntas saltarían de columna.
- **Fila de 52 px** (antes 60 en Invitați), nunca menos de 48.
- **Lo práctico arriba** (próximo culto, dirección, teléfono, directo): es la
  respuesta que más se busca y no hay que abrir nada. Al buscar se quita.
- **Buscador**: pregunta + respuesta + sinónimos, sin diacríticos y por raíz
  (`core/search/search-text`). El nombre del tema no cuenta («botez» traería las
  cuatro de «Credință și botez»). Con tres resultados o menos, se abren.
- **`<details>` nativo**: el «buscar en la página» del navegador lo abre y el
  HTML prerenderizado lleva todas las respuestas. El alto se anima con
  `interpolate-size` donde existe; si no, abre sin animación.
- **Enlaces directos que se suman** (`targets`): cerrar la anterior movería la
  página justo mientras el router baja a la nueva.
- **Copiar el enlace** de una respuesta (con su idioma): para contestar por
  WhatsApp. Sólo en la página.
- **Abrir / cerrar todas** (26/11/2026): uno general, **con texto**, al final
  de la fila de temas (sólo `≥ sm`: en el teléfono esa fila se desliza y cada
  tema ya lleva el suyo), y uno por tema (si tiene más de una pregunta) **sólo
  icono** (`unfold` / `fold`, dos flechas que se separan o se juntan), centrado
  sobre la columna de las flechas de las preguntas; su texto va en `title` y
  `aria-label` («Deschide toate: Prima vizită»). Al principio los dos eran el
  mismo rótulo y, en la columna derecha, quedaban uno encima de otro: se leía
  como un error. Alterna: si están todas abiertas, «Închide toate».
  El estado se lee de los `<details>` (`toggle` en captura y tras cada cambio
  de lo visible), así cuenta lo abierto a mano, por enlace o al buscar.
  `aria-expanded` en el botón; el del tema lleva su nombre para el lector.
- Sin `FAQPage` (JSON-LD): Google sólo da ese resultado enriquecido a webs
  sanitarias y de la administración.

## Verificado (24/11/2026)

`npm run check` (361 + 85 tests) y `ng build`: inicial 493,6 kB (sin cambio) y
la página prerenderizada. Sin scroll horizontal ni textos cortados en 320 · 360 ·
375 · 414 · 600 · 719 · 768 · 860 · 1024 · 1280 · 1440 · 1920. El pie a 1280 en
español pasa a 391 px: «Preguntas frecuentes» ensancha la columna y la dirección
se parte en dos líneas, como preveía `15-navigation.md`.

## Pendiente de la iglesia (no se publica hasta que lo confirmen)

Bodas y funerales · presentación de niños · cómo hacerse miembro · Wi-Fi para
invitados · consejería (cuándo y con quién) · transporte para quien no tiene
coche · edades del programa de niños.
