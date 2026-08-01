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
    mobile-nav/             Drawer móvil (diferido, cdkTrapFocus)
  core/
    church.config.ts        ⭐ TODO el contenido no traducible (datos de la iglesia)
    social-link.model.ts    Modelo de red social
    presentation.service.ts Fullscreen real + fallback CSS simulado
    youtube.service.ts      Directo y últimas emisiones (JSON estático + API)
    i18n/                   Loader de traducciones embebidas (0 HTTP)
    navigation/             ⭐ Rutas con nombre y árbol de menú
      app-paths.ts          APP_PATHS, slugs de bloque, blockPath()
      nav.model.ts          NavItem + type guards
      navigation.config.ts  MAIN_NAV (única fuente del menú)
    state/
      ui.store.ts           SignalStore de UI (drawer, menús, scroll)
    ui/
      icon-name.ts          Unión de nombres de icono permitidos
      icon-registry.ts      provideElimIcons(): SVG inline en MatIconRegistry
    services/
      clock.service.ts               Reloj reactivo + visibilidad de pestaña
      schedule.service.ts            Programa semanal + eventos futuros derivados
      presentation-blocks.service.ts ⭐ Qué bloques se proyectan (auto/manual)
      carousel.service.ts            Motor del carrusel (slide, pausa, progreso)
      calendar.service.ts            Generación de .ics / webcal / Google Calendar
      language.service.ts            ES/RO + persistencia
      logger.service.ts              Log con ámbito (`.prefix('youtube')`)
      pwa-update.service.ts          Auto-actualización del Service Worker
      seo.service.ts / AppTitleStrategy  Título y meta por ruta
  features/
    home/                   Portada pública (hero, bienvenida, accesos, visita)
    about/                  Quiénes somos (historia, pilares, credo, 1ª visita)
    credo/                  Mărturisirea de credință (30 artículos + pack i18n)
    leadership/             Estructura de liderazgo y departamentos
    stage/                  ⭐ Escenario proyectable (.stage)
      stage.component.*     Marca, carrusel, QR, controles
      blocks/               Un componente por bloque proyectable
        socials-block/  streams-block/  gallery-block/
        weekly-block/   upcoming-block/ location-block/
      styles/               Tokens y responsive propios del escenario
  shared/                   Componentes reutilizables y "tontos"
    icon/ social-icon/ lang-switcher/ qr-panel/ footer/ share-button/
    floating-actions/ calendar-sync-button/ presentation-settings/
    page-section/ hero-carousel/
    styles/                 Parciales SCSS compartidos (botones, page-hero)
src/assets/i18n/{es,ro}.json  ⭐ Todos los textos visibles
scripts/                      Utilidades Node (imágenes, iconos PWA, YouTube)
.github/workflows/            Deploy a Pages + cron de datos de YouTube
```

## Dónde tocar según la petición

| Petición típica                                     | Fichero(s)                                              |
| --------------------------------------------------- | ------------------------------------------------------- |
| «Añade un evento / bautizo / conferencia»           | `core/church.config.ts` → `upcomingEvents`              |
| «Cambia el horario del culto»                       | `core/church.config.ts` → `weeklyProgram`               |
| «Añade una red social»                              | `core/church.config.ts` → `socials` + i18n              |
| «Cambia un texto»                                   | `assets/i18n/es.json` **y** `ro.json`                   |
| «Añade fotos de un evento a la galería»             | `scripts/optimize-images.js` + `mediaEvents`            |
| «Que tal bloque no salga al presentar»              | Panel de bloques en la UI (nada de código)              |
| «Nuevo bloque proyectable»                          | `docs/ai/30-presentation.md` (receta completa)          |
| «Nueva página / sección»                            | `docs/ai/10-architecture.md` (receta completa)          |
| «Añade una entrada al menú»                         | `docs/ai/15-navigation.md`                              |
| «Estado compartido entre componentes»               | `docs/ai/16-state.md`                                   |
| «Color, espaciado, tipografía, componente Material» | `docs/ai/45-design-system.md`                           |
| «Ajusta el diseño / tamaños en proyección»          | `docs/ai/40-styling.md`                                 |

## Invariantes que nunca deben romperse

1. La app funciona **sin backend**: no añadas llamadas a servidores propios.
2. `es.json` y `ro.json` tienen exactamente las **mismas claves**.
3. Todo componente es `standalone` + `OnPush`.
4. El bundle inicial se mantiene bajo presupuesto (620 kB aviso / 800 kB error).
5. La proyección nunca debe quedarse en blanco: siempre hay ≥ 1 bloque activo.
6. Los componentes consumen **variables semánticas** (`--c-*`, `--sp-*`…), nunca
   valores en crudo ni primitivas de `_tokens.scss`.
7. El menú se define **sólo** en `core/navigation/navigation.config.ts`.
