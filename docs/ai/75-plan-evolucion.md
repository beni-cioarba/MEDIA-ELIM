# 75 · Plan de evolución — escalable, rápida, profesional y 100 % responsive

> Auditoría completa (sep. 2026) y plan por fases. Es el documento de referencia
> para las próximas iteraciones: cuando se cierre una fase, se marca aquí y se
> mueve el detalle a `70-roadmap.md`. Las cifras son medidas reales sobre el
> build de producción (`ng build --stats-json`) y sobre la app en ejecución.
>
> **Estado (22/09/2026)** — hecho: plataforma (Angular 17 → **22**, Material
> M3, `@angular/build`, Vitest, ngx-translate 18), idioma activo en el inicial,
> **proyección legible** (presupuesto + paginación + guardia en CI), puertas de
> calidad en `prebuild`/CI. Pendiente de decisión: zoneless. Pendiente: web
> compacta (fase 3), arquitectura modular (fase 4), prerender, tests.

---

## 0. Resumen ejecutivo

**Lo que ya está bien** (no tocar sin motivo): standalone + signals + OnPush en
todo; `core / features / shared / layout` con reglas de dependencia claras; datos
en `church.config.ts` y no en plantillas; menú → pie derivados de un solo
`MAIN_NAV`; `@defer` en lo pesado; PWA con actualización automática; i18n con
paridad verificada por script; sistema de proyección proporcional (`--pj-u`);
panel de control en dos ventanas con un solo reloj; sistema de marca
autocontenido; auditoría responsive con snippet y regla escrita.

**Los ocho problemas que frenan la app** (orden de impacto):

| # | Problema | Evidencia | Efecto |
|---|---|---|---|
| 1 | **Angular Material + CDK entran enteros en el bundle inicial** aunque la portada sólo usa icono, botón y menú | 121 kB CDK + 103 kB Material de 597 kB iniciales (37 %) | Carga inicial lenta, sobre todo en móvil del templo. **Decisión del usuario: Material se queda** (la app crecerá y lo necesita); lo que se corrige es *dónde* se carga |
| 2 | **Fuente Material Symbols cargada y sin uso** | `index.html` la pide (variable, cientos de kB); ningún componente usa `fontIcon` | Descarga inútil en cada visita fría |
| 3 | **Las dos traducciones van dentro del bundle inicial** | `src/assets` = 84 kB del `main.js`; crece con cada módulo | El inicial escala linealmente con los módulos |
| 4 | **zone.js** y detección de cambios global | 34 kB + un ciclo de CD por cada tick del carrusel (100 ms) | Trabajo de CPU constante en la proyección; lag potencial al crecer |
| 5 | **Textos de la proyección pequeños para la distancia** | A 1080p: mediana 27 px, mínimos 17–21 px, títulos 52–60 px | Legible sólo hasta ~6 m; el usuario lo confirma |
| 6 | **Raíz tipográfica hasta 20 px en escritorio** y espaciado generoso | `html { font-size: clamp(15px, 0.9vw + .5rem, 20px) }` | La web se ve "grande" y poco densa en pantallas ≥ 1440 px |
| 7 | **Sin unidad de "módulo"**: añadir una sección toca 6 ficheros a mano | Receta de `10-architecture.md` | No escala a "muchos módulos" sin errores ni desalineaciones |
| 8 | **Sin red de seguridad**: ni tests, ni lint, ni auditoría en CI | `deploy.yml` sólo compila y publica | Las regresiones se descubren en el templo |

Objetivo numérico del plan: **inicial ≤ 420 kB raw / ≤ 115 kB transfer** (hoy 597 /
160; Material se conserva en la cabecera), **LCP < 1,5 s en 4G**, proyección
legible a **15–20 m**, y **cero** hallazgos del snippet responsive en 320–1920.

---

## 1. Diagnóstico

### 1.1 Arquitectura

- **Capas y dependencias**: correctas (`features → shared → core`). `core` es
  grande pero coherente; los servicios derivan con `computed()` y los componentes
  consumen. Mantener.
- **Rutas**: un solo `APP_ROUTES` plano con `loadComponent` por página. Bien para
  10 rutas; con 30 módulos se vuelve inmanejable y la navegación, el pie, el SEO y
  los bloques proyectables se registran cada uno por su lado.
- **Configuración**: `church.config.ts` (~600 líneas) mezcla tipos, datos de
  contacto, redes, eventos, anuncios, programa semanal, ministerios. Cada módulo
  nuevo lo engorda y cualquier error lo rompe todo.
- **Escenario**: `StageComponent` con `ViewEncapsulation.None` y 1.786 líneas de
  SCSS (supera el presupuesto por componente en 3,6 kB). Los bloques son
  componentes, pero sus estilos viven en el padre → añadir un bloque = tocar el
  monolito.
- **i18n**: un único JSON por idioma (500 claves), ambos idiomas embebidos en el
  inicial. La paridad está garantizada por script; el coste, no.
- **Estado**: signals + `@ngrx/signals` (`UiStore`) + `localStorage` con evento
  `storage` entre ventanas. Sólido. El canal `BroadcastChannel` de la proyección
  está bien diseñado (líder por prioridad, herencia, latido).

### 1.2 Rendimiento (build de producción, 47 commits, v2.0.0)

Composición del **inicial** (597 kB raw · 160 kB transfer):

| Paquete | kB raw | Comentario |
|---|---|---|
| `@angular/core` + rxjs + common | ~185 | Irreducible salvo zoneless (quita parte del runtime) |
| `@angular/cdk` | 121 | Overlay + a11y + drag-drop; sólo drag-drop es necesario y ya es lazy |
| `@angular/material` | 103 | Icon (registro SVG propio detrás), button, menu, list, divider |
| `src/assets` (i18n es+ro inline) | 84 | Sólo hace falta el idioma activo |
| `@angular/router` | 68 | Normal |
| zone.js | 34 | Se elimina en zoneless |
| `@angular/forms` | 29 | ¿Se usa? Revisar (contacto usa `mailto:`) |

Lazy destacable: `features/stage` 81 kB (+18 kB ajustes) en un chunk de 127 kB;
`qrcode` 62 kB (CommonJS → bailout de optimización); presenter + CDK drag 84 kB.

Red: dos hojas de Google Fonts en serie con `media="print"` (una de ellas,
Material Symbols, **sin uso**); `preconnect` a 3 hosts; hero `.webp` precargado
(bien); imágenes de galería 816 kB en `.webp` con miniaturas (bien).

Service Worker: prefetch de todo el JS/CSS en la instalación (bien para la
pantalla del templo), assets `lazy`, datos de YouTube `freshness` 1 h.

### 1.3 Fluidez y estabilidad

- El carrusel refresca el progreso cada 100 ms en el líder y en los seguidores;
  con zone.js cada tick dispara detección de cambios en toda la app. Hoy no se
  nota; con 20 bloques y más ventanas, sí. **Zoneless + signals** lo resuelve de
  raíz (Angular 20).
- `ClockService` ya para el reloj con la pestaña oculta (bien).
- No hay *error boundary* ni telemetría mínima: un error de plantilla en un
  bloque puede dejar la proyección en blanco. Hace falta un `ErrorHandler`
  propio que registre y **salte la diapositiva** en vez de romper el carrusel.

### 1.4 Diseño web

- Identidad sólida (navy + oro, Playfair + Inter, wordmark). El sistema de tokens
  es bueno; el problema es la **densidad**: raíz de hasta 20 px, `--nav-height`
  4,5 rem, secciones con `clamp(var(--sp-8), 6vw, 4rem)`, tarjetas con relleno
  amplio. En 1440–1920 px la web "flota".
- Jerarquía y estados están cuidados (criterios 1–10 de `design-posture`).
- Iconografía: SVG propio (bien) + `<mat-icon>` como envoltorio (innecesario).

### 1.5 Proyección

Medido a 1920×1080 (`--pj-u` = 10,8 px):

| Texto | Hoy | Legible desde* |
|---|---|---|
| Etiquetas, fechas, mes del datebox | 17–21 px (1,6–1,9 u) | 4 m |
| Cuerpo (mediana) | 27 px (2,5 u) | 6 m |
| Títulos | 52–60 px (5–5,5 u) | 12–13 m |

\* Regla práctica: altura de mayúscula ≥ distancia / 200 (cómoda). Pantalla de 3 m
de ancho a 1080p → 1,56 mm por píxel.

Conclusión: **hay demasiada información por diapositiva y demasiado pequeña**. El
autoajuste (`appFitToBox`, 0,6–1) encoge para que quepa, que es la dirección
equivocada para leer a distancia.

### 1.6 Responsive

Auditadas las 11 rutas en 320 · 375 · 768 · 1024 · 1280 con
`scripts/responsive-audit.snippet.js`. Fallos encontrados y **corregidos** en esta
iteración: barra del panel de control (aplastaba los títulos entre 768 y ~1100
px; a 375 desbordaba 669 px), cabecera pública a 320 px (marca sobre las
acciones), rango de semana del bloque bíblico a 320 px, cabecera de bloque del
panel a 320 px, contador «1 / 10», distintivo «vista previa» sobre la marca
proyectada. Regla e invariante escritos (`40-styling.md`, `00-index.md`,
`60-conventions.md`, `design-posture.instructions.md`).

### 1.7 Calidad y proceso

Sin `.spec.ts`, sin ESLint, CI que sólo compila y publica. El único control es
`check-i18n-parity.mjs` y los presupuestos de `angular.json` (que ya se
incumplen en un caso).

---

## 2. Arquitectura objetivo: la app como **conjunto de módulos**

### 2.1 Qué es un módulo

Una carpeta `src/app/features/<modulo>/` autosuficiente:

```
features/<modulo>/
  <modulo>.routes.ts      rutas hijas (loadChildren), con data.seo
  <modulo>.module-def.ts  ModuleDef: id, path, nav (clave, icono, grupo), bloques proyectables, i18n
  <modulo>.config.ts      datos propios (tipados), nunca en plantilla
  i18n/<modulo>.es.json   claves del módulo (raíz "<modulo>.*")
  i18n/<modulo>.ro.json
  pages/…  components/…  blocks/…   (si aporta bloques a la proyección)
```

Y un **registro** único en `core/modules/module-registry.ts`:

```ts
export interface ModuleDef {
  readonly id: string;                 // 'anunturi'
  readonly path: string;               // segmento de URL
  readonly loadRoutes: () => Promise<Routes>;
  readonly nav?: { readonly labelKey: string; readonly icon: IconName; readonly group?: NavGroupId; readonly order: number };
  readonly i18n: (lang: Lang) => Promise<Record<string, unknown>>;   // import() del JSON del módulo
  readonly blocks?: readonly BlockDef[];  // bloques que aporta a la proyección
}
```

De ese registro se **derivan** (no se duplican): `APP_ROUTES`, `MAIN_NAV`, las
columnas del pie, el sitemap/prerender, el `BLOCK_DEFS` del carrusel y la carga
de traducciones. Añadir un módulo = crear su carpeta y una línea en el registro.
Un script `node scripts/new-module.mjs <id>` genera el esqueleto (con la receta
de `10-architecture.md` como plantilla) y añade la línea.

### 2.2 Configuración por dominio

`church.config.ts` se parte en `core/config/`: `church.ts` (identidad,
contacto), `socials.ts`, `events.ts`, `weekly.ts`, `donations.ts`,
`leadership.ts`, y cada módulo lleva la suya. Un `scripts/check-config.mjs`
valida tipos y coherencia (ids únicos, fechas válidas, i18n referenciadas
existentes) y corre en CI.

### 2.3 Bloques proyectables como plugins

`BlockDef { id, titleKey, load: () => import(Componente), isAuto: (ctx) => boolean, expand?: (ctx) => Slide[], defaultDurationS }`.
`PresentationBlocksService` deja de conocer los bloques por nombre: itera el
registro. Los estilos de cada bloque viven en su componente (encapsulados), con
un **contrato de tokens de proyección** (`--pj-*`) que el escenario define y el
bloque consume. Así `stage.component.scss` baja a lo estructural (< 400 líneas)
y `ViewEncapsulation.None` deja de ser necesario.

### 2.4 i18n por módulo y por idioma

- Inicial: sólo `core.<lang>.json` del idioma activo (detectado antes del
  bootstrap desde `localStorage`/`navigator`), ~20 kB.
- Cada módulo carga su JSON al activarse la ruta (`resolve` o `canActivate` que
  hace `translate.setTranslation(lang, json, true)`); la proyección precarga los
  de sus bloques activos.
- `check-i18n-parity.mjs` pasa a recorrer `features/**/i18n/*.json`.

### 2.5 Plataforma

- **Angular 20** (17 → 18 → 19 → 20, una versión por PR, `ng update`): zoneless
  (`provideZonelessChangeDetection`), `input()`/`output()`/`model()`, `@let`,
  `resource()` para YouTube, `afterRenderEffect` para medidas del autoajuste.
  Quita zone.js y elimina la CD global: cada signal actualiza sólo su vista.
- **Prerender (SSG)** de las rutas públicas con `@angular/ssr` → HTML estático
  por ruta en `dist/browser`. GitHub Pages lo sirve tal cual: primer pintado sin
  esperar al JS, SEO real (hoy el `<title>`/OG se ponen en cliente) y el
  `404.html` sigue cubriendo las rutas dinámicas (`/media/control`, `/media/ecran`
  no se prerenderizan).
- **Angular Material como librería de componentes oficial** (decisión del
  usuario: la app será grande y la necesita). Tres reglas para que no cueste
  carga:
  1. **Tema corporativo único** con la API M3 de Material 20 (`mat.theme()` con
     la paleta navy/oro de `_tokens.scss`, densidad −1 para el aire compacto,
     tipografía Playfair/Inter). Ningún override suelto por componente:
     `_material-overrides.scss` se reduce a lo que el tema no cubre.
  2. **Se carga donde se usa**: la portada sólo necesita `MatButton` e icono; el
     menú (`MatMenu` + `cdk/overlay`), las listas, diálogos, tablas, formularios,
     pestañas, etc. van en los chunks *lazy* de los módulos que los usan o tras
     `@defer (on interaction)`. El `<app-icon>` deja de depender de
     `MatIconRegistry` (pinta el SVG del registro) para que Material no entre en
     el inicial por los iconos.
  3. **Un catálogo de piezas**: qué componente Material se usa para qué
     (`45-design-system.md`), con `shared/` envolviendo los que se repiten
     (botón de acción, tarjeta, diálogo de confirmación) para que 30 módulos se
     vean iguales.
- **Fuentes autohospedadas**: subconjunto `latin-ext` de Playfair Display 600 e
  Inter 400/600/700 en `woff2` (`assets/fonts/`, ~90 kB total), `@font-face` con
  `font-display: swap` y `<link rel="preload">` de las dos que pintan el LCP.
  Fuera Material Symbols y los `preconnect` a Google.
- **Manejo de errores**: `ErrorHandler` propio → `LoggerService` + en proyección
  "saltar diapositiva y seguir"; nunca pantalla en blanco.

---

## 3. Diseño web: más profesional y más compacto

Principio: **misma identidad, menos aire**. Cambios de tokens (globales, baratos)
antes que rediseños por pantalla.

| Token / regla | Hoy | Propuesta | Efecto |
|---|---|---|---|
| Raíz `html { font-size }` (web) | `clamp(15px, 0.9vw + .5rem, 20px)` | `clamp(15px, 0.35vw + 14px, 17px)`; la fluidez amplia se queda **sólo** en el escenario (`.stage`) | Textos y espacios (en `rem`) bajan un 15 % en escritorio; la proyección no cambia |
| `--nav-height` | 4,5 rem | 4 rem (64 px) escritorio · 3,5 rem móvil | Cabecera más ligera |
| Relleno de sección | `clamp(sp-8, 6vw, 4rem)` | `clamp(sp-6, 4vw, 3rem)` | Ritmo vertical más denso |
| Hero | ~alto de viewport | `min(62vh, 640px)` y CTA dentro de la primera pantalla también en 768 px | Se llega al contenido antes |
| Tarjetas | relleno `sp-5/6`, radio `lg` | relleno `sp-4`, radio `md`, sombra `e-1` en reposo | Más información por pantalla, menos "cajas" |
| Tipografía | escala `--fs-*` fluida amplia | recortar los máximos un paso (h1 ≤ 2,6 rem) | Titulares proporcionados |
| Iconos | SVG propio + `<mat-icon>` | SVG propio | Una sola fuente de iconos |
| Pie | 5 columnas + bloque de contacto | igual, con `sp-3` entre enlaces y una franja legal en una línea | Más corto |

Todo con verificación responsive en los cinco anchos y captura comparativa
antes/después en 375 y 1440 (las capturas sí están justificadas aquí: es un
cambio que sólo se valora viéndolo).

---

## 4. Proyección legible a 15–20 m

### 4.1 Presupuesto de tamaños (en `--pj-u`; 1 u = 10,8 px a 1080p)

| Papel | Mínimo | A 1080p | Legible desde |
|---|---|---|---|
| Título de diapositiva | 8 u | 86 px | 20 m |
| Cuerpo principal (lo que hay que leer) | 5,5 u | 59 px | 14 m |
| Secundario (hora, lugar, quién) | 4,2 u | 45 px | 10 m |
| Etiquetas / metadatos (badge, mes) | 3,2 u | 35 px | 8 m |
| Prohibido | < 3,2 u | — | Se elimina o se pasa a otra diapositiva |

Reglas:

1. **Paginar antes que encoger**: `appFitToBox` limitado a 0,85–1; si no cabe, el
   bloque parte el contenido en otra diapositiva (los anuncios por secciones,
   los eventos ya van de 2 en 2 → pasar a 1 por diapositiva si el texto crece).
2. **Presupuesto de contenido por diapositiva**: ≤ 6 líneas de cuerpo, ≤ 2
   niveles de jerarquía, un solo bloque de metadatos.
3. **Todo el lienzo**: cabecera de marca 6 u de alto (hoy ~9), franja del
   versículo 4 u, márgenes 3 u; el QR ya es configurable (S/M/L u oculto) — en
   diapositivas de texto largo, el panel puede ocultarlo por bloque (nuevo ajuste
   `qrPerBlock`).
4. **Un guardia automático**: `scripts/check-projection-sizes.mjs` recorre los
   SCSS de proyección y falla si aparece `--pj-u * < 3.2` en un `font-size`.
   Entra en CI.
5. **Prueba de banco**: checklist a 1920×1080 en el navegador (medir con el
   snippet de tamaños usado en esta auditoría) para cada bloque: mínimo, mediana
   y máximo dentro de tabla.

### 4.2 Por bloque

| Bloque | Ajuste principal |
|---|---|
| Anuncios | Título 8 u, cuerpo 5,5 u, secciones (`invitado`, `programa`) a 4,2 u; si hay > 2 secciones o > 6 líneas → 2 diapositivas (`page 1/2`) |
| Lectura bíblica | Sólo la semana anunciada: día + capítulos a 5,5 u, 7 filas máximo; el rango de fechas 4,2 u |
| Eventos | 1 evento por diapositiva si la descripción supera 2 líneas; fecha en datebox de 10 u |
| Programa semanal | 7 filas a 5,5 u, hoy resaltado; sin descripción secundaria |
| Redes / directos / galería | Ya son visuales: subir rótulos a 4,2 u; miniaturas con `aspect-ratio` fijo |

---

## 5. Plan por fases

| Fase | Contenido | Esfuerzo | Criterio de aceptación |
|---|---|---|---|
| **0 · Hecho (sep. 2026)** | Sistema de marca compartido; pantalla completa desde el panel; auditoría responsive + 6 arreglos; regla «responsive 100 %» para la IA | — | Snippet `ok` en 11 rutas × 5 anchos |
| **1 · Carga rápida (quick wins)** | ✅ Tema M3 corporativo (hoja global 38 → 21 kB) · ✅ i18n sólo idioma activo (chunk por idioma) · ⏳ Quitar Material Symbols del `index.html`; `<app-icon>` sin `MatIconRegistry`; menú/overlay tras `@defer`; fuentes autohospedadas con preload; revisar `@angular/forms`; presupuestos a 450/550 kB | 1 día restante | Inicial ≤ 450 kB raw / ≤ 125 kB transfer (hoy 585 / 156); Lighthouse Performance ≥ 95 en móvil; sin peticiones a `fonts.googleapis.com` |
| **2 · Proyección legible** | ✅ **Hecho (22/09/2026)** en **escala de cartel** (la paginación se probó y el usuario la descartó: un anuncio = una diapositiva, de un vistazo): escala `--pj-fs-*` 3,2 · 3,8 · 4,6 · 5,6 · 8; rótulos de bloque a `lead` en una línea (`*.title_pj`); anuncio como cartel con jerarquía, columnas ≤ 2 secciones / apiladas con 3+, autoajuste 1–0,7 con suelo 3,2u, `webOnly`; semana entera; eventos de dos en dos; marca a 5u; secundario fuera; filas a altura natural; `check-projection-sizes.mjs` en `npm run check` y en CI | — | 10 diapositivas medidas a 1080p con y sin QR: cero desbordes, mínimo 3,2u. Falta la prueba en el templo desde el último banco |
| **3 · Web compacta y profesional** | Tokens §3; cabecera 64 px; hero; tarjetas; pie; capturas antes/después 375 y 1440 | 2–3 días | Criterios de `design-posture` + snippet responsive `ok`; el usuario valida las capturas |
| **4 · Arquitectura modular** | `ModuleDef` + registro; rutas/nav/pie/bloques derivados; `church.config.ts` partido; i18n por módulo; bloques como plugins con estilos encapsulados; `new-module.mjs`; `check-config.mjs`; receta nueva en `10-architecture.md` | 3–5 días | Añadir un módulo de prueba = 1 carpeta + 1 línea; `stage.component.scss` < 400 líneas y dentro de presupuesto |
| **5 · Plataforma** | ✅ **Angular 22.1** (17→18→19→20→21→22 con `ng update`, Material/CDK/ngrx/qrcode 22, ngx-translate 18, TypeScript 6, `@angular/build`, Vitest, Node 24 portable en `.tools`) · ⏳ zoneless (decisión del usuario; una línea en `app.config.ts`), `@angular/ssr` prerender, `ErrorHandler` propio, `resource()` para YouTube | 1–3 días restantes | Sin zone.js en el bundle; HTML prerenderizado por ruta en `dist`; la proyección sigue con un bloque roto |
| **6 · Red de seguridad** | ✅ Puertas en `prebuild` y CI: paridad i18n + presupuesto de proyección (`npm run check`); Vitest configurado · ⏳ specs de servicios (`Schedule`, `Announcements`, `PresentationBlocks`, `Carousel`, `Sync`); Playwright: rutas × anchos con el snippet y proyección a 1080p; ESLint (angular-eslint) + Prettier | 2 días restantes | PR rojo si falla cualquiera; despliegue sólo desde verde |

Orden recomendado para lo que queda: **resto de 1 → 3 → 4 → resto de 5 → resto
de 6**. La fase 4 (arquitectura modular) se hace **en su propia rama y con el
árbol limpio**, después de que el usuario revise y suba lo ya hecho: es un
refactor transversal (rutas, menú, pie, bloques, i18n) que no debe mezclarse
con una subida de cinco versiones de Angular ni con cambios de diseño. Sigue
siendo útil —cada módulo nuevo hoy toca seis ficheros— pero no urge hasta que
lleguen los módulos; su valor es proporcional a cuántos se añadan.

---

## 6. Métricas objetivo

| Métrica | Hoy | Objetivo |
|---|---|---|
| Inicial raw / transfer | 597 kB / 160 kB | ≤ 420 kB / ≤ 115 kB (Material en la cabecera se conserva) |
| Peticiones antes del LCP | JS + 2 CSS de fuentes + hero | JS + hero (+ 2 woff2 precargadas) |
| Fuente de iconos externa | Material Symbols (sin uso) | ninguna |
| Texto mínimo en proyección (1080p) | 17 px | 35 px ✅ |
| Cuerpo en proyección | 27 px | 50 px (cartel; anuncios cargados hasta 35 px) ✅ |
| Raíz tipográfica web en 1440 px | 20 px | 17 px |
| Rutas × anchos sin hallazgos responsive | 11 × 5 (hoy) | mantener, en CI |
| Ficheros para añadir un módulo | 6 a mano | 1 carpeta + 1 línea (script) |
| Tests | 0 | servicios de dominio + smoke E2E |

---

## 7. Otras mejoras detectadas (menores, ir metiendo)

- `@angular/forms` (29 kB) en el inicial: comprobar si algún formulario lo
  necesita de verdad; el contacto va por `mailto:`.
- `qrcode` es CommonJS (bailout): sustituir `angularx-qrcode` por generación
  propia con `qrcode` ESM o `qr-code-styling` lazy (~20 kB menos y sin aviso).
- `credo-articles.*.json` (17–20 kB por idioma): ya son lazy; con i18n por módulo
  pasan a su carpeta.
- Página *offline* del SW y aviso de "sin conexión" en la proyección (el templo
  puede quedarse sin red: hoy el QR y los bloques estáticos funcionan, YouTube no
  — mostrar el último estado cacheado con marca de hora).
- `manifest.webmanifest`: `shortcuts` a `/media/control` y `/anunturi`;
  `screenshots` para el diálogo de instalación.
- Cabecera pública: en ≤ 1100 px el clúster de acciones (directo + idioma + menú)
  manda; valorar mover el idioma dentro del menú móvil (menos ruido, más sitio
  para la marca).
- Panel de control entre 1024 y 1100 px envuelve la barra en dos filas (correcto,
  pero acortar el rótulo de estado evita la segunda fila).
- Accesibilidad: auditoría axe en CI (Playwright) junto al snippet responsive.
- Documentación: cuando exista el registro de módulos, `00-index.md` se genera
  en parte desde él (tabla de rutas), para que no se desincronice.

---

## 8. Decisiones que necesitan al usuario

1. ~~Quitar Angular Material~~ **Decidido (22/09/2026): Material y CDK se
   quedan** como librería de componentes de la app. El plan los conserva y los
   hace baratos (tema M3 único, carga donde se usan, catálogo de piezas).
2. **Prerender** (fase 5): el `deploy.yml` cambia y el `base-href` de GitHub Pages
   debe mantenerse en las rutas generadas. Recomendado: sí, tras la fase 4.
3. **Densidad web** (fase 3): es un cambio visible; se valida con capturas
   antes/después antes de aplicar en toda la web.
4. **Presupuesto de contenido en proyección** (fase 2): implica que un anuncio
   largo ocupe dos diapositivas. Recomendado: sí; legibilidad antes que caber.
