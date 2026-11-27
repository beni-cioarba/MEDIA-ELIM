# 39 · Departamente

> Lee este shard si vas a **añadir un departamento, cambiar su contenido o
> tocar la invitación a la masa de tineret** (o el enlace a ADM-TINERET).

## Qué hay (09/10/2026)

| Ruta                          | Componente                     | Qué es |
| ----------------------------- | ------------------------------ | ------ |
| `/departamente`               | `DepartmentsHomeComponent`     | Portada propia: cabecera con cifras, acceso rápido, mosaico de fotos e «Implícate» |
| `/departamente/<slug>`        | `DepartmentPageComponent`      | Una plantilla para todos: portada (carrusel si hay `heroSlides`, fija si no), acceso rápido, contenido + lateral |

Slugs (`DEPARTMENT_SLUGS`, `app-paths.ts`): `tineret` · `fanfara` · `cor` ·
`misiune-externa` · `ajutorare` · `evanghelizare`. Una ruta por departamento
(`departmentRoute()` en `app.routes.ts`), no `:slug`: así cada una lleva su
título y descripción SEO; componente y chunk son el mismo.

**No usa `NavHubComponent`**: aquí cada entrada es un ministerio con cara
propia y un mosaico de fotos dice más que una lista de filas.

## Ficheros

```
core/departments.config.ts      ⭐ DEPARTMENTS (estructura, módulos, crónicas) + YOUTH_MEAL_APP (la app hermana)
core/util/monthly-recurrence.ts    «n-ésimo día de la semana del mes» (próximas fechas, BYDAY del .ics)
assets/i18n/departments.{ro,es}.json  Paquete de textos largos (resolver en las rutas del módulo)
assets/video/                      Vídeos propios + su portada (fuera de la caché de la PWA)
features/departments/
  _departments.scss                Mixins de la línea: tech-grid, gold-edge, cta-gold, cta-glass
  department.view.ts               Responsables derivados del organigrama
  departments-home/                Portada /departamente
  department-page/                 Página de un departamento
  dept-switcher/                   Acceso rápido: pestañas de texto (sin iconos desde el 19/11/2026) fijas bajo la cabecera (36 px, `--dept-switcher-h`); «Toate» separada por un filete
  meeting/                         Reunión fija semanal o mensual (`app-meeting-block`) + hueco para su pieza propia
  ticket/                          Billete de la próxima fecha (`app-date-ticket`), común a las reuniones
  stories/                         Crónicas: texto + reel vertical + mosaico (galería del visor) + resumen de predicación (sermon-notes)
  youth-meal/                      Invitación «Rămâi la masă» (texto + fotos, sin datos)
  departments-translations.resolver.ts  Carga el paquete de textos
layout/top-nav/departments-aside.component.ts   Destacado del panel de escritorio (@defer)
```

Textos: en `es.json`/`ro.json` sólo `departments.<id>.{name,tagline}`,
`departments.home.eyebrow` y `departments.meets` (los usan menú, cajón y
panel de la cabecera); **todo lo demás** en el paquete
`departments.{ro,es}.json` (~18 kB por idioma), que carga
`departmentsTranslationsResolver` en `/departamente` y sus páginas
(convención de «Textos largos de una sola página», `20-content-i18n.md`).
`npm run i18n:check` lo comprueba. La vista previa del gesto de deslizar
ejecuta también los `resolve` de la ruta vecina (`PagePreviewService.warm`):
sin eso `/departamente` asomaba con claves en crudo.
Los de 09/10/2026 son **provisionales** (TODO(iglesia): que cada
departamento revise los suyos). Versículos: Cornilescu (ro) y RVR1960 (es).

## Receta: departamento nuevo

1. `DEPARTMENT_SLUGS` → `id: 'slug'` (el compilador exige el resto).
2. `DEPARTMENTS` → entrada: `icon`, `cover?` (sin foto = navy con el icono),
   `leadership?` (id del departamento en `SERVICE_AREAS`: los responsables
   salen de ahí, no se escriben), `weeklyProgramId?`, `pillars`,
   `activities`, `modules`.
3. `MAIN_NAV` → hijo `dept-<id>` del grupo `departments`.
4. Textos `departments.<id>.{name,tagline,intro,pillars.*,activities.*,verse,join}`
   y `nav.dept_<id>_desc`, en los dos idiomas.

Nada más: ruta, mosaico, acceso rápido, panel, cajón, pie y resumen vivo
salen solos. El mosaico es rejilla (destacado 2 × 2 desde `lg`; la última
celda suelta se estira entre `sm` y `lg`).

## Portada en carrusel — todos los departamentos (09–10/10/2026)

**Todos** usan la portada de inicio (`app-hero-carousel`); la portada fija
antigua se eliminó. Sin fotos (`heroSlides` vacío: Misiune externă), la misma
portada a pantalla completa en navy con el icono del departamento en grande.
«Qué hacemos» va justo tras «Quiénes somos» (presentación) y antes de
reuniones y crónicas; en Tineret sólo lo que no cuentan sus bloques
(alabanza, conferencias, tabere), en 3 columnas (`acts--three`).
Hoy: Tineret 7 fotos · Cor 2 (cor, colinde) · Evanghelizare 3 (colinde,
candidații, botez) · Fanfara 1 · Ajutorare 1 · Misiune 0. Chip de «lo
próximo»: reunión fija más cercana **o** evento del departamento
(`#meet-<key>` / `#events`). Acciones: la propia («Vino vineri») o «Vreau să mă
implic» + «Fotografii și momente» (`#stories`) o «Toate departamentele».
**Sin migaja de pan** en todo el grupo (`noBreadcrumb` en `MAIN_NAV`): la
portada ya dice dónde se está; el carrusel ocupa `100svh − cabecera`, como
el de inicio. `cover` queda sólo para las miniaturas (mosaico y panel).

### Detalle (09/10/2026)

Un departamento con `heroSlides` usa **el mismo `app-hero-carousel` de la
portada de inicio**: pantalla completa, Ken Burns, fundido, barra de
progreso, pausa / anterior / siguiente, contador y rótulo
(`departments.<id>.hero.slides.<i18nKey>`, input `captionPrefix`). Contenido
proyectado idéntico al del inicio —chip de «lo próximo» (en marcha / hoy con
cuenta atrás / día), titular, subtítulo, botones— desde
`shared/styles/_hero-content.scss` (movido tal cual de `home.component.scss`,
lo usan los dos). Sin rótulo sobre el titular (14/10/2026: se quitó «Departament · Biserica Elim» con su icono). El chip
elige la reunión fija más cercana (semanal o mensual) y enlaza a su bloque
(`#meet-<key>`). La migaja de pan se descuenta con `--hero-offset` (input
CSS del carrusel, 0 por defecto: **el alto del inicio no cambia**). Los datos
clave pasan a una franja navy bajo el carrusel. Mejor apaisadas; una
vertical entra con un `focus` que deje a las personas en el marco (≈ 2,2 : 1
en escritorio; comprobado a 1440). Tineret (7): alabanza del tineret, «Înainte să spui „DA”» (sala) + ANCORAT
(sala, alabanza, cântare, predică, interviu).
Sin `heroSlides`: portada fija con `cover` (el resto, de momento).

## Módulos (`DepartmentModule`)

Unión discriminada: cada `kind` es una pieza que la página sabe pintar.

- `weekly` → encuentro semanal (`weeklyProgramId`: día y hora salen del
  programa semanal, no se repiten; `durationMin`, `parts`, `companion?`).
  Mismo bloque que el mensual (`app-meeting-block`) y `.ics` con
  `RRULE:FREQ=WEEKLY;BYDAY=FR`. `companion: 'youth-meal'` proyecta dentro, a
  todo el ancho, la **invitación a quedarse a la masa** (abajo). Tineret:
  **Întâlnirea de tineret, vineri 20:30** (partes: închinare · Cuvânt; la
  masa no es una parte, la cuenta la invitación). Con encuentro semanal, la tarjeta lateral «Ne
  întâlnim» no se pinta (lo repetía).
  Con `program` (`core/meeting-programs.config.ts`), tema por fecha: ver
  «Programa de temas» más abajo.
- `monthly` → reunión mensual fija (`rule: { weekday, nth }`, `time`,
  `durationMin`, `parts`). Fechas **calculadas** (`nextMonthlyDates`), no
  escritas: no caduca. Billete con la próxima y cuánto falta (verde si es
  hoy), qué se ve esa noche, las tres siguientes y «Añadir al calendario»:
  un único `VEVENT` con `RRULE:FREQ=MONTHLY;BYDAY=1SU`
  (`CalendarService.downloadRecurring`, `core/util/recurrence.ts`). La próxima sale también en la tira de
  datos de la portada. Tineret: **seară de tineret, primer domingo, 18:00**.
- `stories` → crónicas de lo que ya pasó (`DepartmentStory`: fechas, lugar,
  invitado, puntos, fotos con su tamaño real, vídeo, carpeta de Drive,
  versículo). Con fotos: cabecera · medios · texto (container queries: se
  adapta a su columna, no a la ventana; cortes 560 y 1100 px). Medios = reel
  vertical (`app-reel-player`, `preload="none"`, portada propia) + mosaico de 4 columnas
  (verticales 1 × 2, apaisadas 2 × 1, `dense`, filas estiradas al alto del
  reel; `featured: true` = 2 × 2, para cuadrar la rejilla sin huecos: hoy
  destacada + 4 verticales + 2 apaisadas = 4 × 4). Sin cabecera de sección
  visible (10/10/2026: ocupaba sitio sin aportar; queda como `aria-label`).
  Cada foto abre la **galería del visor** (`[appViewable]`,
  `49-viewer.md`); el reel es parte del **mismo grupo** (orden: portada,
  reel, mosaico). En el teléfono, reel y fotos en **una sola tira**
  deslizable de 17 rem. Sin fotos: tarjeta compacta que lo dice («fotos en
  breve»), sin rellenar con fotos de otra cosa.
- `events` → eventos futuros de `upcomingEvents` cuyo `departments`
  incluye el id. Sin eventos, no se pinta. Para asociar un evento:
  `departments: ['youth']` en `church.config.ts`.

Pieza nueva (galería propia, documentos, inscripción…) = un `kind` más y su
`@case` en `department-page.component.html`.

## Crónicas de Tineret (09/10/2026)

- **ANCORAT** (26/09/2026, Daniel Popa, Timișoara; el 27 hubo evanghelizare, contada como punto aparte). Fotos: de
  «ELIM - MEDIA POZE › ANCORAT › POZE CONFERINTA - NAOMI» (50 en total; sala,
  oración, alabanza, pantalla: **sin primeros planos de menores**) + tres que
  dio el usuario (IMG_3026 cântare, IMG_3050 predică, IMG_3091 interviu; dos
  traían rotación EXIF: el script la aplica), optimizadas con
  `scripts/optimize-images.js` (`ancorat_2026_*`). El mural y el panel
  antiguo se retiraron (10/10/2026). Vídeo: «VIDEO FINAL - INTRARE › Video Intrare.mp4»,
  576 × 1024, 68,5 s, 1,7 Mbps: ya venía comprimido y se aloja tal cual
  (`assets/video/ancorat-2026-intrare.mp4`, 14 MB). Portada: fotograma de
  16,2 s elegido por el usuario (las chicas alrededor del mural). **Recorte
  del arranque** (el primer segundo es la entrada vacía): `StoryVideo.start
  = 1` → `src#t=1` y el reproductor no deja volver antes (`clampStart`, en
  `app-reel-player` y en la galería vía `ViewerDocument.start`); no
  se reprocesa el fichero (no hay ffmpeg en el equipo). Para un recorte
  físico: `ffmpeg -ss 1 -i in.mp4 -c copy out.mp4` y quitar `start`.
  Ojo al extraer fotogramas: el servidor local tiene que admitir `Range`
  (con `python -m http.server` los saltos no funcionan y sale siempre el
  primero).
  También es álbum de la galería de Media (`mediaEvents`, `check:drive` OK).
- **Otros departamentos** (10/10/2026, de las carpetas de «ACCES PUBLIC»):
  Fanfara «Tarancón, 20/09/2026» y Evanghelizare «13–15 martie 2026 · Gabi
  Zagrean / Frații Strugariu» → tarjeta compacta con «Vezi fotografiile»
  (Drive; fotos aún no optimizadas para la web). Cor «Concertul de colinde»
  → una foto (mosaico `--single`, 16:9) + Drive. Sin fecha exacta conocida,
  la crónica muestra su **periodo** en texto (`<base>.period`), nunca una
  fecha inventada.
- **Ajutorare «Zâmbetul din Cutie» 2025** (ampliada el 27/11/2026, como las
  de Tineret):
  - **Fecha**: 22/11/2025, del EXIF de las 829 fotos de la carpeta (Canon EOS
    R). La hora de la cámara está desfasada (sol de mañana a las «18:08»): no
    sirve para el horario.
  - **Fotos**: la selección del fotógrafo (24 originales 6720 × 4480 que dio
    el usuario, `AG5A*.jpg`; la 2646 es la destacada de siempre,
    `zambetul_cutie_2025`). Se llaman `zambetul_2025_<nº de cámara>`, sin
    variante 2560 (no son portada). Mosaico 4 × 4 sin huecos: destacada,
    2421 y 2816 (verticales), 2377, 2403, 2562, 2955 (apaisadas, con `focus`
    a las caras). Las otras 17 van con **`galleryOnly`**: sólo en el visor,
    tras las del mosaico, y la última casilla lo dice con un velo «+17»
    (`departments.photos_more` para lectores de pantalla). Receta para
    cualquier crónica con muchas fotos buenas: el mosaico no crece.
    La etiqueta «SEBEȘ» de la 2377 no se lee a 1600 px.
  - **Lo que se ve en las fotos**: etiqueta propia «Zâmbetul din Cutie · Elim
    Arganda» con sexo y edad («BĂIAT 3–7 ani»), lista por mesa (MESA 1, 2,
    3…), montaje de los cartones de envío (los jóvenes), relleno por mesas
    (rechizite, colores, dulces), papel de regalo y comida caliente bajo la
    carpa.
  - **Fuente oficial**: la presentación de la iglesia «Zâmbetul din cutie ·
    România 2025» (PDF de 12 láminas que dio el usuario). Confirma la fecha
    (22/11, 09:00) y da: reparto del 4 al 7/12/2025 (`end`), en **Oltenia**,
    a niños pobres y huérfanos, **con Asociația EBEN-EZER Botoșani**; niños de
    3 a 14 años; contenido igual en todas; 25 € (20 la caja + 5 transporte y
    envoltorio), inscripción el 2, 9 y 16/11; niños desde 5 años con sus
    padres; meta 1.500. Van Aurel Burdet, Gabriel Cifor, Kevin Mitoseriu y los
    ganadores del concurso bíblico de tineret, Daniel Dulca y David Copran.
    Transporte, Tabita Tour. Historial 2015-2025 (punto `history`): 10 años,
    más de 6.000 regalos, más de 1.600 kg de naranjas, más de 300.000 €;
    1.068 cajas en 2024. La cifra de 2025 (1.220 cajas) viene de la
    presentación de 2026.
  - **Socio: EBEN-EZER, no MGM.** Antes la crónica decía MGM (respuesta del
    usuario del 27/11/2026, que era de 2026). Manda el documento oficial: MGM
    es el socio de **2026**. De EBEN-EZER Botoșani no hay web localizada:
    `partner` sin `url` (el nombre como etiqueta, sin enlace).
  - **MGM** (para 2026): «Misionând Generația de Mâine», Dumbrăveni, Suceava.
    Fuentes: [misiuneamgm.ro](https://misiuneamgm.ro/) (misión; zonas: Suceava,
    Botoșani, Iași, Neamț, Vaslui y Cernăuți), la noticia de
    [Monitorul de Suceava](https://www.monitorulsv.ro/asociatia-mgm-a-lansat-actiunea-zambetul-din-cadou-pentru-copii-din-familii-fara-posibilitati-financiare_3c2447/)
    (2021: proyectos así «din anul 2013») y su publicación de Facebook del
    24/11/2025. Su campaña propia se llama «Zâmbetul din **cadou**». No
    confundir con «Zâmbetul din Cutie» de Asociația Șansa Ta (Bucarest), otra
    campaña.
  - **`partner`** (`DepartmentStory.partner: {name, url?}`): un enlace más
    junto a «Toate fotografiile» («În colaborare cu {{name}}» / «En
    colaboración con {{name}}», clave `departments.partner`). Sin `url`, una
    etiqueta gris (`.story__partner`). También en la crónica compacta.
- **Auditoría de Ajutorare** (27/11/2026). Medido a 320, 390, 768, 1024 y
  1440 px, en ro y es, con cada edición: sin scroll horizontal, sin textos
  cortados, sin imágenes rotas, sin `alt` ausentes, `noopener` en todos
  los enlaces externos, encabezados en orden (h1 → h2 → h3), objetivos ≥ 24
  px (las barras del carrusel, 98 × 17, cumplen por la excepción de
  espaciado de WCAG 2.5.8). Cambios:
  - **Vista a elegir** (barra «Afișare» / «Ver» sobre las crónicas, en todo
    departamento con más de una; `StoriesViewService`, clave
    `iglesia-redes.stories.view`, vale para todos los departamentos):
    - **Cronologic** (por defecto; no se guarda): todas desplegadas, de la
      más reciente a la más antigua por `start` (estable para las que no
      tienen fecha).
    - **Pe campanii** (sólo si hay alguna `series`): cada serie una vez, en
      el sitio de su edición más reciente, con selector de año (abajo).
    - **Listă**: `<details>` por crónica (fecha en columna fija de 12,5 rem,
      título, tipo y lugar, ⌄). Abierta, la crónica sin marco ni cabecera
      (ya están en la fila; la cabecera queda para lectores de pantalla).
    - Botones con `aria-pressed` en un `role="group"` nombrado por el
      rótulo; en el teléfono el rótulo es sólo para lectores de pantalla, los
      botones reparten el ancho y, por debajo de 380 px, pierden el icono.
  - **Series** (`DepartmentStory.series`): en la vista «Pe campanii», las
    crónicas de la misma serie se pintan como **un bloque con selector de
    edición** (patrón
    «tabs» de WAI-ARIA: `tablist` / `tab` / `tabpanel`, ← → en bucle,
    Inicio / Fin, foco itinerante, activación automática). Rótulo = año de
    `start`. Cabecera con nombre y contexto en
    `departments.<dept>.series.<serie>.{title,text}`; `aria-label` del
    selector «Ediții · …» (`departments.series_editions`). Las cuatro de
    «Zâmbetul din Cutie» son `series: 'zambetul'`: la página pasa de
    6.595 a 3.374 px a 1440 (de 8.506 a ≈ 4.400 a 320) y no crece con
    cada edición. El selector cabe entero a 320 (4 × 64 px); si no cupiera,
    se desliza.
  - Puntos de la crónica compacta: 2 columnas desde 560 px de contenedor,
    1 en el teléfono (con `auto-fit` salían 3 y 4 puntos dejaban uno solo).
  - Textos: intro con la Asociația „Misiune și Ajutorare Elim” (AMAE) y la
    campaña desde 2015 (dato de la presentación 2025); comillas rumanas
    „…” en ro; en es un solo nombre, **«Sonrisa en una caja»** (el de los
    carteles de la iglesia en español), en títulos, intro, actividades,
    portada y álbum de la galería (antes «La sonrisa en una caja» y «La
    Sonrisa de la Caja»); entradilla 2026 reescrita; en 2024 los títulos de
    los puntos sin horas (se partían en «9:00– / 14:00»).
  - Pendiente fuera del módulo: `about.es.json` dice «Una sonrisa en una
    caja» (página Cine suntem).
- **Portada de Ajutorare** (27/11/2026): carrusel de cuatro, una por edición. La primera, el
  cort de 2026 (`zambetul_2026_cort_portada`: fotograma 0:06,5 de IMG_5088
  en 4K que eligió el usuario, el más nítido de ese segundo, enfoque suave;
  con `large` 2560; `focus: 'lower'`, arriba sólo hay techo de lona). La
  segunda, la de siempre (`zambetul_cutie_2025`). Tercera, 2024 (la sala,
  fotograma 5:23) y cuarta, 2022 (el reparto, 3:25): `*_portada` a 1600 desde
  los fotogramas 1080p de YouTube, sin 2560 (el vídeo no da más; en monitores
  muy grandes, algo más blandas). Rótulo: nombre + año («Zâmbetul din Cutie
  2026», es «Sonrisa en una caja 2026», como el cartel en español): el hueco
  del rótulo mide ≈ 160 px y «· sub cort» se cortaba. `cover` (tarjeta en
  /departamente) pasa a la del cort.
- **Ajutorare «Zâmbetul din Cutie» 2026** (`zambetul_2026`, añadida el
  27/11/2026): fuente **oficial**, la presentación de la iglesia «Zâmbetul din
  cutie · România 2026» (PDF de 11 láminas que dio el usuario). Datos:
  - meta 1.500 cajas (2025: 1.220), para niños de 3 a 14 años, todas
    iguales («o bucurie în mod egal»);
  - 25 € por caja (20 + 5 de transporte), pagados al inscribirse los domingos
    1, 8 y 15/11;
  - empaquetado el sábado 21/11 en la iglesia, con comida al final; niños
    desde 5 años con sus padres;
  - reparto con MGM del 4 al 6/12: Iași y Vaslui (Rumanía) y el pueblo de
    Borogani (raionul Leova, Moldavia); seis hermanos de la iglesia (nombres
    en el punto `team`; el PDF escribe «Compran», pero es Copran, como en
    2025 y en Botezuri); transporte, Tabita Tour;
  - lema de la lámina final, citado en la entradilla, que también dice que
    el proyecto empezó en 2015 (no es «la segunda edición»).
  - **Hora**: la lámina en rumano dice 09:00 y la invitación en español
    («Sonrisa en una caja») 10:00 h. Como ya pasó, la web no da hora.
  - Crónica **completa** desde el 27/11/2026 (`start` 21/11, `end` 06/12):
    material de la carpeta de Drive «2026-11-21 - Zambetul din cutie»
    (`1lPg-4lPAUs4RcRRNBv2pWJ4zFJczyPcJ`): 9 vídeos 4K HEVC del iPhone
    (09:33–10:28) y 2 fotos HEIC. **Cinco principales** (decisión del
    usuario: el mosaico de 11 quedaba mal), 4 × 4 sin huecos: `cort`
    (destacado), `fetita`, `cartoane`, `duba`, `cutii`; los otros 6 vídeos
    (benzi, impachetare, jucarii, mese, umplere, inchidere) con
    `galleryOnly` tras un «+6». Bajo el «+N» no se pinta el ▶.
  - **Vídeos** en `assets/video/zambetul-2026/`, receta de Tabăra: 720p,
    30 fps, H.264 CRF 28 con tope 1,5 Mbps, AAC 96k, sin metadatos,
    `faststart`; portada = fotograma a 1080p → `zambetul_2026_v-<slug>`
    (`.webp`, `-960`, `-thumb`). IMG_5099 recortado a sus primeros 22 s
    (petición del usuario; el recorte en 4K quedó en Descargas como
    `IMG_5099_recortado.MOV`).
  - **HEIC**: 54 teselas de 896 × 1024 (rejilla 9 × 6 → 8064 × 6048) con
    rotación −90°; ffmpeg sólo saca una tesela con `-map 0:g:0`: se sacan
    las 54 (`-map 0:i`), se cosen, se recortan a 6048 y se giran. Luego
    `optimize-images.js` (1600 × 2133, sin 2560).
- **Ajutorare «Zâmbetul din Cutie» 2024** (`zambetul_2024`, compacta). Fuentes:
  cartel oficial («Anul 2024 · Bucuria TA», con el logo de AMAE), mensajes de
  la iglesia por WhatsApp y el vídeo del canal Elim Arganda «Pregătirea
  proiectului „Zâmbetul în cutie”» (16/11/2024, 12 min; `links` con
  miniatura propia: el fotograma del minuto 5:23 que eligió el usuario, a
  1080p, sin la franja negra ni el logo → `zambetul_2024_pregatire{,-thumb}.webp`).
  Datos: 25 € por caja; inscripción los domingos 20 y 27/10 y
  3/11 (listas o Bizum); preparación el sábado 16/11 de 9:00 a 14:00, sin
  traer nada; niños desde 7 años con sus padres; 1.068 cajas (de la
  presentación de 2025). Versículo del mensaje: Rut 2:12 (el mensaje dice
  «1;12», errata). **Fuera**: el teléfono y el Bizum del cartel (número
  personal) y la foto de grupo y el reel de Facebook (no hay fichero; el
  reel pide sesión). Socio de reparto en 2024: no consta.
- **Ajutorare «Zâmbetul din Cutie» 2022** (`zambetul_2022`, compacta, 20 – 27/11/2022).
  **Fuente oficial**: «Presentacion ZDC 2022.pptx» (13 láminas). La organiza
  la asociación de la iglesia, **«Misiune și Ajutorare ELIM» (AMAE,
  Asociación Misión y Ayuda «Elim», Arganda del Rey)**, que reparte con
  **Asociația «Miros de Cer»** en **Constanța** (orfanatos, niños pobres) y
  **Moldova** (zonas pobres). Datos:
  - caja estándar del departamento: no se cierra ni se envuelve; etiqueta
    dentro con número («FATA 2-5 Ani · 306») para mandar la foto del niño a
    quien la preparó;
  - obligatorio: guantes, bufanda y gorro, toalla, jabón, juguete, dulces,
    pasta y cepillo, material escolar, cuaderno de colorear o agenda,
    accesorios de pelo; todo nuevo;
  - prohibido (lámina «Nu poți adăuga», en imágenes): ropa, champú, enjuague,
    sprays, cuchillos, medicinas, bombones, embutido;
  - 5 € por caja (caja, transporte, cruasán y zumo para los niños);
    recogida los domingos 20 y 27/11 antes y después de cada culto (y el de
    las 19:00 con Simi Bumbar, según WhatsApp);
  - van Cornel Mitoseriu y Aurel Burdet; 560 cajas en 2021 y más de 3.500 en
    «los 5 años». **Ojo**: la presentación de 2025 dice «2015-2025, 10 ani» y
    más de 6.000 regalos; cada crónica da la cifra de su documento.
  - Socio con canal de YouTube y sin web: `partner.url` al canal. Vídeos
    (`links`): «Pregătim cadourile» (Frații Strugariu Official, 09/12/2022;
    la etiqueta nombra el canal) y el reparto, «Se mai poate așa ceva în
    2022⁉️» (Miros De Cer, 17/12/2022). Su miniatura es propia
    (`StoryLink.thumb`): el fotograma del minuto 3:25 que eligió el
    usuario, sacado del vídeo a 1080p (yt-dlp, 4 s, con permiso), sin la
    interfaz y con un enfoque suave → `zambetul_2022_impartire{,-thumb}.webp`.
    La cuenta bancaria de su descripción no se copia.
  - **`links`** (`DepartmentStory.links: StoryLink[]`): enlaces externos
    (texto en `<base>.links.<key>`). Con `youtubeId`, tarjeta con miniatura
    (`watch--video`, miniatura hasta 20 rem; apilada por debajo de 30 rem);
    sin él, botón. En la compacta, con enlaces no sale «fotos en breve».
  - Títulos con el año en todas las ediciones.
- **Proporciones del mosaico** (27/11/2026). Sin vídeo lateral (`has-video`)
  nada fija el alto y las filas caían a su suelo (6,5 rem): una apaisada
  2 × 1 quedaba en tira de 3 : 1 (≈ 400 × 104 px). Ahora, sólo en rejilla
  (contenedor ≥ 560 px) y sin vídeo lateral: apaisada y destacada **2 × 2 a
  16 : 9**, vertical 1 × 2 al alto de esas filas (`grid-auto-rows: auto`).
  Cuadra con 4 apaisadas por cada 2 verticales. Medido: 2026 → 908 × 515
  (1440), 668 × 380 (768); 2025 e Înainte DA → 4 × 6, 908 × 776. ANCORAT y
  Tabăra (con vídeo lateral) no cambian: sus apaisadas siguen en 339 × 111,
  pendiente si se quiere.
  - `sizes` real por casilla (vertical `15rem`, resto `32rem`; antes
    «16vw» = 192 px para casillas de 400: el navegador bajaba la miniatura
    de 480 y se veía blanda).
  - Tira del teléfono: `--strip-h: min(17rem, 100cqi * 0.88 * 2 / 3)`: una
    apaisada ocupa el 88 % y asoma la siguiente (a 375: 303 × 202; antes
    390 × 260 en una tira de 342, cortada).
- **Tabăra 2026** (Granja Casavieja, Ávila; material del 19/11/2026, carpeta
  «TABARA › FINAL»: 3 fotos y 11 vídeos, 944 MB). **Ojo a la fecha**: la
  configuración dice 25–26/07/2026, pero el dron y el iPhone marcan el
  26–27/06/2026 (pendiente de confirmar con el usuario).
  **Todo el material tal cual** (decisión del usuario: nada de montajes ni
  fotogramas sacados de los vídeos):
  - **Portada** (`StoryPhoto.cover`): la foto de grupo con el recorte
    panorámico del usuario (1465 × 654), arriba de la tarjeta, a sangre y
    entera (tope 30 rem); en la galería, la primera.
  - **Lateral**: IMG_3731 (la sesión bajo la encina), `video` de la crónica.
    El reel ya no se estira al alto del mosaico (`align-self: start`) y, con
    columnas, queda fijo bajo la cabecera y las pestañas mientras se recorre
    (`sticky`); ANCORAT no cambia (su mosaico sigue estirándose a él).
  - **Mosaico**: 12 piezas, 4 × 6 sin huecos (10 verticales + 2 apaisadas) en
    orden de la hora de la cámara: 2 fotos y **10 vídeos como vídeos**
    (`StoryPhoto.video`): la casilla pinta su portada (un fotograma) con un ▶
    en la esquina y la galería los reproduce (vídeo en `GalleryViewer`,
    `49-viewer.md`). IMG_3704 es un **juego** de equipo (no una oración):
    `joc.mp4`. `StoryPhoto.focus` encuadra el pabellón apaisado (`50% 85%`).
  - **Vídeos** en `assets/video/tabara-2026/`: 720p, 30 fps, H.264 CRF 28
    (los dos más densos con tope de 1,5 Mbps), AAC 96k, `faststart`: 59 MB en
    total frente a 944 MB. `preload="none"`: no se descargan hasta pulsar ▶.
  - Drive con todo el material: `15stXH7Cv4-lo5qXV7pfHegICrJXSlrWk`
    («Toate fotografiile», enlace discreto bajo los puntos).
  - Medido en `ng serve` (1440 y 390 px): 13 imágenes cargadas, portada entera,
    las 13 piezas de la galería se abren (los 10 vídeos avanzan), sin errores.
    Ojo: `ng serve` no siempre sirve ficheros de `assets` creados después de
    arrancar (devuelve el HTML): reiniciarlo antes de revisar.
- **Înainte să spui „DA”** (vineri 20/11/2026, 20:00; abrió la Conferință
  de familie; Marian Condrat, Bellevue, Washington). La **primera** de la
  lista (`YOUTH_STORIES` va de la más reciente a la más antigua). Kind nuevo
  `evening` («Seară de tineret» / «Noche de jóvenes»).
  - **Fotos**: carpeta «2026-11-20 Conferinta tineret – Înainte Să Spui Da»
    (`1tdPONU5XW8uTRB0wiPT-TG9A54gmy1kc`, 41 JPEG de Tezza a 1620 px, sin
    variante 2560). Siete optimizadas (`inainte_da_2026_*`): sala llena
    (destacada), predică y întrebări (verticales), laudă, versetul en
    pantalla (2 Tim 1:7), la inimă-puzzle sin gente y la pantalla «Dejen que
    Dios tenga la última palabra». 4 × 4 sin huecos y **sin vídeo propio**
    (sin reel: el mosaico ocupa todo el ancho de su columna). Las apaisadas
    quedan a ≈ 2,3 : 1 en escritorio: `focus` en laudă (`50% 62%`) y en la
    pantalla (`50% 22%`). Fuera: primeros planos de chicas en el mural y
    filas de público de frente.
  - **Directo**: `Tufp6E4kzOw` (1:10:53). Las preguntas por QR se hicieron
    después y **no** se emitieron.
  - **Resumen** de la transcripción automática (27/11/2026): predicación
    desde 31:37; «Ce ne spunem / Ce e de fapt» (seis mitos, veredicto «Ultimul
    cuvânt: al meu / al lui Dumnezeu»), tres preguntas (valores, qué no se
    negocia, cómo se porta en casa), seis lecciones y cierre «Lasă-L pe
    Dumnezeu să aibă ultimul cuvânt» (1:06:11, 2 Corinteni 6:14). Versículo
    de la crónica: 2 Timotei 1:7 (el de la exhortación inicial, en pantalla).
  - **Anuncio**: tres diapositivas seguidas en la portada de Tineret (2.ª-4.ª,
    tras la alabanza): `youth_inainte_da_hall` (sala llena),
    `youth_inainte_da_opening` (`inainte_da_2026_inceput`, todos en pie con el
    título en pantalla) y `youth_inainte_da_dialog`
    (`inainte_da_2026_dialog`, las preguntas a Marian Condrat; `focus:
    center` para no perder a ninguno de los dos en móvil). Las dos últimas
    vienen de Tezza-3966 y Tezza-7654 y no están en el mosaico. Álbum
    `inainte_da_2026` en la galería de Media (mismas fotos).
  - Medido en `ng serve`: a 1440 px, crónica 953 × 2.809 px (resumen 1.600);
    a 375 px, 3.801 px (resumen 2.568), tira de fotos de 260 px, sin scroll
    horizontal; la galería abre las 7.
- Textos de todas: provisionales (TODO(iglesia)).

**Vídeo y PWA**: `ngsw-config.json` excluye `/assets/video/**`. El Service
Worker de Angular no sirve bien peticiones por rangos (`Range`), que es como
pide vídeo el navegador (Safari falla); además 14 MB no deben entrar en la
caché de la app. Se sirve directo de GitHub Pages.

**Retransmisión completa** (`DepartmentStory.youtubeId`): ficha horizontal
navy (`.watch`) que ocupa la fila, sobre «Toate fotografiile». A la izquierda,
la miniatura de YouTube **entera** (`hq720`, 16:9 exacto, con respaldo a
`mqdefault` vía `youtubeThumbFallback`); el «play» va en la esquina para no
tapar el rótulo. A la derecha, «YouTube · live», el título y «Deschide pe
YouTube». Abre `youtube.com/live/<id>`. Es un enlace, no un iframe: son horas
de directo. ANCORAT 2026 → `5_4N6Ja0OdU`.

**Resumen de la predicación** (`DepartmentStory.sermon`, 14/10/2026):
`app-sermon-notes` (`stories/sermon-notes.component.*`), al pie de la
crónica a todo su ancho (área `sermon`). Cabecera: «Din predică · pasaje»,
título, entradilla y botón navy «Vezi predica · de la 55:15». Debajo, partes
con su minuto del directo enlazado (`watch?v=<id>&t=<s>s`, a la derecha de un
filete) y tres formatos según lo que se cuente: `contrast` (tabla rótulo | A |
B, columna B con velo dorado, última fila = veredicto; en < 560 px cada fila se
apila y las celdas llevan su escuela en `::before`), `steps` (fichas
numeradas con nota al pie; 3 columnas ≥ 760 px, tira deslizable a sangre
< 560 px) y `lessons` (título + texto con filete dorado a la izquierda, **sin iconos**; 1 → 2 → 3 columnas).
Cierre navy con el llamamiento y su versículo. Textos en
`<story>.sermon.*`; rótulos comunes `departments.sermon_{watch,from,at}`.
ANCORAT 2026: resumen de la transcripción automática del directo
(`yt-dlp --write-auto-subs --sub-langs ro-orig`), «Lepădat sau ancorat?»
(1 Samuel 17:23–37): dos școli (Eliab / David), trei oglinzi (familia, cei
din jur, Dumnezeu), seis lecciones y «Ancorarea începe la cruce» (Ps 51:7).
Alto medido: 1.617 px a 908 px de ancho; 2.432 px a 375 px.

**Reel: se ve aquí, se amplía en la galería (26/11/2026)**. El reel lleva
controles propios (`reel-player.component.ts`), no los nativos: la pantalla
completa del reproductor no hacía nada dentro de la tarjeta y, además,
sacaba el vídeo de su grupo. Ahora:

- ▶ / ❚❚ reproduce **en la página** (barra fina en oro con el avance).
- ⛶ o clic en la imagen → pausa y abre la **galería de la crónica** en el
  reel (`openReel`), **desde el segundo por el que iba** (`ViewerDocument.from`
  → `#t=`; a diferencia de `start`, no impide volver atrás). En la galería
  tiene pantalla completa, ‹ ›, miniaturas y autorreproducción como el resto.

## Programa de temas (14/10/2026)

**Fuente**: el calendario de Google de tineret (`adtineretelim@gmail.com`).
**No se vincula ni se incrusta**, se copia: es **privado** (`.ics` público
→ 404, `embed` → inicio de sesión: a un visitante le saldría «Inicia
sesión»), mezcla lo público con la organización interna («IESIRE CU TINERII
???», «Discuție …»), y un iframe de Google no lleva marca, ES/RO,
proyección, accesibilidad ni funciona sin conexión; leer el `.ics` en vivo
tampoco (Google no manda CORS). Si algún día se automatiza: script de build
con la **dirección secreta iCal** en GitHub Secrets, mismo filtro, y fichero
generado que se revisa antes de publicar.

**Qué entra** (decisión del usuario): sólo fechas **con tema asignado**.
Fuera: «Seara tineret: predica X» (sólo nombre), «Dezbatere: tema» (sin
tema aún), salidas y todo lo que lleve «???». Texto en rumano corregido
(diacríticos, «Samy B» / «Samuel B» → `samuel-bogdan`, «Cifor G» →
`gabriel-daniel-cifor`; invitados fuera del organigrama en `guest`).

**Modelo**: `MeetingTopic { date, title, series?, speaker?: PersonId,
guest?, time? }` en `YOUTH_FRIDAY_PROGRAM`, colgado de la reunión
(`program` en `weekly` / `monthly`): la reunión sabe *cuándo*, esto añade *de
qué va*. Las fechas pasadas desaparecen solas. `time` sólo si esa noche
cambia la hora (20/11/2026: 19:00 según el calendario); el billete la usa.

**Iconos fuera** (14/10/2026, petición del usuario: «profesional y seria»):
puntos de las crónicas y lecciones del resumen ya no llevan icono; el dato
desapareció del modelo (`points` y `lessons.items` son listas de claves).

**Pintado** (`app-meeting-block`): la próxima noche con tema → recuadro
dorado «Tema serii» en el cuerpo (serie + título + «Cu …»); las siguientes →
**agenda** a todo el ancho bajo el bloque, columnas fecha (sello navy) |
serie + tema | quién (en < md baja bajo el tema). 4 filas y «Toate temele
(N)» (`aria-expanded`). Con agenda, las píldoras de «Apoi» no se pintan
(repetían las fechas). Textos `departments.program.*`. Medido a 14/10/2026:
agenda plegada ≈ 300 px en escritorio; desplegada (12) ≈ 1.160 px a 375 px,
sin scroll horizontal.

**Actualizar**: copiar la vista «Agenda» del calendario (sólo ese
calendario visible, Ctrl+A) y pasar a `YOUTH_FRIDAY_PROGRAM` las fechas con
tema. Pendiente de confirmar con tineret: el 18/12 dice sólo «TEMA CRACIUN»
(publicado como «Seară de Crăciun»).

## La masa de după program y ADM-TINERET

**Invitación, no herramienta** (13/10/2026, a petición del usuario). Al pie
del encuentro de vineri (`companion`, ancla `#masa`), una franja clara con
velo dorado: «După fiecare program» · **Rămâi la masă** · dos frases (la
prepara un equipo de tineri y cenamos juntos; quédate y alarga la noche) ·
tres píldoras (loc pentru toți · adu un prieten · mai rămâi puțin). Sin insignia ni iconos en las
píldoras (14/10/2026).

**Con fotos** (25/11/2026, del usuario): `YOUTH_MEAL_PHOTOS`
(`departments.config.ts`), en orden de relato: «Echipa o pregătește…» →
«…și masa e gata». Díptico **dentro** de la invitación, no una galería aparte.
El texto dejaba vacíos 326 de 951 px: ahora texto | fotos 4:3 sin recortar,
centrados (233 y 244 px de alto a 1440); la franja pasa de 178 a 287 px.
Cortes por contenedor: ≥ 720 dos columnas · 480–719 díptico bajo el texto ·
< 480 tira deslizable (`data-no-swipe`, 260 px por foto, la segunda asoma).
Cada foto abre la galería (hasta 2560 px); su `alt` es también el nombre del
botón. Buscador: entrada propia con ancla `#masa` (`departments.search.ts`).
**Foto nueva**: `optimize-images.js` → fila en `YOUTH_MEAL_PHOTOS` →
`departments.youth.meal.photos.<key>.{caption,alt}` (ro y es). Apaisada 4:3 y
de ambiente: **sin primeros planos de menores**.

**Nada de la app interna en la web pública**: ni turnos, ni equipos, ni
părinți, ni QR, ni franja en la portada de Departamente (se quitaron el
lector del feed `meal-feed.ts`, `YouthMealService` y `app-youth-meal-next`).
La acción principal del hero de Tineret es «Vino vineri» → `#meet-friday`.

ADM-TINERET (`C:\workspace\INEB_ELIM_Administrativ\elim-admin`, publicada en
`https://beni-cioarba.github.io/ADM-TINERET/`) **sólo se enlaza desde el
pie**: icono `calendar` en la barra de herramientas, junto al panel de
control y la guía de estilos, con el rótulo «Programare · Administrativ»
(`footer.admin_schedule`; abre la programación, que es su página de
inicio). URL en un sitio:
`YOUTH_ADMIN_APP_URL` (`departments.config.ts`).

## Diseño (línea propia, no catálogo)

Navy y oro con dos gestos «de producto tecnológico» contenidos:
retícula de 1 px al 4–5 % sobre navy (`tech-grid`, se desvanece) y filete de
luz dorada en el borde superior (`gold-edge`). Verde = «hoy / ahora» (el
mismo `color-mix(--c-success 62 %, #fff)` de la portada y de la barra de
pestañas). Medidas: portada `clamp(26rem, 64svh, 38rem)` (27 rem en
teléfono), lateral 21 rem fijo con `sticky` desde `lg`, pilares en rejilla
`auto-fit` (en teléfono una sola superficie con filetes: ~620 → ~430 px).
El velo de la portada es más parejo por debajo de `md` (el titular competía
con la pantalla luminosa de la foto de Tineret).

## Verificado (09/10/2026)

Auditoría responsive (`scripts/responsive-audit.snippet.js`) limpia en 320 ·
375 · 768 · 1024 · 1280 en `/departamente` y en las seis páginas. Bundle
inicial 619 kB (el destacado del panel de escritorio va diferido: costaba
~4 kB del arranque).

## Auditoría de ADM-TINERET (09/10/2026, para su repo)

Sin errores de consola, sin scroll horizontal a 375. Pendiente allí:

1. El pie enlaza `/admin` (`footer.component.ts`), contra su propia regla 7
   («ruta oculta… ni enlazada desde ningún sitio»).
2. `og:url` y `og:image` apuntan a `beni-nc.github.io/INEB_ELIM_Administrativ/`:
   el enlace que circula es `/ADM-TINERET/`, así que la vista previa al
   compartir sale de otro dominio.
3. Los enlaces profundos (`/ADM-TINERET/parinti`, `/admin`) responden
   **HTTP 404** (GitHub Pages sirve el `404.html` de la SPA): funcionan en
   el navegador, pero algunos generadores de vista previa (WhatsApp) no
   muestran tarjeta con un 404.
4. Los chevrones de expandir (`ui-btn--icon` con `aria-hidden` +
   `tabindex="-1"`) no tienen nombre: correcto mientras la fila entera sea el
   control accesible; si algún día son el único control, necesitan `aria-label`.
5. `theme-color` blanco con cabecera clara: correcto en claro; el modo oscuro
   ya lo cambia por script.
