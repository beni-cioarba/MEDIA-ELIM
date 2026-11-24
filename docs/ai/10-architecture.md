# 10 · Arquitectura

## Stack

**Angular 22** (standalone por defecto, signals, `input()`, bloques de control)
· Angular Material 22 con tema **M3** · `@ngrx/signals` 22 · `@ngx-translate/core`
18 (`provideTranslateService`, cargador por idioma) · `@angular/service-worker`
(PWA) · `angularx-qrcode` 22 · SCSS · builder `@angular/build` (esbuild) ·
Vitest como runner de tests. Sin backend. TypeScript 6 en `strict` +
`strictTemplates`. **Node ≥ 22.22 / 24 LTS** (`engines` en `package.json`; en
el hub hay un Node 24 portable en `C:\workspace\.tools\node24`, ver
`50-build-deploy.md`).

Detección de cambios: **zoneless** (`provideZonelessChangeDetection()` en
`app.config.ts`, desde el 17/11/2026; zone.js desinstalado). Toda la app es
OnPush + signals: repinta lo que cambia una signal o un evento de plantilla.
Los `NgZone.run` que quedan son inocuos.

## Bootstrap

`main.ts` → `bootstrapApplication(AppComponent, appConfig)` en el navegador;
`main.server.ts` → lo mismo con `app.config.server.ts` en el **prerender** del
build (ver `50-build-deploy.md` → «Prerender»).

`app.config.ts` provee:

- `provideZonelessChangeDetection()` (**sin zone.js** desde el 17/11/2026: todo
  es OnPush + signals; fuera 35 kB del arranque).
- `provideRouter(APP_ROUTES, withInMemoryScrolling(...), withRouterConfig(...),
  withEnabledBlockingInitialNavigation())` — la primera navegación (chunk y
  resolvers) termina antes de pintar: así el HTML prerenderizado se sustituye
  de una vez, sin fotograma vacío.
- `provideTranslateService({ fallbackLang: 'ro', loader: InlineTranslateLoader })`:
  el JSON de cada idioma es un **chunk propio** (`import()` dinámico); al
  arrancar sólo se carga el idioma activo (~23 kB) y el otro sólo si se cambia.
  Como son chunks del build, el Service Worker los precachea y no hay petición
  de red ni condición de carrera: `LanguageService.init()` devuelve la promesa
  de carga y el inicializador espera.
- `provideAppInitializer(() => inject(LanguageService).init())` y otro para
  `PwaUpdateService.init()`.
- `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode() })`
- `CHURCH_CONFIG` ya no se provee aquí: el token lleva `factory` propia.

**Código que corre también en Node.** Las páginas públicas se pintan en el
build, así que constructores, inicializadores de campo, `effect` y plantillas
no pueden tocar `window`, `document` global, `location`, `localStorage`,
`matchMedia`, `requestAnimationFrame` ni `BroadcastChannel` (Node 24 tiene
este último y abriría un canal de verdad). Se usa `inject(DOCUMENT)`,
`PlatformLocation`, `afterNextRender` o `injectIsBrowser()`
(`core/util/platform.ts`). Si algo se escapa, el build lo dice: el prerender
registra el error (`[elim:error]`) y la página sale sin contenido.

`AppComponent` sólo monta `<router-outlet />`.

## Módulos y rutas (desde el 17/11/2026)

La web es un **conjunto de módulos**: cada carpeta `features/<x>/` declara sus
páginas y sus rutas, y de ahí sale todo lo demás.

| Fichero | Qué es | Quién lo lee |
| --- | --- | --- |
| `features/<x>/<x>.pages.ts` | `<X>_PAGES`: ruta, SEO y página estática de cada página. **Datos puros** (sin Angular) | La app y los scripts de Node |
| `features/<x>/<x>.routes.ts` | `<X>_ROUTES: ModuleRoutes` (`shell` dentro de la maqueta, `bare` sin ella): componente perezoso, resolvers, guardas. Cada ruta con `pageRoute(página, {…})` | `app.routes.ts` |
| `app.routes.ts` | `MODULES`: **una línea por módulo**; compone lo `bare`, la maqueta con lo `shell` y la 404 | Angular |
| `features/<x>/<x>.search.ts` | Opcional: lo que el módulo aporta al **buscador**, perezoso (`ModuleRoutes.search`). Sus páginas salen solas | `SearchService` (`78-search.md`) |
| `features/<x>/public/` | Lo que la feature ofrece a otras (tarjeta de anuncio que pinta la proyección, datos del credo…). Lo demás es privado | Otras features |

Derivado (nadie lo escribe a mano):
- **Páginas estáticas, sitemap y robots.txt**: `scripts/generate-route-pages.mjs`
  lee los `*.pages.ts` (`modulePages()`). Herramienta (`tool`) → sin página
  y en `robots.txt`; ruta con parámetros → sus `expand` y las URL de datos
  (`dataPages`); `noindex` → fuera del sitemap.
- **Precarga**: las herramientas llevan `data.preload: false` (lo pone `pageRoute`).

Lo que **no** se deriva, a propósito: el menú (`MAIN_NAV`). Qué entra en el menú
y en qué orden es una decisión editorial; un test comprueba que cada entrada
lleva a una ruta que existe (`app.routes.spec.ts`).

Guardas automáticas: `scripts/modules.test.mjs` (cada módulo con páginas tiene
rutas y está en `app.routes.ts`; rutas únicas), `app.routes.spec.ts` (SEO en cada
ruta, herramientas sin precarga, redirecciones antes de `media/:blockId`, 404 la
última, menú → rutas) y `npm run check:boundaries` (sin cruces de capas).

**Receta — añadir una sección nueva:**

```bash
node scripts/new-module.mjs <id> --title "Titlu" --title-es "Título"
```

Deja la carpeta con página, rutas y componente, el segmento en `APP_PATHS`, la
línea en `app.routes.ts` y los textos `seo.<id>.*` / `<id>.*` en los dos idiomas.
Con eso ya tiene título, precarga, sitemap y página estática. Queda lo
editorial: el contenido (datos en `core/content/`, nunca en la plantilla;
textos largos de una página → su paquete en `core/i18n/route-packs.ts`) y, si
va en el menú, su entrada en `core/navigation/navigation.config.ts`.
Después, `npm run check`.

Rutas actuales:

| Path                | Componente             | Notas                          |
| ------------------- | ---------------------- | ------------------------------ |
| `''`                | `HomeComponent`        | Portada pública                |
| `'despre-noi'`      | `AboutComponent`       | Quiénes somos                   |
| `'marturisirea-de-credinta'` | `CredoComponent` | Confesión de fe (30 artículos) |
| `'conducere'`       | `LeadershipComponent`  | Estructura de liderazgo        |
| `'conducere/:id'`   | `PersonProfileComponent` | Perfil propio, sólo quien lo tiene en `PERSON_PROFILES` |
| `'media'`           | `StageComponent`       | Panel completo de la web: los bloques proyectables **menos anuncios y lectura bíblica**, que tienen sección propia (`WEB_PANEL_EXCLUDED`) |
| `'media/anunturi'`  | redirect → `'anunturi'` | Los anuncios no son un bloque de la web |
| `'media/:blockId'`  | `StageComponent`       | Un bloque con URL propia (`/media/citirea-bibliei`, `/media/galerie`…) |
| `'media/control'`   | `PresenterComponent`   | **Panel de control** de la proyección (fuera del shell) |
| `'media/ecran'`     | `ProjectionComponent`  | **Ventana de proyección** / vista previa `?rol=preview` (fuera del shell) |
| `'anunturi'`        | `AnnouncementsComponent` | Anuncios vigentes             |
| `'anunturi/:id'`    | `AnnouncementsComponent` | Un anuncio (enlace compartible) |
| `'departamente'`    | `DepartmentsHomeComponent` | Portada de Departamente (mosaico) — `39-departments.md` |
| `'departamente/<slug>'` | `DepartmentPageComponent` | Una ruta por departamento (`departmentRoute()`), mismo chunk |
| `'intrebari-frecvente'` | `FaqComponent`     | Preguntas frecuentes; `#<id>` abre una — `80-faq.md` |
| `'invitati'`        | `GuestsComponent`      | Bienvenida a invitados, **fuera del menú** (QR + enlace del pie), `noindex` — `33-guests.md` |
| `'invitati/qr'`     | `GuestsQrComponent`    | Hoja imprimible del QR (fuera del shell, antes del layout) |
| `'impreuna'`        | `ImpreunaComponent`    | Proiectul Împreună: hoy (`/impreuna/ziua/:day` = un día, mismo chunk) — `32-impreuna.md` |
| `'impreuna/plan'`   | `ImpreunaPlanComponent` | Plan completo por meses (`?luna=N`) |
| `'impreuna/tipar'`  | `ImpreunaPrintComponent` | Hoja A4 de un mes (fuera del shell, noindex) |
| `'contact'`         | `ContactComponent`     | Formulario `mailto:`, datos y mapa |
| `'doneaza'`         | `DonateComponent`      | Donativos y datos bancarios    |
| `legal`             | `LegalComponent`       | Información legal y privacidad (enlace en el pie) |
| `**`                | `NotFoundComponent`    | Página «no encontrada» (GitHub Pages sirve 404.html con estado 404) |

## Servicios de `core/` y su responsabilidad

| Servicio                       | Expone                                                                  |
| ------------------------------ | ----------------------------------------------------------------------- |
| `ClockService`                 | `now` (tick 1 min), `pageVisible`. **Única** fuente de tiempo/visibilidad |
| `ScheduleService`              | `currentWeekDay`, `weeklyProgram`, `todayProgram`, `upcomingEvents`, `hasUpcomingEvents`, `formatEventDate()`, `enVentanaDeCulto` |
| `AnnouncementsService`         | `active`, `hasActive`, `byId()` — anuncios vigentes por fecha (`35-announcements.md`) |
| `BibleReadingService`          | `announcedWeek` (la que contiene mañana), `hasReading`, `formatRange()`, `formatWeekday()` |
| `PresentationDisplayService`   | `qrVisible`, `qrSize`, `toggleQr()`, `setQrSize()`, `durations`, `durationFor()`, `stepDuration()`, `resetDurations()` + persistencia |
| `PresentationService`          | `isFullscreen`, `isNativeFullscreen`, `isSimulated`, `role`, `isPreview`, `canRequestNativeFullscreen`, `toggle()`, `enterProjectionRoute()` |
| `PresentationSyncService`      | `isLeader`, `hasProjectionWindow`, `remoteState`, `remoteProgress`, `join()`, `sendCommand()` — canal entre ventanas (`30-presentation.md`) |
| `ProjectionWindowService`      | `open()`, `close()`, `focus()`, `isOpen`, `canPlaceOnOtherScreen`, `projectionUrl()` |
| `PresentationBlocksService`    | `states`, `activeBlockIds`, `activeSlides`, `expand()`, `announcementStates`, `setAnnouncementVisible()`, `setEnabled()`, `resetToAuto()`, `resetAll()` |
| `CarouselService`              | `slides`, `currentIndex`, `currentSlide`, `currentDurationMs`, `isActive(key)`, `isBlockActive(id)`, `progress`, `isPaused`, `next/prev/setIndex/togglePause` |
| `YouTubeService`               | `liveStream`, `recentStreams`, `start('ligero' \| 'completo')`            |
| `youtube-thumb.ts`             | `youtubeThumb()` / `youtubeThumbFallback()`: miniatura en **16:9 real** (`hq720`, respaldo `mqdefault`). La API da `hqdefault`, que es 4:3 y ya viene recortada de lado |
| `CalendarService`              | `.ics`, `webcal://` (`webcalUrlFor(fichero)`, base = `<base href>`), URL de Google Calendar (`googleSubscribeUrl`), portapapeles |
| `ImpreunaService` (`core/impreuna/`) | Proiectul Împreună: `today`, `view(día)`, vídeos (instantánea + API de WordPress), progreso en `localStorage` — `32-impreuna.md` |
| `LanguageService`              | `current`, `use()`, `toggle()` + persistencia                            |
| `LoggerService`                | `prefix('ámbito')` → `debug/info/warn/error`. **Nada de `console.*`**    |
| `PwaUpdateService`             | Comprueba y aplica versiones nuevas del Service Worker                   |
| `UiStore` (`core/state/`)      | Drawer, menú abierto y scroll. SignalStore — ver `docs/ai/16-state.md`   |

## Flujo de datos

```
church.config.ts ──▶ CHURCH_CONFIG (InjectionToken)
        │
        ├─▶ ScheduleService ──(hasUpcomingEvents)──▶ PresentationBlocksService ──▶ activeSlides
        ├─▶ AnnouncementsService ──(hasActive, active)──▶      │        (un anuncio = una diapositiva)
        │            │                                        │
        │            ▼                                        ▼
        │      blocks/*-block · announcement-card        CarouselService
        │                                                     │
        └──────────────────────────────────────────▶ StageComponent (.stage)
assets/i18n/*.json ──▶ InlineTranslateLoader ──▶ pipe | translate
YouTube JSON/API ──▶ YouTubeService ──▶ socials-block / streams-block
```

Regla: **los componentes no calculan, consumen**. Toda derivación temporal o de
estado vive en un servicio con `computed()`.

## Por qué `StageComponent` usa `ViewEncapsulation.None`

`stage.component.scss` estiliza el escenario completo, incluidos los bloques
hijos, y contiene overrides transversales (`.stage.is-fullscreen .card__handle`,
media queries sobre `.streams__list`…). Con encapsulación emulada esas reglas
no alcanzarían el DOM de los componentes de bloque. Todas las clases usan BEM
namespaced, y los componentes de `shared/` mantienen su encapsulación propia,
así que no hay colisiones. Detalle en `docs/ai/40-styling.md`.
