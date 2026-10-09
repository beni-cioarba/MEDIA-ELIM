# 39 · Departamente

> Lee este shard si vas a **añadir un departamento, cambiar su contenido o
> tocar el bloque de la app de la masa de tineret** (ADM-TINERET).

## Qué hay (09/10/2026)

| Ruta                          | Componente                     | Qué es |
| ----------------------------- | ------------------------------ | ------ |
| `/departamente`               | `DepartmentsHomeComponent`     | Portada propia: cabecera con cifras, acceso rápido, mosaico de fotos, franja viva de la masa e «Implícate» |
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
core/util/meal-feed.ts             Lector puro del calendario .ics de ADM-TINERET (sin nombres)
core/util/monthly-recurrence.ts    «n-ésimo día de la semana del mes» (próximas fechas, BYDAY del .ics)
assets/i18n/departments.{ro,es}.json  Paquete de textos largos (resolver en las rutas del módulo)
assets/video/                      Vídeos propios + su portada (fuera de la caché de la PWA)
features/departments/
  _departments.scss                Mixins de la línea: tech-grid, gold-edge, cta-gold, cta-glass
  department.view.ts               Responsables derivados del organigrama
  departments-home/                Portada /departamente
  department-page/                 Página de un departamento
  dept-switcher/                   Acceso rápido: pestañas de línea fijas bajo la cabecera (36 px, `--dept-switcher-h`)
  meeting/                         Reunión fija semanal o mensual (`app-meeting-block`) + hueco para su pieza propia
  ticket/                          Billete de la próxima fecha (`app-date-ticket`), común a las reuniones
  stories/                         Crónicas: texto + reel vertical + mosaico (galería del visor)
  youth-meal/                      Servicio del feed + pieza «masa de după program» + franja compacta
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
Hoy: Tineret 6 fotos · Cor 2 (cor, colinde) · Evanghelizare 3 (colinde,
candidații, botez) · Fanfara 1 · Ajutorare 1 · Misiune 0. Chip de «lo
próximo»: reunión fija más cercana **o** evento del departamento
(`#meet-<key>` / `#events`). Acciones: la propia (masa) o «Vreau să mă
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
lo usan los dos). Añade el rótulo del departamento sobre el titular. El chip
elige la reunión fija más cercana (semanal o mensual) y enlaza a su bloque
(`#meet-<key>`). La migaja de pan se descuenta con `--hero-offset` (input
CSS del carrusel, 0 por defecto: **el alto del inicio no cambia**). Los datos
clave pasan a una franja navy bajo el carrusel. Mejor apaisadas; una
vertical entra con un `focus` que deje a las personas en el marco (≈ 2,2 : 1
en escritorio; comprobado a 1440). Tineret (6): alabanza del tineret + ANCORAT
(sala, alabanza, cântare, predică, interviu).
Sin `heroSlides`: portada fija con `cover` (el resto, de momento).

## Módulos (`DepartmentModule`)

Unión discriminada: cada `kind` es una pieza que la página sabe pintar.

- `weekly` → encuentro semanal (`weeklyProgramId`: día y hora salen del
  programa semanal, no se repiten; `durationMin`, `parts`, `companion?`).
  Mismo bloque que el mensual (`app-meeting-block`) y `.ics` con
  `RRULE:FREQ=WEEKLY;BYDAY=FR`. `companion: 'youth-meal'` proyecta dentro, a
  todo el ancho, la **masa de după program** (abajo) y oculta la fila
  «Después» (los turnos ya dan las fechas). Tineret: **Întâlnirea de
  tineret, vineri 20:30**. Con encuentro semanal, la tarjeta lateral «Ne
  întâlnim» no se pinta (lo repetía).
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
  vertical nativo (`preload="none"`, portada propia) + mosaico de 4 columnas
  (verticales 1 × 2, apaisadas 2 × 1, `dense`, filas estiradas al alto del
  reel; `featured: true` = 2 × 2, para cuadrar la rejilla sin huecos: hoy
  destacada + 4 verticales + 2 apaisadas = 4 × 4). Sin cabecera de sección
  visible (10/10/2026: ocupaba sitio sin aportar; queda como `aria-label`).
  Cada foto abre la **galería del visor** (`[appViewable]`,
  `49-viewer.md`). En el teléfono, reel y fotos en **una sola tira**
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
  = 1` → `src#t=1` y el reproductor no deja volver antes (`clampStart`); no
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
  y Ajutorare «Zâmbetul din Cutie» → una foto (mosaico `--single`, 16:9) +
  Drive. Sin fecha exacta conocida, la crónica muestra su **periodo** en
  texto (`<base>.period`), nunca una fecha inventada.
- **Tabăra 2026** (25–26/07/2026, Granja Casavieja, Ávila): sus dos carpetas
  de Drive estaban **vacías**. Al subir fotos: optimizarlas, `photos` en
  `YOUTH_STORIES` y `driveFolderId`; la tarjeta pasa sola a la versión grande.
- Textos de las dos: provisionales (TODO(iglesia)).

**Vídeo y PWA**: `ngsw-config.json` excluye `/assets/video/**`. El Service
Worker de Angular no sirve bien peticiones por rangos (`Range`), que es como
pide vídeo el navegador (Safari falla); además 14 MB no deben entrar en la
caché de la app. Se sirve directo de GitHub Pages.

**Vídeo en pantalla completa**: en el mosaico el reel es 9:16 con
`object-fit: cover`; en `:fullscreen` / `:-webkit-full-screen` pasa a
`contain` sobre negro, con `aspect-ratio: auto`. Así no se recorta en un
teléfono girado ni en una pantalla apaisada (`stories-block.component.scss`).

## La app de la masa de tineret (ADM-TINERET)

Se presenta **dentro del encuentro de vineri** (`companion`), no en un
bloque suelto, y **deliberadamente secundaria** (10/10/2026, a petición del
usuario: el protagonista es el encuentro): una franja de consola navy al pie
del bloque, ~164 px en escritorio y ~224 en el teléfono (antes ~470). Tres
líneas: título + fuente en vivo («ADM-TINERET») + «Abrir la app» y
suscribirse (icono) · quién prepara los próximos cuatro vineri en fichas
(hoy en verde; deslizables si no caben) · la tarde en una línea (19:30 ·
20:00 · 20:30) y los accesos directos «Tineri: Programări · Echipe —
Părinți: Sprijin · Reguli». Sin QR ni tarjeta grande. Ancla `#masa` fuera
del `@defer`.

App hermana: `C:\workspace\INEB_ELIM_Administrativ\elim-admin` (Angular 22
zoneless, sin backend), publicada en
`https://beni-cioarba.github.io/ADM-TINERET/`. Cada vineri un equipo de
tineri prepara la masa y dos părinți traen la comida.

La web **no copia sus datos**: lee el calendario público que la app genera en
cada despliegue (`assets/calendars/toate.ics`; mismo dominio de GitHub Pages
y `Access-Control-Allow-Origin: *`). `parseMealFeed` sólo extrae fecha,
equipo y horas (sosire / mâncare / program); **coordinador y personas se
ignoran a propósito**: los nombres se quedan en la app.

- `YouthMealService`: un `fetch` por sesión, al entrar el bloque en pantalla
  (`@defer (on viewport)`); «hoy» con `ClockService`. Si falla, el bloque se
  queda en la explicación y los accesos.
- Bloque completo (`#masa` en Tineret): qué es · para tineri / para părinți
  con enlace directo a su pestaña · tablero vivo (próximo turno + horario +
  siguientes 3) · abrir la app · suscribirse (`webcal:`) · QR (sólo con ratón).
  Por debajo de `lg` el tablero va **primero**: desde el teléfono se busca
  «¿a quién le toca?».
- Franja compacta en la portada de Departamente → `#masa`. El ancla vive
  fuera del `@defer` para que exista al llegar por enlace.

Si la app cambia de URL o de pestañas: `YOUTH_MEAL_APP` (un sitio).

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
