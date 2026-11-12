# 32 · Proiectul Împreună (lectura bíblica diaria del Cultul Penticostal)

> Módulo `/impreuna`: qué toca leer hoy, la meditación en vídeo del día, el
> plan completo, el progreso de cada uno y cómo tenerlo en el teléfono, con
> aviso diario a las 08:00 (§ 7: OneSignal configurado el 12/11/2026; falta
> desplegar y probarlo en un móvil).
> Auditoría de las fuentes hecha el **11/11/2026** (día 315 de la edición).

## 1 · Qué es (auditoría)

- **Proiectul Împreună** es una iniciativa de la conducerea del **Cultul
  Creștin Penticostal din România (CCP)**, empezada en **2023**: un ghid de
  lectura de la Escritura con una **meditación diaria en vídeo** (5–8 min) de
  un slujitor del Cult (conducerea CCP, profesores del ITP, diaspora,
  comunitatea locală). 2026 es la **4.ª edición**; un día del plan = un día del
  año natural (día 1 = 1 de enero; 2023: 365, 2024: 366, 2025: 365 entradas).
- **Plan 2026** = plan de YouVersion **43657 «New Testament, Psalms & Proverbs
  in a Year»** (366 días; 5 días de NT + 2 de Psalmi/Proverbe), **con un salto**:
  el **23/03/2026 (día 82) se saltaron el día 82 de YouVersion** (Luca
  12:35-59). Desde entonces **día del proyecto N = día N+1 de YouVersion**.
  Verificado contra los 315 días publicados: coinciden todos menos 6 erratas
  de su web (66, 146, 148, 149, 201, 306: p. ej. el 306 dice «2 Tesaloniceni 3»
  y es Psalmul 119:161-176). **Manda el plan**, no el texto de su web.
- **Ayuno («Postul Împreună»)**: el primer jueves de cada mes es día de post
  și rugăciune. El **motivo oficial** está en el artículo del presidente del
  Cult (cultulpenticostal.ro, «Proiectul Împreună. Punct și de la capăt»,
  19/12/2023): humillarse ante Dios y pedir su misericordia sobre la nación,
  confesar el pecado propio y de la nación, interceder por las autoridades,
  levantar un «escudo de intercesión» sobre el país y consagrarse a servirle en
  esta generación. El **tema concreto de cada mes** («chemarea lunară la
  post») el Cult lo publica **sólo en Facebook y YouTube**: no está en la web
  del proyecto (sus entradas de los primeros jueves no traen nada especial) ni
  se puede leer de forma automática (Facebook pide sesión; YouTube, el muro de
  consentimiento). Por eso hay un hueco para cargarlo a mano (receta abajo).
- El PDF del menú «Plan» de su web (`ghid-de-citire-al-Bibliei.pdf`, enero
  2025) es **el plan de 2025**, otro esquema: no sirve para 2026.

### Fuentes (todas comprobadas)

| Qué | Dónde |
| --- | --- |
| Web oficial (WordPress, una entrada por día) | `https://proiectulimpreuna.ro/` · archivo `/news/` |
| Entrada de un día | `/<aaaa>/<mm>/<dd>/ziua-NNN-nume-prenume-D-luna-aaaa/` (también `/?p=<id>`, redirige) |
| **API pública** (CORS abierto, sin clave) | `/wp-json/wp/v2/posts?categories=41&…` · categoría por año: `proiectul-impreuna-2026` = **41** (2025 = 44, 2024 = 43, 2023 = 45) |
| Contenido de cada entrada | 1.er `<p>` = lectura · `<iframe …/embed/<id>>` = vídeo · título «Ziua 315 – Adi Ion – 11 Noiembrie 2026» · resumen + «Motive de rugăciune» (no se copian: son texto suyo; se enlaza) |
| YouTube | Canal `@cultulcrestinpenticostal` = `UCqKwJYXPbht3Oh0riWfT1bg`; lista de subidas `UUqKwJYXPbht3Oh0riWfT1bg`. **Fuente principal del vídeo**: lo suben cada día a las **22:15 UTC** (23:15 en España) con el título «Ziua 316 Paul Răducanu», **horas antes** de que la web del proyecto publique su entrada (el 12/11/2026 a las 09:15 su web aún iba por el 315). Se lee con la YouTube Data API v3 (`playlistItems.list`, 1 unidad de cuota) y la clave de la web (`youtubeApiKey`, restringida por dominio: `elimarganda.com` y `localhost`; desde un script hay que mandar `Referer: https://elimarganda.com/`). Las páginas HTML del canal no se pueden leer (muro de consentimiento) |
| Plan en la app Biblia | `https://www.bible.com/reading-plans/43657` · día: `/reading-plans/43657/day/<n>` |
| Pasajes en bible.com | `https://www.bible.com/bible/<versión>/<USFM>.<abbr>` · **VDC (Cornilescu) = 191**, **RVR1960 = 149** (verificados) · audio: `/audio-bible/<versión>/<USFM>.<abbr>` (las dos versiones tienen audio; comprobado el 12/11/2026) |
| App Biblia (YouVersion) | Android `com.sirma.mobile.bible.android` (Google Play) · iOS App Store `id282935706`. bible.com cede **todos** sus enlaces a la app (`/.well-known/assetlinks.json` con `handle_all_urls`; `apple-app-site-association` con `paths: ["*"]`) |
| Ayuno (motivo) | `https://cultulpenticostal.ro/proiectul-impreuna-punct-si-de-la-capat/` (`IMPREUNA_FAST_SOURCE`) |
| Miniaturas | `i.ytimg.com/vi/<id>/…`: `hq720` y `maxresdefault` **no existen** en este canal (404 con imagen gris de 120 px; 7 de 7 vídeos muestreados); se usa `sddefault` y, de respaldo, `mqdefault` |

## 2 · Arquitectura

```
scripts/sync-impreuna.mjs ──(--plan: YouVersion 43657 − días saltados)──▶ core/impreuna/data/<año>.plan.json
        │                 ──(API WordPress)────────────────────────────▶ core/impreuna/data/<año>.media.json
        └────────────────────────────────────────────────────────────▶ assets/calendars/impreuna-<año>-{ro,es}.ics
core/bible/               motor bíblico de toda la web (Împreună, Citirea Bibliei, portada)
  bible-books.json        66 libros: USFM → nombre RO (Cornilescu) / ES (RVR1960)
  bible-refs.ts           pasajes (USFM), cómo se escriben en cada idioma, bible.com (texto y audio), intent de Android,
                          y `parseRomanianPassage` («Isaia 43-44» → ISA.43, ISA.44) para los planes escritos a mano
  bible-verses.json/.ts   versículos por capítulo y palabras por versículo (66 libros, KJV) → «26 de versete · ≈ 3 min»
  bible-app.ts            la app Biblia: paquete de Android, Google Play, App Store
  bible-link.service.ts   abrir un pasaje: app Biblia si está (Android: intent + vuelta), si no el navegador; versión elegida
shared/bible/             la UI de lectura compartida (kit `_bible.scss`)
  bible-passages          filas «Citește · Ascultă» (+ aviso de app ausente al volver de Android)
  bible-options           versión Cornilescu | RVR 1960 y tienda de la app
core/impreuna/
  impreuna-plan.ts        lógica pura del proyecto: día del año, semana, tipo de día, YouVersion, ayuno, WordPress/YouTube
  impreuna-edition.ts     la edición: 365 días ya interpretados (sólo plan, ~8 kB) → lo usa el resumen del menú
  impreuna.service.ts     hoy (ClockService), vídeos (instantánea + API en vivo), progreso (localStorage)
  impreuna.config.ts      enlaces fijos (web, YouTube, YouVersion, calendario) + IMPREUNA_REMINDER (08:00 Madrid)
core/push/                web push por temas (OneSignal bajo demanda) → § 7
features/impreuna/        páginas (chunk propio) + paquete de textos impreuna.{ro,es}.json
  day-read/               tarjeta «Citirea zilei» (filas + versión + el día en la app + «Am citit» / «Trimite»)
  reminder/               tarjeta «Amintire zilnică la 08:00» (interruptor) → § 7
features/home/impreuna-teaser/  franja de la portada → § 3 «En la portada»
features/home/bible-week/       la semana del plan de la iglesia en la portada (mismo `core/bible`) → 30-presentation.md
scripts/impreuna-push.mjs aviso diario (GitHub Action impreuna-push.yml) → § 7
```

- **Rutas** (`APP_PATHS.impreuna*`): `/impreuna` (hoy) · `/impreuna/ziua/:day`
  (un día; enlace compartible y destino del calendario) · `/impreuna/plan?luna=N`
  · `/impreuna/tipar?luna=N` (hoja A4, **fuera del shell**, noindex). Todas
  aceptan `?lang=es|ro` (resolver del paquete de textos).
- **Vídeos — automático, dos fuentes** (rediseñado el 12/11/2026: antes
  dependía sólo de la web del proyecto, que publica horas después que YouTube
  y el vídeo del día no aparecía por la mañana):
  1. **Instantánea** (`media.json`) generada en cada despliegue por
     `npm run impreuna:sync`: WordPress (vídeo + entrada) y, para los días que
     su web aún no tiene, **YouTube** (vídeo + ponente).
  2. **En vivo, en el navegador**, sólo si a hoy le falta algo: el **vídeo** →
     YouTube (lista de subidas, `parseYoutubeUpload`: título «Ziua N …» y fecha
     de subida a ±3 días, así no entra otro vídeo del canal ni la «Ziua 1» de
     la edición siguiente); la **entrada** (enlace «Motive de rugăciune») →
     WordPress. Se fusionan sin pisarse (`mergeDays`: lo nuevo rellena, no
     borra). La página lo intenta con cada tic del reloj (cada minuto con la
     pestaña visible y al volver a ella) y el servicio pregunta **como mucho
     cada 30 minutos** y sólo por lo que falte. Así el vídeo sale a las 23:15
     sin que nadie haga nada, y el enlace a los motivos cuando su web publique.
  3. Si todo falla (cuota, red), queda la instantánea y el aviso con el canal.
  8 s de plazo por consulta; caché `freshness` en el SW (`impreuna-wp` y
  `youtube-data` en `ngsw-config.json`). Cuota: 1 unidad por consulta, sólo los
  días en que la instantánea no trae el vídeo de hoy. Si su
  web cae, la página sigue con la instantánea y enlaza al canal.
- **Despliegue**: `deploy.yml` corre `npm run impreuna:sync` antes del build
  (`continue-on-error`): cada publicación lleva los vídeos al día.
- **Calendario**: `.ics` estático por idioma, un evento de día completo por día
  («Ziua 315 · Iacov 1»; el primer jueves, «… · Post și rugăciune» con la
  explicación en la descripción), enlaces a bible.com y a `/impreuna/ziua/N`, aviso a las
  07:00, `REFRESH-INTERVAL` semanal. Suscripción `webcal://` (iPhone/Mac/Outlook)
  y `calendar.google.com/calendar/render?cid=` (Android/Gmail):
  `CalendarService.webcalUrlFor()` / `googleSubscribeUrl()`.
- **Progreso**: días marcados en `localStorage` (`elim.impreuna.<año>.read`),
  racha, días pendientes y «marcar todo hasta hoy». Sólo en ese dispositivo
  (se dice en la página). Protegido con try/catch.
- **Menú**: entrada en `Program` (icono `book-open`) con resumen vivo
  «Azi · ziua 315 / Iacov 1» (`NavSummaryService`, sólo importa el plan).
- **PWA**: atajo «Citirea de azi» (2.º del manifiesto, icono
  `shortcut-impreuna-192.png` de `npm run pwa:icons`). Página estática 200 con
  meta propia para compartir (`generate-route-pages.mjs` → `impreuna`).
- **Peso**: chunk de la página ~73 kB raw / 14 kB transfer (con calendario y diálogo).
- **Título de la pestaña**: el día abierto, vía `SeoService.setOverride`
  («Iacov 2 · Azi · Proiectul Împreună», «Psalmii 113…; · 6 oct. · …»). Al inicial sólo
  suma +1,5 kB (rutas, menú, icono). El QR se carga con `@defer (on viewport)`
  sólo en escritorio.

### En la iglesia: anuncio y diapositiva

- **Anuncio de lanzamiento** `proiectul_impreuna` en `church.config.ts`
  (redactado por la IA el 11/11/2026; caduca el **22/11/2026**, dos domingos):
  qué hacer y lo del teléfono en dos columnas (`highlight`), ayuno al pie y
  Psalmul 119:105. Probado contra los límites de `35-announcements.md`
  (`impreuna-data.spec.ts`).
- **Diapositiva** `impreuna` (`features/stage/blocks/impreuna-block/`): cartel
  navy a sangre con la **semana que contiene mañana** (regla `announcedWeek`,
  la misma que el bloque de lectura de la iglesia: el domingo ya anuncia la
  semana que empieza el lunes, con «Începe mâine»), hoy resaltado y lo pasado
  atenuado, el primer jueves con la pastilla «POST», QR a `/impreuna` con la
  dirección escrita y el próximo día de ayuno (con su tema si está cargado). Sólo importa el plan (sin vídeos ni red). Se proyecta sola
  mientras la edición está en marcha; 15 s por defecto. Vigilada por
  `check:projection` (nada bajo 3,2u). Textos en `impreuna_slide.*` del
  diccionario principal (la consola los necesita sin el paquete del módulo).

## 3 · Diseño (línea propia, no el catálogo `ui-*`)

Herramienta de uso diario: manda «qué toca hoy» sin desplazarse.

- **Contenedores**: `@include container` (el de todos los módulos: tope +
  márgenes **por fuera**). Antes el margen iba dentro del tope y, desde ~1550 px,
  el módulo quedaba 58 px más estrecho por lado que la cabecera y las demás
  páginas (medido a 1920: 293–1617 frente a 235–1675; corregido el 12/11/2026).
- **Cabecera** banda navy compacta (≈ 200 px en escritorio; 171 px en el móvil,
  donde se omite la entradilla para que el día suba): marca, avance
  del año **«Azi: ziua 315 din 365»** (dice «hoy»: el día abierto puede ser
  otro) y pestañas **Citirea zilei** · Planul complet · Cum funcționează (la
  pestaña ya no se llama «Azi»: también se ven otros días). El `h1` global es
  navy: aquí se fuerza `--c-on-band`.
- **El día** (≥ lg): rejilla `1fr + 21–23rem`.
  - **Barra del día** (auditoría del 11/11/2026, a petición del usuario): la
    **fecha es un botón** con icono de calendario y flecha («Marți, 6
    octombrie ▾») que abre el calendario en un `<dialog>`; a su lado, la
    **posición respecto a hoy** (`relativeDay`, `Intl.RelativeTimeFormat`:
    «AZI» sólido navy, «Ieri», «Acum 36 de zile», «Peste 5 zile» neutros);
    a la derecha ‹ › día a día y «Azi» (sólo cuando no se está en hoy). Hijos
    directos de una rejilla: en el móvil la fecha ocupa todo el ancho (como un
    selector, flecha a la derecha) y debajo van «dónde cae» a la izquierda y
    ‹ Azi › a la derecha; desde `sm`, una sola fila.
  - Lectura en display 1,65–2,5 rem y, debajo, el control **Citirea zilei**
    (`day-read/`, 12/11/2026; sustituye al botón «Citește Iacov 2», que no
    decía en qué versión, cuánto era ni dónde se abría). Ver «Citirea zilei»
    más abajo. Vídeo 16:9 *lite*.
  - Primer jueves: **panel de post și rugăciune** (qué es, tema del mes si
    está cargado, cinco motivos oficiales o los del mes, fuente enlazada). La
    víspera, una línea «Mâine este zi de post și rugăciune · Vezi ziua».
- **Citirea zilei** (`features/impreuna/day-read/`, sobre las piezas
  compartidas `shared/bible/`: `app-bible-passages` = filas y
  `app-bible-options` = versión y tienda; las mismas en la portada y en
  Citirea Bibliei): una tarjeta, todo lo de leer junto.
  - **Una fila por pasaje** (datos, no marcado; 1 en los días de NT, 2–3 en
    los de Psalmi y Proverbe, con el total arriba: «Citește azi: 3 texte ·
    18 versete · ≈ 2 min»): icono del libro en el color del día (navy NT, oro
    Psalmi y Proverbe), «Citește Iacov 2», **versículos y minutos** («26 de
    versete · ≈ 3 min», plural rumano con `Intl.PluralRules`: 1 verset ·
    2–19 versete · 20+ de versete) y, aparte, **Ascultă** (audio de bible.com;
    en el móvil sólo el icono).
  - **Pie**: versión **Cornilescu | RVR 1960** (control segmentado; cambia
    todos los enlaces; sigue al idioma de la web hasta que se elige y luego se
    recuerda), **«Biblia: ziua 317»** (el día en el plan de la app; nombre
    accesible completo), la **tienda** cuando toca y, proyectadas desde la
    página, **«Am citit» · «Trimite»** (`<div readTools>`): leer y cerrar la
    lectura van juntos. A 375 px: fila 56 px + una línea de versión y plan +
    la de acciones = **155 px** (antes 203, al quitar la versión repetida y
    acortar el plan; medido).
  - **Abrir en la app Biblia si está** (`core/bible/bible-link.service.ts`).
    Ninguna web puede preguntar qué apps hay instaladas; lo que sí se puede es
    pedírselo al sistema y saber qué pasó:
    - **Android** (Chrome, Edge, Samsung Internet): enlace
      `intent://www.bible.com/bible/191/JAS.2.VDC#Intent;scheme=https;package=com.sirma.mobile.bible.android;S.browser_fallback_url=…;end`
      en la misma pestaña. Con la app, se abre en el pasaje (y si la página se
      oculta en < 2,5 s queda `installed`). **Sin la app, Chrome vuelve** a
      `/impreuna/ziua/<n>?biblia=lipsa&text=<USFM>`: la página lo marca
      `missing` (en `localStorage`, `elim.bible.app`), limpia la dirección y
      enseña arriba **«Aplicația Biblia nu este pe acest telefon»** con
      **Instalează din Google Play** y **Citește în browser**. Desde entonces
      los enlaces van a bible.com en otra pestaña y el pie ofrece «Instalează
      aplicația Biblia» (oro) + «Am instalat-o» (vuelve a intentarlo). Si la
      instala, bible.com la abre igual (App Links verificados).
    - **iPhone / iPad**: bible.com; el enlace universal abre la app si está y,
      si no, la web (que ofrece la App Store). No se puede saber cuál pasó:
      «Aplicația Biblia (App Store)» queda discreta en el pie.
    - **Firefox de Android y navegadores integrados**: bible.com (no entienden
      `intent:`). **Ordenador**: bible.com en otra pestaña, sin tienda.
  - Datos de **versículos y minutos**: `core/bible/bible-verses.json`
    (versículos por capítulo de los 66 libros y palabras por versículo de cada
    libro, de la KJV de dominio público; misma división que Cornilescu y la
    RVR1960 salvo detalles como 3 Juan). Minutos = versículos × palabras por
    versículo × 1,1 (rumano y español) ÷ 180 palabras/min, redondeado, mínimo
    1. Sólo en el chunk de la página (~2 kB comprimido).
  - Al limpiar `?biblia=lipsa` hay una navegación que borra el título propio
    de la pestaña: el efecto del título también depende de `NavigationEnd` y lo
    repone aunque el día no cambie.
  - Accesibilidad: cada fila tiene nombre completo («Citește Iacov 2 în
    Biblie, Cornilescu: 26 de versete, cam 3 min»), versión con
    `aria-pressed`, aviso con `role="status"`; axe (WCAG 2.2 AA) sin
    incumplimientos con y sin aviso; 320 · 375 · 760 · 1280 sin desbordes.
  - Detalles medidos al montarlo: el total de la cabecera es la **suma de
    las filas** (redondear el total aparte daba 10 min con filas de 4 + 5);
    gris de texto pequeño derivado del texto (`--bp-muted`, ≥ 4,5:1 en
    cualquier página: en la de los bloques `--c-muted` daba 4,26); al volver
    de Android la página **salta al aviso** cuando el router ya ha
    restaurado el scroll (si no, quedaba arriba y el aviso fuera de vista).
- **En la portada** (`features/home/impreuna-teaser/`, 12/11/2026): franja
  navy, la del módulo, tras la semana de Citirea Bibliei (12/11/2026: el tablero de eventos subió bajo los avisos) y antes de las familias
  (la vida espiritual de la semana, junta). Tres zonas: **qué es** (eyebrow
  «Cultul Penticostal · Ediția 2026», título, entradilla —oculta en el móvil—
  y avance «Ziua 316 din 365» con barra oro) · **hoy** (fecha, las mismas
  filas de lectura en una tarjeta blanca y una línea: ayuno, «Mâine: Iacov 3»
  y, si ya marca lo que lee, «Seria ta: N zile») · **la meditación**
  (miniatura `mqdefault` + ponente → `/impreuna#video`) y **«Vezi ziua
  completă»**. Medido: 183 px de tarjeta a 1280 (antes 242, con la miniatura
  en vertical), 311 px a 900, 399 px a 375. `@defer (on viewport)` con hueco
  reservado de ese alto: el servicio, los vídeos y los versículos no pesan en
  la carga inicial (chunk propio de 3,6 kB comprimido; el inicial no cambia).
  En Android sin la app, Chrome vuelve a la página del día del módulo (allí
  está el aviso), no a la portada. Sólo con la edición en marcha.
- **Citirea Bibliei** (el plan de la iglesia, `/media/citirea-bibliei`) usa
  las mismas piezas: ver `30-presentation.md` → «Bloque Citirea Bibliei». Y
  la página de Proiectul Împreună lo enlaza en «Linkuri utile» (los dos planes
  se encuentran entre sí).
- **Lateral**: **calendario del plan** (`day-calendar/`) y progreso. Sustituye
  a la lista «Săptămâna aceasta», que seguía al día abierto y hacía creer que
  se estaba en la semana actual. Una codificación por estado, sin mezclar:
  **día abierto = relleno navy · hoy = aro navy · leído = punto verde · post =
  fondo oro** (abierto + hoy = doble aro; abierto + post = aro oro). Leyenda
  bajo la rejilla; al pasar el ratón, la lectura del día; enlace «Planul
  complet». Días de la semana a tres letras («LUN MAR MIE…»: la inicial en
  rumano no distingue marți de miercuri). Al hojear otro mes aparece «Azi»
  junto al nombre del mes (vuelve y, si hace falta, abre hoy). Patrón *grid* de WAI-ARIA: una casilla tabulable, flechas día /
  semana, Inicio / Fin, RePág / AvPág = mes, Intro / Espacio abre;
  `aria-current="date"` en hoy, `aria-selected` en la abierta y el estado en el
  nombre accesible. Casillas cuadradas derivadas del ancho (`aspect-ratio`,
  tope 2,75 rem).
- **Diálogo** del calendario (`<dialog>` + `showModal`): imprescindible en el
  móvil, donde el lateral queda bajo el vídeo. Foco al abrir en el día
  abierto; Esc o clic fuera cierran; botón «Mergi la ziua de azi».
- **Anillo de foco propio** (`imp.focus`): el global `focus-ring` ponía
  `border-radius: inherit` y convertía los días (círculos) y las píldoras en
  cuadrados al enfocarlos (el global ya no lo hace, 12/11/2026). Color: el del
  token por superficie (`45-design-system.md` → «Foco»); la cabecera navy y
  el vídeo declaran `--c-focus-on-dark`.
- Debajo, franja **«Pe telefonul tău»** de mosaicos `auto-fit minmax(13rem)`
  con el QR a la derecha de su cabecera.
- **Colores de tipo de día**: navy = Noul Testament, oro profundo = Psalmi și
  Proverbe (mixin `kind-colors`). Barras con pseudo-elemento o borde, **nunca
  `box-shadow: inset` sobre esquina redonda** (Chrome pinta filetes fantasma).
- **Contraste**: el módulo redefine en su `:host` `--c-muted` a
  `color-mix(text 76 %, surface)` (≈ 5,5:1); el global (66 % de opacidad) da
  ≈ 4,3:1 y aquí va en letra pequeña.
- **Plan**: un mes cada vez; selector de 12 meses (6 × 2 en móvil) con barra de
  avance por mes; tabla real en escritorio; por debajo de `md` cada fila es una
  ficha de 3 líneas con el ✓ de 44 px. El primer jueves lleva la etiqueta oro
  «Post» (también en la hoja A4). La lectura de cada fila abre **el día en la
  web** (con «Citește», vídeo y «Am citit»), no bible.com: un enlace de tabla
  que saca del sitio sorprendía.
- **Progreso**: «Marchează tot până azi» es masivo, así que deja 12 s un
  «Am marcat N zile · Anulează» (`markThrough` devuelve el estado anterior,
  `restoreRead` lo repone).
- **Vídeo**: miniatura + botón; YouTube (`youtube-nocookie`, autoplay) sólo al
  pulsar. Sin rótulo de ponente encima: las miniaturas ya lo llevan impreso.
- **Hoja A4**: filas de 6,7 mm → un mes de 31 días ocupa 268 de 277 mm útiles
  (comprobado imprimiendo a PDF con Chrome: 1 página). Leyenda con bordes (los
  fondos no se imprimen por defecto).
- Responsive verificado con `responsive-audit.snippet.js` en 320 · 375 · 768 ·
  1024 · 1280 · 1920 (sin scroll horizontal, solapes ni recortes; el único aviso
  es la insignia «Adaptat 100 %» del pie global, que guarda su globo oculto).
- Accesibilidad: axe-core (WCAG 2.2 AA + buenas prácticas) sin incumplimientos
  del módulo; el texto de la cabecera sobre su degradado, medido a mano,
  ≥ 6,6:1 incluso sobre el halo oro.

## 4 · Recetas

**Refrescar vídeos a mano** (no hace falta: la página los trae sola y cada
deploy refresca la instantánea): `npm run impreuna:sync` → reescribe
`data/2026.media.json` (WordPress + YouTube) y los `.ics`; avisa por consola de
las erratas de su web. `--offline` sólo regenera los `.ics`. La clave de
YouTube sale de `YOUTUBE_API_KEY` o, si no, de `church.config.ts`.

**Edición nueva (p. ej. 2027)**, en diciembre, cuando publiquen el plan:
1. Averiguar qué plan siguen (artículo de anuncio / primeras entradas de enero).
   Si es de YouVersion, su id; categoría de WordPress `proiectul-impreuna-2027`.
2. `scripts/sync-impreuna.mjs` → `EDITIONS[2027] = { youversionPlan, youversionSkipped: [], wpCategory }`.
3. `npm run impreuna:sync -- --plan --year 2027` (≈ 2 min: 366 páginas).
4. `core/impreuna/impreuna-edition.ts` y `impreuna.service.ts`: cambiar los
   imports a `data/2027.*.json`; `impreuna-data.spec.ts`: actualizar los días de
   referencia. `npm test`.
5. Si a mitad de año se saltan o repiten un día (como el 82 de 2026): añadirlo
   a `youversionSkipped`, `--plan` de nuevo y comprobar con la consola del
   script que no quedan diferencias salvo erratas.

**Versículos por capítulo** (`bible-verses.json`): `npm run bible:verses`
lo regenera desde github.com/aruljohn/Bible-kjv y comprueba los totales (66
libros, 1.189 capítulos, 31.102 versículos). No hace falta para una edición
nueva: ya están los 66 libros; `bible-verses.spec.ts` avisa si algún pasaje
del plan se queda sin versículos.

**Tema del ayuno del mes** (cuando el Cult publique la «chemarea lunară la
post» en Facebook / YouTube): una entrada en `IMPREUNA_FASTING_THEMES`
(`core/impreuna/impreuna.config.ts`) con `date` (el primer jueves), `theme` en
rumano, `reasons` (opcional; sin ellos salen los cinco motivos generales) y
`source` (el enlace del post o vídeo). Aparece solo en el panel del día, en
«Cum funcționează» y en la diapositiva.

**Si su web cambia de formato**: `parseWpPost` (en el script **y** en
`impreuna-plan.ts`, misma regla, probados ambos) lee título y `embed/<id>`.

## 5 · Implantación en la iglesia (propuesta)

Lo que la web ya resuelve: cada persona abre `/impreuna` (o el atajo / el
calendario) y tiene el texto en su idioma, el vídeo, su progreso y el plan.
Pasos sugeridos para lanzarlo — **no hechos en código, los decide la iglesia**:

1. **Anunț** de lanzamiento: hecho (`proiectul_impreuna`, hasta el 22/11);
   se proyecta y queda en `/anunturi`. Revisar el tono antes de leerlo.
2. **Hoja impresa** del mes (`/impreuna/tipar`) para quien no usa móvil:
   repartir a principio de mes; lleva QR a la página.
3. **Grupo de WhatsApp**: el botón «Trimite» del día comparte texto + enlace.
4. **Amintire zilnică** (§ 7) en cuanto esté OneSignal: anunciarla el domingo
   («activați clopoțelul de pe pagină»). Para quien no la pueda usar (iPhone
   sin instalar la web, navegadores raros), la **suscripción al calendario**:
   aviso diario a las 07:00 sin instalar nada.
5. **Primer jueves** (ayuno): la página lo explica ese día y avisa la víspera;
   la diapositiva del domingo anterior lo marca en su fila. Cargar el tema del
   mes en cuanto el Cult lo publique (receta en «Recetas»).
6. **Diapositiva** de la semana con QR: hecha (bloque `impreuna`, sale sola
   en la rotación tras «Citirea Bibliei»; se apaga desde el panel si no toca).

## 6 · Pruebas

- `core/impreuna/impreuna-plan.spec.ts` — lógica pura (formatos RO/ES, salto
  del 82, semana, rejilla del mes, ayuno, posición relativa, racha, WordPress).
- `features/impreuna/day-calendar/day-calendar.component.spec.ts` — TestBed:
  huecos del mes, estados (abierto, leído, ayuno, hoy), una sola casilla
  tabulable, clic y teclado (flechas, Inicio/Fin, AvPág, límites).
- `features/stage/blocks/impreuna-block/impreuna-block.component.spec.ts` —
  semana anunciada (también el domingo), «POST» el primer jueves, QR.
- `core/impreuna/impreuna-data.spec.ts` — datos generados (365 días, libros
  válidos, ids de vídeo, días de referencia, 27 libros NT / 150 salmos / 31
  proverbios) y cableado (rutas, shell, menú, claves i18n).
- `core/impreuna/impreuna.service.spec.ts` — TestBed: hoy, progreso y
  persistencia, `localStorage` corrupto, consulta en vivo (sólo si falta el
  vídeo, una vez, fusión, caída de su web).
- Citirea zilei: `core/bible/bible-refs.spec.ts` (formatos, bible.com, audio,
  intent; textos en rumano: tramos, varios libros, ţ/ț, versículos sueltos,
  texto compuesto, lo desconocido se descarta y **todas las lecturas del plan
  de la iglesia se entienden**), `core/bible/bible-verses.spec.ts` (66 libros, 1.189
  capítulos, 31.102 versículos; capítulos y tramos; minutos; todos los pasajes
  de la edición con versículos), `core/bible/bible-link.service.spec.ts`
  (Android con intent y vuelta, `missing` recordado y «Am instalat-o», la app
  abierta si la página se oculta, iPhone, Firefox de Android y vistas
  integradas, ordenador sin tienda, versión elegida y recordada) y
  `features/impreuna/day-read/day-read.component.spec.ts` (uno y varios
  textos, oro, versión que cambia todos los enlaces, intent en Android, aviso
  de app ausente con Google Play, dirección limpia y `?text=` raro descartado,
  App Store en iPhone), `shared/bible/bible-passages.component.spec.ts`
  (capítulos del plan de la iglesia con rótulo y total, «Citește …» sin
  rótulo, vuelta de Android a `returnPath`, plurales 1 · 2–19 · 20+),
  `features/home/impreuna-teaser/impreuna-teaser.component.spec.ts` (lo de
  hoy, meditación, mañana y módulo; ayuno víspera y día; racha; fuera de la
  edición no sale) y `features/stage/blocks/bible-block/bible-block.component.spec.ts`
  (hoy elegido y sus capítulos, elegir otro día, enlace a Împreună, la
  proyección sin cambios).
- Ponentes en NFC: `parseYoutubeUpload` / `parseWpPost` (app y script)
  normalizan el título (YouTube mandaba «a» + breve sueltos: 81 nombres de la
  instantánea estaban así; corregidos) y `impreuna-data.spec.ts` lo vigila.
- `scripts/sync-impreuna.test.mjs` — script sin red (parser, YouVersion,
  saltos, formato, `.ics` plegado a 75 octetos y con el ayuno, JSON).
- Notificaciones (§ 7): `core/push/push.service.spec.ts` (permiso antes del
  SDK, alta y etiqueta, cerrado/denegado, SDK bloqueado al activar y al
  desactivar, `reconcile`, cambio de idioma, almacenamiento corrupto,
  `pushSupport`, `pushOriginAllowed`), `core/push/onesignal.provider.spec.ts`
  (un solo `init` con service worker, bienvenida, clic y persistencia;
  bienvenida apagada en la comprobación; SDK bloqueado → error limpio y
  reintento sin doble `init`), `core/push/push-schedule.spec.ts` (08:00 de Madrid en
  verano, invierno y los días de cambio de hora),
  `features/impreuna/reminder/impreuna-reminder.component.spec.ts` (oculta sin
  App ID, estados, alta con bienvenida, baja, bloqueado, sin soporte) y
  `scripts/impreuna-push.test.mjs` (horarios de la Action en verano e
  invierno, UUID v5 con el vector de la RFC, contenido RO/ES con ayuno, víspera
  y sin vídeo, prueba a una suscripción, reintentos, YouTube → web →
  instantánea, `main` en seco). Dobles en `core/push/push.testing.ts`.
- QA de la tarjeta (12/11/2026, con un SDK falso con la API de v16 y sin red a
  OneSignal): estados apagado, error, cerrado, activo, bloqueado; alta y baja
  completas; cambio de idioma → etiqueta `es`; 320 · 375 · 810 · 1280 sin
  scroll horizontal; axe (WCAG 2.2 AA) 0 incumplimientos; contraste del
  interruptor apagado 5,7:1 (antes 1,1) y del icono activo 3,3:1; sin App ID no
  ocupa sitio ni carga nada.

## 7 · Notificaciones: amintire zilnică a las 08:00

Interruptor «Amintire zilnică la 08:00» arriba del lateral de `/impreuna` (en
el móvil, justo después del día). Quien lo activa recibe cada mañana, a las
08:00 de España, una notificación con el texto del día, la meditación en vídeo
(miniatura, ponente y botón) y el ayuno del primer jueves (y su víspera);
tocarla abre la página del día.

**Estado (12/11/2026):** código hecho y OneSignal configurado: organización
INEB, app «Biserica Elim Arganda» (plan Free), plataforma Web con **Custom
code** y Site URL `https://elimarganda.com`; App ID
`438db2da-b582-4eca-8b0e-8bd24bf61e9b` y Safari Web ID en `church.config.ts`;
App API Key «GitHub Action Împreună» (sin lista de IPs) guardada como secreto
`ONESIGNAL_API_KEY` del repositorio. **Falta** desplegar y probarlo en un móvil
(§ 7.4, pasos 4 y 5). Si la Action se ejecuta sin la clave o sin el App ID,
termina con un aviso que dice qué falta y no envía nada.

### 7.1 · Plan maestro: opciones y revisión

| Opción | Veredicto |
| --- | --- |
| Alarma del calendario `.ics` | Ya existe (07:00), pero iOS quita por defecto las alertas de los calendarios suscritos y Google no avisa de los suscritos: no sirve como notificación fiable. Queda de complemento. |
| Notification Triggers / Periodic Background Sync | Abandonada / sin hora fija (decide el navegador). |
| Web push propio (VAPID + Cloudflare Worker + KV) | Control total, pero es un backend: altas, bajas, caducidades, cifrado y cron propios. |
| Firebase Cloud Messaging | Suscribir a un tema exige servidor: igual de complejo. |
| Telegram / WhatsApp | Otra app; no se controla desde el módulo. |
| **OneSignal (web push) + GitHub Action** | **Elegida.** Sin servidor propio (encaja con «sin backend»): guarda suscripciones, etiquetas, idiomas y bajas; iOS 16.4+ (web instalada), Android y escritorio. Plan gratuito: 10.000 suscriptores por envío, API ilimitada. |

**Revisión del primer diseño** (crear el aviso la víspera con `send_after` y
entrega por zona horaria `delayed_option: "timezone"`), descartado:
- no consta que el plan gratuito incluya envíos diferidos ni entrega por zona
  horaria (en su tabla de precios, «Time Delayed Sends» e «Intelligent
  Delivery» aparecen sin incluir; «Timezone Delivery», sin dato legible);
- con la entrega por zona horaria, un aviso que se crea cuando ya pasó la hora
  de alguien le llega **al día siguiente** (lo dice su documentación): podría
  llegar el texto de ayer.

→ **Se envía en el momento** desde una Action que arranca antes y espera a las
08:00 exactas. Hora única, la de la iglesia: en Rumanía llega a las 09:00 (la
tarjeta enseña la hora local de cada uno y, si no es la de España, la aclara).

### 7.2 · Cómo funciona

```
/impreuna ─ app-impreuna-reminder ─ PushService (core/push) ─ PUSH_PROVIDER → OneSignalProvider (SDK v16, bajo demanda)
            permiso nativo en el toque → SDK → optIn → etiqueta impreuna = 'ro' | 'es'
impreuna-push.yml (05:05 · 05:35 · 06:05 · 06:35 UTC) → scripts/impreuna-push.mjs → API de OneSignal (filtro impreuna = idioma)
```

**Cliente**
- `core/push/push.service.ts` — sólo en la web pública y en local
  (`pushOriginAllowed`: OneSignal rechaza cualquier otro origen, p. ej. un
  proxy `*.translate.goog`). Temas por etiqueta (valor = idioma). `enable()`
  pide el permiso nativo **antes** de cargar nada (Safari sólo lo concede
  dentro del gesto). `disable()` quita la etiqueta y da de baja; si el SDK no
  carga (bloqueador), corta la suscripción del propio navegador. `reconcile()`
  al abrir (en reposo, una vez por sesión) rehace el alta si se perdió y
  re-etiqueta; un `effect` sigue al idioma de la web. Estado en
  `localStorage` (`elim.push.topics`) para pintar al instante.
- `core/push/onesignal.provider.ts` — SDK sólo si alguien activa (o lo tenía
  activo). Service worker propio en `/push/onesignal/` (ámbito separado del
  ngsw de `/`; fichero `src/push/onesignal/OneSignalSDKWorker.js`, asset de
  `angular.json`). Bienvenida localizada que OneSignal manda al darse de alta:
  confirma al momento que funciona. Fijado en el código (no depende del
  panel): al tocar el aviso se reutiliza la pestaña o app de la web y va a su
  URL (`notificationClickHandlerMatch: 'origin'` + `navigate`), y en escritorio
  no se queda fija en pantalla (`persistNotification: false`).
- `core/push/push-schedule.ts` — horas en `Europe/Madrid` con `Intl` (cambios
  de hora incluidos). La usan la tarjeta y el script.
- `features/impreuna/reminder/` — la tarjeta. Estados: apagado (qué llega +
  privacidad), activando, activo («Activă · mâine: Iacov 3»), bloqueado por el
  navegador (cómo desbloquear), iPhone sin instalar (Distribuie → Adaugă pe
  ecranul principal), navegador integrado de Android (abrir en Chrome), sin
  soporte. **Toda la tarjeta es el interruptor** (`role="switch"`; el `::after`
  del botón la cubre); el `h2` va fuera del botón y el resultado se anuncia en
  `role="status"`. Interruptor apagado con contorno y pulgar grises (5,7:1),
  encendido navy; icono oro activo, ámbar bloqueado.

**Envío** (`scripts/impreuna-push.mjs`)
- **Horario**: GitHub no sabe del horario de verano y retrasa los cron. Cuatro
  arranques; el script espera hasta las 08:00 (si faltan ≤ 65 min), envía aunque
  llegue tarde (≤ 3 h) y si no, sale. Verano: 05:05 principal, 05:35 respaldo;
  invierno: 06:05 y 06:35. `concurrency` los pone en fila.
- **Nunca duplica**: `idempotency_key` = UUID v5 de `impreuna/<fecha>/<idioma>`
  (OneSignal la recuerda 30 días): el respaldo, un `--now` o un reintento
  devuelven el primero (`Idempotent-Replayed`).
- **Reintentos**: 4, con espera creciente o `Retry-After`, ante red caída, 429
  o 5xx. Un 4xx falla y GitHub avisa por correo.
- **Contenido**, una notificación por idioma:

| Parte | Contenido |
| --- | --- |
| Título | `Ziua 316 · Proiectul Împreună`; primer jueves: `Ziua 337 · Post și rugăciune` |
| Línea 1 (la única que Android enseña con imagen) | `📖 Iacov 2 · ▶ Paul Răducanu` |
| Más líneas | `🙏 <tema del ayuno>` si está en `IMPREUNA_FASTING_THEMES`; víspera: `🙏 Mâine: zi de post și rugăciune` |
| Imagen | Miniatura del vídeo (`sddefault`: sus franjas negras caen fuera del recorte 2:1) |
| Botones (Chrome / Edge) | `📖 Citește` → bible.com (VDC / RVR1960) · `▶ Video` → YouTube |
| Al tocar | `/impreuna/ziua/<N>` |
| Iconos | `shortcut-impreuna-192.png`; insignia `badge-impreuna-96.png` (barra de estado de Android, `npm run pwa:icons`) |
| Vida | `ttl` 14 h (hasta las 22:00); `web_push_topic`: el de hoy sustituye al de ayer |

- Textos en los packs (`impreuna.push.*`); lecturas, fechas, ayunos y App ID,
  del TypeScript de la app (`scripts/lib/load-ts-module.mjs`): una sola fuente.
- **Vídeo**: YouTube (subido a las 22:15 UTC de la víspera) → web del proyecto
  → instantánea del repo. Sin vídeo sale igual, con la lectura.

### 7.3 · Privacidad

- El SDK sólo se carga tras el toque, o si ya estaba activo; el resto de
  visitas no habla con OneSignal.
- OneSignal guarda la suscripción del navegador, idioma, zona horaria y la
  etiqueta `impreuna`: ni nombre, ni correo, ni cuenta. Lo dice la tarjeta; la
  baja es el mismo interruptor. En el plan gratuito borra las suscripciones
  sin actividad en 18 meses.

### 7.4 · Activación (la iglesia, ~15 min)

1. Cuenta y app en onesignal.com (**hecho**). Plataforma Web: ⚙ Settings →
   **Push & In-App** → **Web** → configurar así (revisado sobre su panel el
   12/11/2026):

   | Sección | Valor |
   | --- | --- |
   | 1 · Integration | **Custom code** (no «Typical site»: con él, OneSignal ignora las rutas del código, busca su service worker en `/`, que no existe, y pone un aviso de permiso en todas las páginas a los 10 s) |
   | 2 · Site setup | Site name «Biserica Elim Arganda» · Site URL `https://elimarganda.com` (sin `www`) · icono `https://elimarganda.com/assets/pwa/icon-any-512.png` |
   | 3 · Advanced | Auto resubscribe ✔ · Safari certificate ✘ |

   Con Custom code el panel ya no enseña avisos de permiso, bienvenida, clic,
   persistencia ni rutas del service worker: van en el código
   (`onesignal.provider.ts`): sin aviso propio de OneSignal (el permiso sólo
   lo pide el interruptor), bienvenida en RO/ES, clic Same origin + Navigate,
   sin persistencia en escritorio y service worker en `/push/onesignal/`.

   Al guardar, OneSignal pide «Upload service worker file» y «Add code to
   site»: **no hace falta ninguno** (el worker ya está en `/push/onesignal/` y
   el arranque en `onesignal.provider.ts`, sólo en `/impreuna` y bajo demanda,
   no en todas las páginas). De su fragmento se copian `appId`
   (`oneSignalAppId`) y `safari_web_id` (`oneSignalSafariWebId`, para el Safari
   antiguo de macOS); su `notifyButton` (campanita flotante) no. → «Finish».

   El código y el fichero que ofrece al guardar no hacen falta: ya están.
2. **App ID** → `oneSignalAppId` en `src/app/core/church.config.ts` (es
   público; **hecho**).
3. Settings → Keys & IDs → **App API Key** → GitHub → Settings → Secrets and
   variables → Actions → secreto **`ONESIGNAL_API_KEY`** (o
   `gh secret set ONESIGNAL_API_KEY --repo beni-cioarba/MEDIA-ELIM`, que la
   pide sin dejarla en el historial). Nunca en el código ni en un chat.
   **Hecho** el 12/11/2026. Si se filtra: borrarla en OneSignal (⋮ de su fila),
   crear otra y repetir `gh secret set`.
4. Desplegar. Abrir `/impreuna` en el móvil y activarlo → llega la bienvenida.
5. Probar el aviso real: Actions → «Proiectul Împreună · amintire 08:00» → Run
   workflow → `test` + el Subscription ID (OneSignal → Audience →
   Subscriptions). `dry-run` enseña el del día sin enviar.
6. Desde el día siguiente llega solo a las 08:00; cada ejecución deja su resumen.

### 7.5 · Operación

- `npm run impreuna:push -- --dry-run [--date AAAA-MM-DD] [--at <ISO>]`:
  compone sin enviar (sin clave) y dice qué haría la Action a esa hora.
- Un día falló: Actions → Run workflow → `now` (no duplica).
- Apagarlo: borrar el secreto (la Action termina con un aviso) o vaciar
  `oneSignalAppId` (desaparece el interruptor).
- **60 días sin commits** en un repositorio público: GitHub desactiva los cron
  y avisa por correo → Actions → reactivar el workflow.
- Edición nueva: nada propio; usa `IMPREUNA_EDITION`. Fuera de la edición no
  envía, y la tarjeta se oculta cuando acaba.

### 7.6 · Límites conocidos

- iPhone / iPad: sólo con la web en la pantalla de inicio (iOS ≥ 16.4); la
  tarjeta lo explica. Navegadores integrados (Instagram, WhatsApp): no.
- Hora única (España). Si el plan llegara a incluir la entrega por zona
  horaria, «08:00 de cada uno» sería `delayed_option` en `buildMessage` (ver
  la revisión de § 7.1 antes de tocarlo).
- Imagen y botones: Chrome / Edge (Android, Windows). Safari y Firefox enseñan
  título y texto; macOS no enseña imagen.
- Los bloqueadores de anuncios suelen bloquear OneSignal: la tarjeta lo dice
  al fallar y sugiere revisarlo.

### Seguir el plan en la app Biblia (12/11/2026)

Una sola tarjeta, en «Cum funcționează» junto a «Ritmul săptămânii» y «Ai
rămas în urmă?» (`#aplicatia-biblia`): se lee una vez y ya, así que no va en
la tarjeta del día, que se mira a diario (allí sigue sólo el chip «Ziua N în
plan»). Tres pasos (abrir el plan y «Start this Plan»; día de la app = día
del proyecto + 1 por el salto del día 82; el número de la app junto a cada
lectura) y dos enlaces: el plan (`youversionPlanUrl`) y **hoy en la app**
(`youversionDayUrl`, `appToday` en el componente; sólo con la edición en
marcha). Sustituye a la nota `how.youversion_text`. Mismo alto que sus
vecinas (255 px a 1024): los textos se recortaron para no estirar la fila.

**Portada en blanco** (12/11/2026, a petición del usuario): la franja de
Împreună y la del concurso Talantul pasan de navy a **tarjeta blanca**, la
misma superficie que «Când ne întâlnim» y Citirea Bibliei (borde
`rgb(26 54 93 / .1)`, radio 18 px): títulos navy, rótulos y cifras en oro
750, texto secundario `--c-muted`, botón navy macizo. Fuera degradados,
rejilla y sombras; el anillo de foco vuelve al de claro. Medido a 1440:
Împreună 179 px (antes 190), Talantul 125 px (antes 156); a 375: 371 / 272.
axe sin fallos de contraste.

