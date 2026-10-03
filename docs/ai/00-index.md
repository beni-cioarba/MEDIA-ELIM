# 00 · Índice y mapa del repositorio

> Shard de arranque. Si algo no está aquí, está en el shard que se indica.
> Coste aproximado de lectura: ~1,5 KB.

## Mapa de carpetas

```
src/styles/                 ⭐ Design system global (nivel app)
  _tokens.scss              Primitivas: paletas, escalas, breakpoints (Sass)
  _semantic.scss            Emite las variables CSS `--c-*`, `--sp-*`, `--fs-*`…
  _mixins.scss              from()/until(), focus-ring, surface, container…
  _theme.scss               Tema de Angular Material (M2, navy + dorado)
  _base.scss                Reset y estilos de elemento
  _utilities.scss           Utilidades `u-*` (conjunto cerrado)
  _material-overrides.scss  Ajustes de marca para overlays de Material
  _ds.scss                  Barril público: `@use 'ds' as *;`
src/app/
  app.component.ts          Raíz: sólo <router-outlet>
  app.config.ts             Providers globales (router, i18n, SW, iconos, CHURCH_CONFIG)
  app.routes.ts             Rutas: layout + hijos lazy
  layout/                   ⭐ Envoltorio reutilizable de la web pública
    main-layout/            Shell: nav + <router-outlet> + pie + dock
    top-nav/                Barra superior (mat-menu en escritorio)
    mobile-nav/             Drawer móvil (diferido, cdkTrapFocus, marcas vivas)
    tab-bar/                Barra de pestañas inferior (< lg): una pestaña por bloque de MAIN_NAV
  core/
    church.config.ts        ⭐ TODO el contenido no traducible (datos de la iglesia)
    leadership.config.ts    ⭐ Organigrama: personas, cargos y departamentos
    bible-reading.config.ts GENERADO por scripts/import-bible-plan.py desde el Excel del plan de lectura
    family-prayer.config.ts ⭐ Familias por las que se ora cada semana (una entrada por domingo)
    prayer-causes.config.ts ⭐ Cauzele Bisericii Elim: lista vigente de causas de oración
    talent-contest.config.ts ⭐ Talantul în Negoț: la edición del concurso (fases, examen, recursos, web oficial)
    talent-contest.categories.ts   Talantul în Negoț: libros y versículos por categoría (sólo lo carga la página)
    social-link.model.ts    Modelo de red social
    presentation.service.ts Fullscreen real + fallback CSS simulado
    youtube.service.ts      Directo y últimas emisiones (JSON estático + API)
    i18n/                   Loader de traducciones embebidas (0 HTTP)
    navigation/             ⭐ Rutas con nombre y árbol de menú
      app-paths.ts          APP_PATHS, slugs de bloque, blockPath()
      nav.model.ts          NavItem + type guards
      navigation.config.ts  MAIN_NAV (única fuente del menú; los grupos llevan `path` = su portada)
      nav-summary.service.ts Resumen vivo de cada entrada (portadas de sección y cajón)
    state/
      ui.store.ts           SignalStore de UI (drawer, menús, scroll)
    ui/
      icon-name.ts          Unión de nombres de icono permitidos
      icon-registry.ts      provideElimIcons(): SVG inline en MatIconRegistry
    util/
      iso-date.ts                    parseIsoDate / startOfDay para fechas `YYYY-MM-DD`
    services/
      clock.service.ts               Reloj reactivo + visibilidad de pestaña
      schedule.service.ts            Programa semanal + eventos futuros derivados
      announcements.service.ts       ⭐ Anuncios vigentes (por fecha de caducidad)
      bible-reading.service.ts       Semana del plan de lectura que toca anunciar (la que contiene mañana)
      family-prayer.service.ts       Semana de familias que toca (misma regla), archivo y vistas
      prayer-causes.service.ts       Causas por nombre / por intención
      talent-contest.service.ts      Talantul în Negoț: fases con estado y cuenta atrás
      presentation-blocks.service.ts ⭐ Qué bloques se proyectan (auto/manual) y sus diapositivas
      presentation-display.service.ts QR visible / tamaño del QR / duración por bloque
      presentation-sync.service.ts   ⭐ Canal entre ventanas: elección de líder, estado, órdenes
      projection-window.service.ts   Detecta pantallas y abre/controla una ventana de proyección por pantalla
      carousel.service.ts            Motor del carrusel: plazos (un setTimeout), pausa; nada por fotograma
      calendar.service.ts            Generación de .ics / webcal / Google Calendar
      language.service.ts            ES/RO + persistencia
      logger.service.ts              Log con ámbito (`.prefix('youtube')`)
      pwa-update.service.ts          Auto-actualización del Service Worker
      seo.service.ts / AppTitleStrategy  Título y meta por ruta
  features/
    home/                   Portada pública (hero, bienvenida, accesos, visita)
    nav-hub/                Portada de sección de cada grupo (`/biserica`, `/program`, `/multimedia`)
    about/                  Quiénes somos (historia, pilares, credo, 1ª visita)
    credo/                  Mărturisirea de credință (30 artículos + pack i18n)
    leadership/             Estructura de liderazgo y departamentos
    announcements/          ⭐ Anunțuri: página `/anunturi[/:id]` + tarjeta única (web y proyección)
    family-prayer/          ⭐ Rugăciune pentru familii: página, resumen, ficha, foto entera, acceso desde anuncios
    prayer-causes/          ⭐ Cauzele Bisericii Elim: página + tablero (web y proyección)
    talent-contest/         ⭐ Talantul în Negoț: página para participantes + selector de categoría
    presenter/              ⭐ Panel de control (`/media/control`, sin shell). Consola: `ui-dense ui-dark`
    styleguide/             ⭐ Guía de estilos viva (`/stil`): tokens, primitivas `ui-*` y patrones
    projection/             Ventana de proyección / vista previa (`/media/ecran[?rol=preview]`, sin shell)
    stage/                  ⭐ Escenario proyectable (.stage)
      stage.component.*     Marca, carrusel, QR, controles
      blocks/               Un componente por bloque proyectable
        announcement-block/ bible-block/    socials-block/  streams-block/
        gallery-block/      weekly-block/   upcoming-block/ location-block/
      styles/               Tokens, responsive (web) y proyección (`_projection.scss`)
  shared/                   Componentes reutilizables y "tontos"
    brand-logo/             ⭐ Wordmark ELIM: la única marca de la iglesia en la UI; carpeta autocontenida + README (hoja de marca)
    ineb-logo/              ⭐ Marca INEB en SVG, carpeta autocontenida + README (hoja de marca)
    icon/ social-icon/ lang-switcher/ qr-panel/ footer/ share-button/
    floating-actions/ calendar-sync-button/ presentation-settings/
    page-section/ hero-carousel/ card-carousel/
    doc-toc/                ⭐ Índice lateral con seguimiento del apartado activo (documentos largos)
    styles/                 Parciales SCSS compartidos (botones, page-hero)
src/assets/i18n/{es,ro}.json  ⭐ Todos los textos visibles
src/assets/pwa/               Icono de la app generado (no editar a mano: `npm run pwa:icons`)
scripts/                      Utilidades Node (imágenes, icono de la app, YouTube)
  assets-src/emblema-elim.png Máster del emblema (674 px, no se publica)
.github/workflows/            Deploy a Pages + cron de datos de YouTube
```

## Dónde tocar según la petición

| Petición típica                                     | Fichero(s)                                              |
| --------------------------------------------------- | ------------------------------------------------------- |
| «Añade / retira un anuncio (anunț)»                 | `docs/ai/35-announcements.md` → `core/church.config.ts` → `announcements` |
| «Añade un evento / bautizo / conferencia»           | `core/church.config.ts` → `upcomingEvents`              |
| «Cambia la lista de enfermos / causas» | `docs/ai/37-prayer-causes.md` → `core/prayer-causes.config.ts` (+ `updatedOn`) |
| «PDF de las familias» · «que se pueda descargar la semana» | Se genera solo al publicar; en local `npm run pdf:familii -- --url http://localhost:4310/`. Botón «Descarcă PDF» en cada semana (sólo descarga; compartir = enlace con «Distribuie») — `docs/ai/36-family-prayer.md` → «PDF de la semana» |
| «Familias de esta semana» · «nuevas fotos de familias» | `docs/ai/36-family-prayer.md` → `scripts/import-family-photos.mjs` + `core/family-prayer.config.ts` |
| «Nuevo Excel del plan de lectura bíblica»           | `python scripts/import-bible-plan.py <xlsx>` → regenera `core/bible-reading.config.ts` (`20-content-i18n.md`) |
| «Cambia el horario del culto»                       | `core/church.config.ts` → `weeklyProgram`               |
| «Añade una red social»                              | `core/church.config.ts` → `socials` + i18n              |
| «Cambia quién lleva un departamento»                | `core/leadership.config.ts` (+ i18n si es nuevo)        |
| «Cambia un texto»                                   | `assets/i18n/es.json` **y** `ro.json`                   |
| «Añade fotos de un evento a la galería»             | `scripts/optimize-images.js` + `mediaEvents`            |
| «Proyectar en la pantalla del templo» · «en dos pantallas a la vez» | `/media/control` → Pantallas → «Detectar pantallas» → «Proyectar» en cada una (nada de código; `docs/ai/30-presentation.md`) |
| «Ver cómo queda un anuncio antes del día» | `/media/control` → «Anuncios programados» → Ver / Probar en ventana (`publishedOn` futuro) |
| «La proyección va lenta / se cuelga» | `docs/ai/30-presentation.md` → «Rendimiento» (nada por fotograma, 3 diapositivas montadas) |
| «Que tal bloque no salga al presentar»              | Panel de control (o popover de la ventana), nada de código |
| «Quitar / poner el QR al proyectar»                 | Es la diapositiva «Site-ul bisericii» (bloque `website`): se enciende o apaga como cualquier bloque, sin código — `30-presentation.md` → «Lienzo» |
| «Avisar de que hoy también hay directo» · «que compartan la transmisión» | Panel de control → «Anunță transmisiunea live de azi» (caduca a medianoche; nada de código): «ÎN DIRECT» en la esquina + QR del directo en la diapositiva del QR. `docs/ai/30-presentation.md` → «Aviso de directo» |
| «Que tal bloque dure más / menos» · «hoy no leáis este anuncio» | Panel de ajustes (−/+ segundos por bloque; casilla por anuncio). Defectos en `DEFAULT_DURATIONS_S` |
| «Se cortan los eventos / anuncios al proyectar»     | Se paginan solos (`PresentationBlocksService.expand`, `UPCOMING_PER_SLIDE`) y los anuncios se autoajustan — `docs/ai/30-presentation.md` |
| «Nuevo bloque proyectable»                          | `docs/ai/30-presentation.md` (receta completa)          |
| «Nueva página / sección»                            | `docs/ai/10-architecture.md` (receta completa)          |
| «Añade una entrada al menú»                         | `docs/ai/15-navigation.md`                              |
| «Barra de abajo del móvil» · «portada de una sección» · «algo fijo abajo se solapa» | `docs/ai/15-navigation.md` → «Barra de pestañas y portadas de sección» (`--app-tab-bar-h`) |
| «Estado compartido entre componentes»               | `docs/ai/16-state.md`                                   |
| «Color, espaciado, tipografía, componente Material» | `docs/ai/45-design-system.md`                           |
| «¿Qué clase uso?» · «Necesito una tarjeta / fila / barra» | Abre **`/stil`** y usa la primitiva `ui-*`; catálogo y reglas en `docs/ai/47-design-language.md` |
| «Monto un carrusel o un bloque de escaparate» | `docs/ai/48-carousel-cards.md` — **línea nueva**, calcada de la referencia medida; manda sobre el catálogo dentro de un carrusel o una tarjeta de promoción |
| «Una página larga que hay que poder recorrer» · «Índice / cuprins» | `<app-doc-toc>` (`shared/doc-toc/`): le pasas las entradas ya traducidas y él pone la columna fija, el seguimiento del apartado activo y el plegable de móvil. El anfitrión escucha `(select)` para preparar el destino. Decisiones 34-38 de `docs/ai/47-design-language.md` |
| «Módulo de gestión nuevo (consola)»                 | `host: { class: 'ui-dense ui-dark' }` + `ui-toolbar` + `ui-panel` — `docs/ai/47-design-language.md` |
| «¿Qué logo pongo aquí?» · «Cambia el icono de la app» · «Logo de INEB» | `docs/ai/45-design-system.md` → «Marca» (wordmark `app-brand-logo` / emblema → `npm run pwa:icons` / `app-ineb-logo`; hoja de marca INEB en `shared/ineb-logo/README.md`) |
| «Pantalla completa de la proyección desde el panel» | Botón «Pantalla completa» del panel (`ProjectionWindowService.toggleFullscreen`, gesto delegado) — `docs/ai/30-presentation.md` |
| «¿Se ve bien en móvil?» · «Hazlo responsive»        | `scripts/responsive-audit.snippet.js` en 320 · 375 · 768 · 1024 · 1280 — regla en `docs/ai/40-styling.md` → Responsive |
| «Mejorar rendimiento / carga» · «Nuevo módulo grande» | `docs/ai/75-plan-evolucion.md` (diagnóstico medido + plan por fases) |
| «Textos pequeños al proyectar» · «No cabe en la diapositiva» | `docs/ai/30-presentation.md` → «Legibilidad» (escala de cartel: un anuncio = una diapositiva, jerarquía, autoajuste 1–0,7, `webOnly`); `npm run check:projection` |
| «Subir Angular / dependencias»                      | `docs/ai/50-build-deploy.md` → Node (24 portable en `.tools`) y `ng update` por versiones |
| «Ajusta el diseño / tamaños en proyección»          | `docs/ai/30-presentation.md` (sistema `--pj-u`) + `styles/_projection.scss` |
| «Nuevo panel de anuncios / avisos proyectable»      | `docs/ai/30-presentation.md` (receta del bloque nuevo) |

## Invariantes que nunca deben romperse

1. La app funciona **sin backend**: no añadas llamadas a servidores propios.
2. `es.json` y `ro.json` tienen exactamente las **mismas claves**.
3. Todo componente es `standalone` + `OnPush`.
4. El bundle inicial se mantiene bajo presupuesto (620 kB aviso / 800 kB error).
5. La proyección nunca debe quedarse en blanco: siempre hay ≥ 1 bloque activo.
   Y nunca proyecta contenido caducado: anuncios y eventos se filtran por fecha
   con el reloj compartido (`ClockService`), sin recargar.
6. Los componentes consumen **variables semánticas** (`--c-*`, `--sp-*`, `--ui-*`),
   nunca valores en crudo ni primitivas de `_tokens.scss`. Antes de escribir CSS
   nuevo se mira el catálogo `ui-*` en **`/stil`** (`docs/ai/47-design-language.md`).
7. El menú se define **sólo** en `core/navigation/navigation.config.ts`.
8. **Todo es responsive al 100 %**, de 320 px a 4K, en web, panel y proyección:
   sin scroll horizontal, sin solapes, sin textos recortados. Se verifica con
   `scripts/responsive-audit.snippet.js` en 320 · 375 · 768 · 1024 · 1280 antes
   de dar por hecho cualquier cambio de UI (`docs/ai/40-styling.md`).
