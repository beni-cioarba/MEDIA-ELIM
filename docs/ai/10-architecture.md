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

Detección de cambios: **zone.js explícito** (`provideZoneChangeDetection()` en
`app.config.ts`). Toda la app es OnPush + signals, así que pasar a
`provideZonelessChangeDetection()` es una línea; es una decisión pendiente del
usuario (`75-plan-evolucion.md`, fase 5).

## Bootstrap

`main.ts` → `bootstrapApplication(AppComponent, appConfig)`.

`app.config.ts` provee:

- `provideZoneChangeDetection()` (explícito desde Angular 21; ver arriba).
- `provideRouter(APP_ROUTES, withInMemoryScrolling(...), withRouterConfig(...))`
- `provideTranslateService({ fallbackLang: 'ro', loader: InlineTranslateLoader })`:
  el JSON de cada idioma es un **chunk propio** (`import()` dinámico); al
  arrancar sólo se carga el idioma activo (~23 kB) y el otro sólo si se cambia.
  Como son chunks del build, el Service Worker los precachea y no hay petición
  de red ni condición de carrera: `LanguageService.init()` devuelve la promesa
  de carga y el inicializador espera.
- `provideAppInitializer(() => inject(LanguageService).init())` y otro para
  `PwaUpdateService.init()`.
- `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode() })`
- `{ provide: CHURCH_CONFIG, useValue: DEFAULT_CHURCH_CONFIG }`

`AppComponent` sólo monta `<router-outlet />`.

## Rutas (`app.routes.ts`)

Todas cuelgan de `MainLayoutComponent` (eager) y se cargan con `loadComponent`.

| Path                | Componente             | Notas                          |
| ------------------- | ---------------------- | ------------------------------ |
| `''`                | `HomeComponent`        | Portada pública                |
| `'despre-noi'`      | `AboutComponent`       | Quiénes somos                   |
| `'marturisirea-de-credinta'` | `CredoComponent` | Confesión de fe (30 artículos) |
| `'conducere'`       | `LeadershipComponent`  | Estructura de liderazgo        |
| `'media'`           | `StageComponent`       | Panel completo de la web: los bloques proyectables **menos anuncios y lectura bíblica**, que tienen sección propia (`WEB_PANEL_EXCLUDED`) |
| `'media/anunturi'`  | redirect → `'anunturi'` | Los anuncios no son un bloque de la web |
| `'media/:blockId'`  | `StageComponent`       | Un bloque con URL propia (`/media/citirea-bibliei`, `/media/galerie`…) |
| `'media/control'`   | `PresenterComponent`   | **Panel de control** de la proyección (fuera del shell) |
| `'media/ecran'`     | `ProjectionComponent`  | **Ventana de proyección** / vista previa `?rol=preview` (fuera del shell) |
| `'anunturi'`        | `AnnouncementsComponent` | Anuncios vigentes             |
| `'anunturi/:id'`    | `AnnouncementsComponent` | Un anuncio (enlace compartible) |
| `'contact'`         | `ContactComponent`     | Formulario `mailto:`, datos y mapa |
| `'doneaza'`         | `DonateComponent`      | Donativos y datos bancarios    |
| `**`                | redirect a `''`        | GitHub Pages sirve 404.html    |

Detalle de navegación, menú y layout: `docs/ai/15-navigation.md`.

**Receta — añadir una sección nueva:**

1. `core/navigation/app-paths.ts` → declara el segmento en `APP_PATHS`.
2. `src/app/features/<feature>/<feature>.component.ts` (standalone, OnPush).
3. Entrada hija en `APP_ROUTES` con `loadComponent` y `data.seo`.
4. `core/navigation/navigation.config.ts` → entrada en `MAIN_NAV`.
5. Textos en `assets/i18n/{es,ro}.json` bajo una clave raíz nueva
   (+ `nav.*` y `seo.*`).
6. Datos estáticos en `core/church.config.ts` (nunca en la plantilla).

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
| `CalendarService`              | `.ics`, `webcal://`, URL de Google Calendar, portapapeles                |
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
