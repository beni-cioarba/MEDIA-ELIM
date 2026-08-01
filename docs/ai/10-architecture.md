# 10 · Arquitectura

## Stack

Angular 17 standalone · signals · `@ngx-translate/core` (loader embebido) ·
`@angular/service-worker` (PWA) · `angularx-qrcode` · SCSS. Sin backend.
TypeScript en `strict` + `strictTemplates`.

## Bootstrap

`main.ts` → `bootstrapApplication(AppComponent, appConfig)`.

`app.config.ts` provee:

- `provideRouter(APP_ROUTES, withInMemoryScrolling(...), withRouterConfig(...))`
- `TranslateModule.forRoot()` con `inlineTranslateLoaderFactory`
  (las traducciones se importan como JSON dentro del bundle → 0 peticiones HTTP
  en el primer pintado y sin condición de carrera con `APP_INITIALIZER`)
- `APP_INITIALIZER` × 2: `LanguageService.init()` y `PwaUpdateService.init()`
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
| `'media'`           | `StageComponent`       | Todos los bloques proyectables |
| `'media/:blockId'`  | `StageComponent`       | Un bloque con URL propia       |
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
| `ScheduleService`              | `currentWeekDay`, `weeklyProgram`, `todayProgram`, `upcomingEvents`, `hasUpcomingEvents`, `formatEventDate()` |
| `PresentationService`          | `isFullscreen`, `isSimulated`, `toggle()`, `exitSimulatedIfActive()`     |
| `PresentationBlocksService`    | `states`, `activeBlockIds`, `activeStates`, `setEnabled()`, `resetToAuto()`, `resetAll()` |
| `CarouselService`              | `slides`, `currentIndex`, `currentBlockId`, `progress`, `isPaused`, `next/prev/setIndex/togglePause` |
| `YouTubeService`               | `liveStream`, `recentStreams`, `start()`                                 |
| `CalendarService`              | `.ics`, `webcal://`, URL de Google Calendar, portapapeles                |
| `LanguageService`              | `current`, `use()`, `toggle()` + persistencia                            |
| `LoggerService`                | `prefix('ámbito')` → `debug/info/warn/error`. **Nada de `console.*`**    |
| `PwaUpdateService`             | Comprueba y aplica versiones nuevas del Service Worker                   |
| `UiStore` (`core/state/`)      | Drawer, menú abierto y scroll. SignalStore — ver `docs/ai/16-state.md`   |

## Flujo de datos

```
church.config.ts ──▶ CHURCH_CONFIG (InjectionToken)
        │
        ├─▶ ScheduleService ──(hasUpcomingEvents)──▶ PresentationBlocksService
        │            │                                        │
        │            ▼                                        ▼
        │      blocks/*-block                          CarouselService
        │                                                     │
        └──────────────────────────────────────────▶ StageComponent (.stage)
assets/i18n/*.json ──▶ InlineTranslateLoader ──▶ pipe | translate
YouTube JSON/API ──▶ YouTubeService ──▶ socials-block / streams-block
```

Regla: **los componentes no calculan, consumen**. Toda derivación temporal o de
estado vive en un servicio con `computed()`.

## Por qué `StageComponent` usa `ViewEncapsulation.None`

`stage.component.scss` estiliza el escenario completo, incluidos los bloques
hijos, y contiene overrides transversales (`.stage.is-fullscreen .card__name`,
media queries sobre `.streams__list`…). Con encapsulación emulada esas reglas
no alcanzarían el DOM de los componentes de bloque. Todas las clases usan BEM
namespaced, y los componentes de `shared/` mantienen su encapsulación propia,
así que no hay colisiones. Detalle en `docs/ai/40-styling.md`.
