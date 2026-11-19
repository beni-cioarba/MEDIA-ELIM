# 76 · Plan maestro — auditoría de noviembre de 2026 y arquitectura objetivo

> **Aprobado y ejecutado** (fases 0-5, 16-19/11/2026; el estado de cada una,
> justo debajo). Sustituye a `75-plan-evolucion.md` (cuyo estado se repasa en
> § 2.9). Lo que queda abierto: mejoras de producto (§ 5), prerender de las URL
> con datos y los datos legales que faltan (NIF y registro).
>
> Auditado el 16/11/2026 sobre `c7837f9` (v2.2.5, build 122) y sobre
> producción (`https://elimarganda.com`).
>
> **Aprobado el 16/11/2026** («adelante con todas las fases»). Decisiones:
> datos personales, se quedan como están (más adelante, login y todo privado);
> página legal, sí; analítica y errores, primero un plan aparte; *zoneless* y
> prerender, adelante.
>
> **Estado de la fase 0** (en el árbol de trabajo, sin commit):
> - ✅ Tests unitarios dentro de `npm run check` (`test:unit`).
> - ✅ Angular 22.1 → 22.2 y Vitest 4.1.12; fuera `@angular/animations`.
> - ✅ Material Symbols y el `preconnect` a `fonts.googleapis.com`, fuera.
> - ✅ Mega-menú diferido (`layout/top-nav/nav-panel.component.*`): inicial
>   **661 → 585 kB**.
> - ✅ `ErrorHandler` propio, escucha global y recuperación ante chunks
>   caducados (`core/errors/`, `core/util/auto-reload.ts`).
> - ✅ Precarga selectiva (`PublicPreloadingStrategy`, `data.preload: false`
>   en las rutas del operador).
> - ✅ Página 404 (`features/not-found/`).
> - ✅ `/media/*`: un solo `main` y `h1` de página.
> - ✅ Contraste: `toc__badge`, `article__anchor`, `era__numeral`,
>   `$color-muted` del escenario y `ui-status` (tokens `--c-*-text`, también
>   en la consola oscura). **Corrección a § 2.7**: `fpdf__meta` y el rango de
>   fechas de familias eran falsos positivos (medidos a mitad de su animación
>   de entrada); los enlaces `lead-stretch` y `net__link`, también (son
>   enlaces estirados a toda la tarjeta).
> - ✅ Área táctil de 24 px: migas, pie, puntos del hero, `article__anchor`,
>   `milestone-row__watch`, `plan-watch`.
> - ✅ Fondo difuminado de las fotos de familia con `lazy`.
> - ✅ Miniaturas de carteles (`npm run posters`), `pdfjs-dist` 6, Dependabot,
>   PDF de familias sólo de semanas nuevas (`--reuse` + caché), `.nvmrc`,
>   documentación (§ 2.8) y presupuesto del inicial como error (600 / 620 kB).
>
> **Página legal** (`/legal`, `core/legal.config.ts`) y **mapa al pulsar**
> (`shared/map-embed`): ✅. Pendiente de la iglesia: NIF y nº de registro.
>
> **Cabecera**: se queda clara, refinada (barra opaca y del color del panel al
> abrir, filete siempre, velo sobre la página, galón en oro). ✅
>
> **Estado de la fase 1**:
> - ✅ Prueba de humo (`npm run e2e`, `scripts/e2e/`): páginas × 2 anchos,
>   enlaces internos y proyección; paso obligatorio del despliegue.
> - ✅ Páginas estáticas de las URL con datos (483): 0 enlaces internos con 404.
> - ✅ `check-content` y `check-boundaries` dentro de `npm run check`.
> - ✅ Specs de `Announcements`, `Schedule`, `Carousel`, `PresentationBlocks` y
>   `FamilyPrayer` (233 tests en total).
> - ✅ Despliegue: puertas → build → humo → publicar → `verify-live`; cron
>   nocturno.
> - ⏳ Falta: spec de `PresentationSyncService` (BroadcastChannel) y ESLint
>   (las fronteras ya las vigila `check-boundaries`).
>
> **Fase 2** (17/11/2026): ✅
> - `church.config.ts` 1.581 → 655 líneas: tipos e identidad; el contenido en
>   `core/content/*.content.ts`. `CHURCH_CONFIG` con fábrica (`providedIn: 'root'`),
>   sin proveedor en `app.config.ts`; `SeoService` lee `core/site.ts`. Inicial
>   **586 → 567 kB**.
> - Diccionario principal **64 → 38 kB** por idioma: seis paquetes de ruta
>   (`core/i18n/route-packs.ts`).
> - `npm run images:budget`: 24 imágenes recomprimidas, −5,4 MB (retratos de la
>   conducere 13 → 7,9 MB). Tres retratos muy detallados siguen por encima de
>   300 kB incluso a calidad 66 (435-607 kB): se dejan así.
> - Nada que archivar todavía: un anuncio caducado sigue en el archivo de
>   `/anunturi` 90 días, y `check-content` avisa a partir de ahí.
> - No se llega al objetivo de «diccionario ≤ 25 kB»: lo que queda lo usan
>   varias páginas a la vez. El resto se reparte con el registro de módulos
>   (fase 3).
>
> **Fase 3** (17/11/2026): ✅
> - Cada módulo: `<x>.pages.ts` (datos puros) + `<x>.routes.ts`; `app.routes.ts`
>   de 520 a 83 líneas, una por módulo (19 módulos).
> - Páginas estáticas, sitemap y robots derivados de los módulos: las 33
>   páginas y el `robots.txt` salen idénticos a la lista que se copiaba a mano.
> - `node scripts/new-module.mjs <id>`: probado con un módulo de prueba
>   (puertas, build y página estática en verde) y retirado.
> - Los 14 cruces entre features, resueltos: `features/<x>/public/` (API de
>   cada feature) y `shared/family-photo`; `projection` pasa dentro de `stage`.
>   `check-boundaries` ya no admite excepciones.
> - Tests nuevos: `app.routes.spec.ts` y `scripts/modules.test.mjs`.
> - Queda: dos piezas públicas (`family-collage`, `causes-board`) usan el
>   parcial SCSS de proyección de `stage`; se resuelve con el contrato de
>   tokens de proyección de la fase 4. El menú sigue escrito a mano, a
>   propósito (decisión editorial).
>
> **Fase 4** (17/11/2026): ✅
> - Registro de bloques (`core/presentation/blocks.ts`): orden, título,
>   duración y regla automática de cada bloque en un sitio; de ahí salen el
>   tipo, los títulos del carrusel y los tiempos por defecto.
> - Cada bloque es un chunk (`@defer` en su `@case`); también los controles de
>   proyección. El escenario que baja `/media/program`: **327 → 61 kB**.
> - Frontera de error: regla automática y diapositivas de cada bloque
>   protegidas; tres tests nuevos (un bloque roto queda fuera y la proyección
>   sigue).
> - Galería con hoja propia: `stage.component.scss` **40,4 kB → dentro del
>   presupuesto** (36 kB). `pj-section-title` pasa a `src/styles/_projection-kit.scss`:
>   las piezas públicas ya no dependen del escenario.
> - Verificado con `npm run visual` (nuevo): 5.517 elementos de las 8 páginas
>   `/media/*` en dos anchos y de las 19 diapositivas a 1080p, **idénticos**
>   antes y después (la foto destacada de la galería en proyección se excluye:
>   rota sola).
> - No hecho, a propósito: renderizar los bloques con un `NgComponentOutlet`
>   genérico. Se perderían las entradas tipadas; el `@switch` se queda.
> - Pendiente de comprobar en el templo: el primer arranque de la proyección
>   ya no tiene todos los bloques en el mismo chunk; con el service worker
>   están en caché, pero conviene mirarlo un domingo.
>
> **Fase 5** (17-19/11/2026): ✅
> - **Fuentes propias**: Inter, Plus Jakarta Sans y Playfair Display desde
>   `@fontsource-variable` (latin + latin-ext), sin Google Fonts: ni petición a
>   terceros ni dependencia de su CDN sin red. `src/styles/_fonts.scss`.
> - **Iconos y cabecera sin Material**: `app-icon` pinta su SVG del catálogo
>   (552 iconos idénticos antes/después); hamburguesa nativa de 44 px.
> - **Zoneless**: `provideZonelessChangeDetection()`, zone.js desinstalado.
>   Avance automático de la proyección, menú, cambio de idioma y formulario de
>   contacto: idénticos con y sin zone.js.
> - Arranque: **661 → 479 kB raw (128 kB transfer)**.
> - **Prerender estático** de las 39 rutas públicas, derivado del registro de
>   módulos (`app.routes.server.ts`), sin hidratación (contenido con hora) y
>   sin fotograma vacío al arrancar (medido). Para que el código corriera en
>   Node: 10 piezas tocaban el navegador al construirse (`injectIsBrowser()`,
>   `DOCUMENT`, `PlatformLocation`). Sin red en el prerender (antes: llamadas a
>   YouTube por página y build). 404 y service worker usan el shell
>   `index.csr.html`. Detalle: `50-build-deploy.md` → «Prerender».
> - **Carrera corregida** al paso: un paquete de traducción de página
>   (`routePacks`) podía fusionarse antes de que hubiera idioma activo y la
>   carga del diccionario principal lo borraba (claves a la vista; lo destapó
>   la navegación inicial bloqueante). `TranslationPackService` espera al
>   idioma y guarda la promesa de cada fusión.
> - Verificado: `npm run check` (74 + 250 tests), build, smoke test (45
>   páginas × 2 anchos, 165 enlaces, 19 diapositivas) y huella visual idéntica
>   a la compilación sin prerender (salvo la cuenta atrás, que ahora se ignora).
> - Pendiente: prerender de las 483 URL con datos (opcional) y el plan de
>   analítica y errores (abajo).
>
> **Analítica y errores** (19/11/2026): aprobado e implementado
> (`77-analitica-errores.md`). GoatCounter (sitio `elim`) y Sentry (UE)
> activos; Sentry verificado con un error de prueba.

---

## 0. Resumen ejecutivo

**Veredicto.** La base es buena y está cuidada: 108 componentes, los 108
`OnPush`; cero `any`; 246 tests automáticos en verde; ni un desborde, ni una
imagen sin `alt`, ni un control sin nombre en 33 rutas; CLS ≈ 0; segunda visita
en 0,3 s. Lo que ha pasado desde septiembre es **crecimiento sin las fases
estructurales**: han entrado más de diez módulos a mano y la arquitectura
modular (fase 4 del plan anterior) no se hizo. El resultado se mide:

| # | Problema | Evidencia medida | Fase |
|---|---|---|---|
| 1 | **Primera visita en móvil lento: ~7 s en blanco** | 4G lento + CPU ×4: FCP = LCP entre 6,9 y 7,9 s en las 4 páginas probadas. `<app-root>` llega vacío: nada se pinta hasta que arranca el JS | 0 · 5 |
| 2 | **131 de 163 enlaces internos responden 404** | `/anunturi/<id>`, `/conducere/<persona>`, `/impreuna/ziua/<n>`, `/botezuri/…`: funcionan en el navegador, pero para Google y para la tarjeta de WhatsApp son un error | 1 |
| 3 | **El arranque engorda y ya incumple su presupuesto** | Inicial 661 kB (aviso a 620; 585 en septiembre). El mega-menú de escritorio mete en el arranque de *todos* los datos de las familias, el plan de lectura y un carrusel | 0 · 2 |
| 4 | **La red de seguridad existe pero no está conectada** | 177 tests unitarios pasan en 8 s y **no corren en el despliegue**; no hay lint, ni e2e, ni `ErrorHandler`; 0 specs de los servicios de proyección | 0 · 1 |
| 5 | **Añadir un módulo toca 6 ficheros (10 si se proyecta)** | Cuatro registros a mano que deben coincidir (`APP_PATHS`, `APP_ROUTES`, `MAIN_NAV`, `ROUTE_PAGES`), 13 dependencias de una *feature* a otra, un servicio de bloques de 1.123 líneas | 3 · 4 |
| 6 | **El escenario es un monolito de 325 kB** | «Program săptămânal» (una tabla) descarga los 13 bloques, el motor de proyección y sus ajustes; su hoja de estilos (40,4 kB) incumple el presupuesto | 4 |
| 7 | **Datos personales en un repositorio público** | Repo `MEDIA-ELIM` público con 790 binarios (fotos de 54 familias, candidatos al bautismo) y la lista nominal de enfermos; `noindex` no es control de acceso y el historial de git no olvida | Decisión |
| 8 | **El repositorio y el despliegue crecen cada semana** | `.git` 174 MB; sitio publicado ≈ 115 MB, de los que 36,6 MB son PDF. El despliegue ha pasado de ~115 s a ~190 s en seis semanas: imprimir los PDF de **todas** las semanas de familias ocupa 108 de los 170 s del último | 0 · 2 |
| 9 | **Sin página legal ni de privacidad; terceros sin aviso** | Formulario (Web3Forms), push (OneSignal), mapa de Google en 3 páginas, fuentes servidas por Google en todas | 0 · Decisión |
| 10 | **No se sabe qué se usa ni qué falla** | Sin analítica y sin registro de errores: las regresiones se descubren en el templo | Decisión |

**Lo que propongo**, en una frase: *un registro único de módulos del que se
derive todo lo demás, el contenido separado del código y validado, la
proyección como complementos aislados, y una tubería que no publique nada que
no haya pasado las pruebas* — y sólo después, prerender para que la primera
visita no dependa del JS.

**Orden**: 0 (limpieza, 1 día) → 1 (red de seguridad) → 2 (contenido) → 3
(registro) → 4 (proyección) → 5 (carga en frío). La fase 0 no tiene riesgo y se
puede aplicar ya; las 3 y 4 son refactors y **no se empiezan sin la 1 hecha**.

---

## 1. Cómo se ha medido

| Qué | Con qué |
|---|---|
| Bundle | `ng build --stats-json` a una carpeta temporal y análisis del metafile de esbuild: composición del inicial por paquete, cadenas de import, contenido de cada chunk |
| Carga real | Playwright (`playwright-core` del proyecto) + Chrome contra producción: móvil 412 × 823, DPR 1,75, en frío. Dos perfiles: sin límite y «4G lento + CPU ×4» (el de laboratorio de Lighthouse: 562 ms de latencia, 1,47 Mbps). Visita repetida con el service worker ya instalado |
| Rutas | Barrido de las 28 URL del `sitemap.xml` + 5 `noindex`, a 1366 y a 390 px: estado HTTP, título y meta, encabezados, *landmarks*, desbordes, imágenes, nombres accesibles, contraste calculado nodo a nodo, objetivos táctiles, errores de consola; y el estado HTTP de los 163 enlaces internos encontrados |
| Código | Recuento de ficheros y líneas, grafo de imports entre áreas, patrones de riesgo (`any`, `console`, temporizadores, almacenamiento, encapsulación) |
| Contenido | El `church.config.ts` real cargado con `scripts/lib/load-ts-module.mjs`: vigentes, caducados, referencias a ficheros, peso de imágenes por ancho |
| Proceso | `npm run check`, `ng test`, `npm audit`, `npm outdated`, historial de Actions (`gh run list`) |

Límite de la medición: el perfil «4G lento» es un peor caso de laboratorio, no
la media de los visitantes. Un móvil normal con buena cobertura queda entre los
dos perfiles.

---

## 2. Diagnóstico

### 2.1 Lo que está bien (no tocar sin motivo)

- **Disciplina de código**: 108/108 componentes `OnPush`; 0 `any` explícitos; 2
  `console.*` fuera del `LoggerService`; `localStorage` siempre entre
  `try/catch`; `strict` + `strictTemplates`.
- **Capas**: `shared` no importa de `features` ni de `layout` (0 casos); `core`
  sólo un `import type`.
- **Accesibilidad de base**, en 33 rutas × 2 anchos: 0 desbordes horizontales,
  0 imágenes sin `alt`, 0 controles sin nombre accesible, 0 campos sin
  etiqueta, 0 `id` duplicados, enlace de salto y `lang` sincronizado en todas;
  más de 3.000 textos medidos con sólo ~35 fallos de contraste, concentrados en
  cuatro páginas (§ 2.7).
- **Estabilidad visual**: CLS entre 0 y 0,006.
- **PWA**: visita repetida con FCP 0,25 s y LCP 0,31 s, 0 bytes de red.
- **SEO de base**: título, descripción y canónica propios en las 28 páginas
  indexables; `noindex` correcto en las 5 con datos personales; `sitemap.xml`
  con `lastmod`; JSON-LD de la iglesia.
- **Pruebas**: 23 ficheros `.spec.ts` (177 tests, 8 s) y 5 de scripts (69
  tests), todos en verde.
- **Terceros contenidos**: YouTube por `youtube-nocookie` y sólo al pulsar;
  OneSignal se descarga sólo al activar el aviso.

### 2.2 Carga

**Laboratorio, móvil, en frío, contra producción:**

| Página | Perfil | TTFB | FCP | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| `/` | 4G lento + CPU ×4 | 0,59 s | **6,86 s** | **6,86 s** | 0,006 | 261 ms |
| `/anunturi/` | 4G lento + CPU ×4 | 0,59 s | **7,08 s** | **7,08 s** | 0 | 0 |
| `/media/program/` | 4G lento + CPU ×4 | 0,58 s | **7,92 s** | **7,92 s** | 0 | 0 |
| `/impreuna/` | 4G lento + CPU ×4 | 0,64 s | **7,93 s** | **7,93 s** | 0 | 56 ms |
| `/` | sin límite | 0,06 s | 0,72 s | 1,01 s | 0,006 | 0 |
| `/anunturi/` | sin límite | 0,38 s | 0,74 s | 0,74 s | 0 | 0 |
| `/` | repetida (SW) | 0,01 s | 0,25 s | 0,31 s | — | — |

Umbrales de Google: LCP bueno ≤ 2,5 s, malo > 4 s. **La web es rápida para quien
ya la tiene instalada o en caché y lenta para quien llega por primera vez**:
el invitado, quien viene de Google o de un enlace de WhatsApp, y —por cómo
borra Safari el almacenamiento— quien entra desde un iPhone menos de una vez
por semana. La causa es estructural: el HTML llega con `<app-root>` vacío y el
primer píxel espera a descargar 203 kB de JS (gzip), arrancar Angular y cargar
el idioma.

**Composición del inicial — 661,2 kB (203 kB gzip; GitHub Pages no sirve
brotli):**

| Parte | kB | Comentario |
|---|---|---|
| `@angular/core` + `common` + `platform-browser` | 265 | Suelo del framework |
| `@angular/router` | 97 | Suelo |
| Hoja global (`src/styles`) | 45 | Era 21 en septiembre |
| **`layout/top-nav`** | **40** | Un solo componente: el mega-menú con sus tres zonas destacadas |
| `@angular/material` + `cdk` | 65 | Eran 224: ✅ mejorado. Lo que queda es el botón de icono, el *ripple* y el registro de iconos |
| `zone.js` | 35 | Se va con *zoneless* |
| `rxjs` | 30 | |
| **`core/family-prayer.config.ts` + fotos** | **32** | 54 familias en el arranque de todos |
| **`core/church.config.ts`** | **24** | 9 de sus 11 anuncios están caducados |
| `layout/tab-bar` | 21 | Sólo se ve por debajo de 1024 px |
| `@ngx-translate` | 19 | |
| Iconos (`core/ui`) | 13 | Todos los SVG en el arranque |
| `shared/card-carousel` | 11 | Lo arrastra el mega-menú |

**La causa raíz del sobrepeso** está en una cadena de imports:
`main-layout → top-nav → FamilyPrayerService → family-prayer.config.ts`. El
panel desplegable de escritorio importa de forma estática los servicios de
familias, lectura bíblica y programa, el carrusel de tarjetas y
`features/family-prayer/family-photo`. Lo paga también el móvil, donde ese
panel **no existe**. Y al revés: el escritorio paga la barra de pestañas.

**Fuera del inicial:**

| Hallazgo | Medida |
|---|---|
| Todo el JS y CSS de la app | 121 ficheros · 2,88 MB · 822 kB gzip |
| Lo que baja cualquier primera visita, en cualquier página | 96 JS · **712 kB**: `PreloadAllModules` precarga todas las rutas (incluidos el panel de control, 135 kB, y la guía de estilos, 41 kB). El comentario de `app.config.ts` habla de «≈ 200 kB» |
| **Chunk muerto** | `@angular/animations`, 67,9 kB: lo declara `provideAnimationsAsync()` y nadie lo usa (Material 22 ya no lo pide como dependencia; 0 usos en `src/app`). En ejecución no llega a cargarse —el cargador sólo actúa si un componente declara animaciones—, pero el service worker lo precachea en cada versión |
| Chunk del escenario | 325 kB + 40 kB de CSS para cualquier `/media/<bloque>` |
| Diccionario por idioma | 63,7 kB (23 en septiembre): 1.330 claves, 44 raíces; `about`, `talent_contest`, `leadership` y `presenter` suman 27 kB que usan una o dos páginas cada uno |
| Fuentes | 7 `woff2` desde `fonts.gstatic.com`, **247 kB**, tras el primer pintado. Sobra el `preconnect` a `fonts.googleapis.com` (su CSS ya va incrustado en el HTML) |
| Material Symbols | Declarada en `index.html`, con su script y sus reglas CSS, y **no se descarga nunca**: es código muerto en tres sitios |
| Portada en móvil | 881 kB de imágenes en 8 s (15 peticiones); 5 fotos de familias sin `lazy` a tres pantallas de distancia (≈ 196 kB) |
| Miniaturas | Los carteles de `/media/evenimente` (864–1080 px) se pintan a 32 px; las de YouTube (`hq720`, 1280 px) a 176–249 px |
| Imágenes grandes | Las 45 `-1600.webp`: mediana 214 kB, p90 722 kB, máximo **1.043 kB** (los retratos de `leadership`). Un WebP de 1600 px no debería pasar de ~300 kB |

### 2.3 Arquitectura

| Síntoma | Medida |
|---|---|
| Tamaño | 243 `.ts` · 41.600 líneas; 84 `.scss` · 38.400 líneas (casi tanto estilo como lógica); 19 *features* |
| Registros a mano que deben coincidir | `APP_PATHS`, `APP_ROUTES` (492 líneas, con 6 redirecciones de bloque), `MAIN_NAV`, `ROUTE_PAGES` del script de páginas estáticas (su comentario: «deben ser las mismas que `data.seo`») |
| Un módulo nuevo | 6 ficheros; si además se proyecta, 4 más (unión `PresentationBlockId`, `expand()`, el `@switch` de `stage.component.html`, duraciones) |
| `church.config.ts` | 1.580 líneas · 64 kB de fuente · lo importan 52 ficheros de 22 áreas |
| `PresentationBlocksService` | 1.123 líneas; inyecta 8 servicios y conoce cada bloque por su nombre |
| Escenario | `@switch` de 13 bloques con imports estáticos → un único chunk; `stage.component.scss` 1.797 líneas; 8 componentes con `ViewEncapsulation.None` |
| *Feature* → *feature* | 13 aristas: `family-photo` lo usan portada, portada de sección, menú y escenario; `credo.data`, `leadership.view`, `announcement-card`… Son piezas compartidas que viven dentro de una *feature* |
| `layout` → *feature* | 1 (`top-nav` → `family-photo`) |
| Fronteras | No las vigila nada: no hay ESLint |

### 2.4 Robustez en ejecución

- **Sin `ErrorHandler` propio** ni escucha de errores globales. Un fallo de
  plantilla en un bloque puede dejar la proyección en blanco, y nadie se entera.
- **21 `@defer`, ninguno con `@error`** y sólo 7 con `@placeholder` (la norma
  del repo pide reservar altura).
- **Chunks caducados tras un despliegue** (riesgo, no reproducido): cada
  publicación sustituye el sitio entero. Una pestaña abierta con la versión
  anterior y sin service worker (los primeros 30 s, o un navegador que no lo
  admita) puede pedir un chunk diferido o un paquete de idioma que ya no
  existe, y falla en silencio. No hay `withNavigationErrorHandler`.
- **`**` → portada**: una URL equivocada responde 404 y enseña la portada sin
  decir nada. El visitante no sabe que el enlace estaba mal.

### 2.5 Red de seguridad y proceso

| Pieza | Estado |
|---|---|
| Tests unitarios | 177, en verde, **fuera de `npm run check` y de `deploy.yml`** |
| Servicios críticos | Sin un solo spec: `ScheduleService`, `AnnouncementsService`, `PresentationBlocksService`, `CarouselService`, `PresentationSyncService`, `FamilyPrayerService` |
| Lint / formato | No hay ESLint ni Prettier |
| E2E | No hay (Playwright ya es dependencia y ya imprime los PDF) |
| Presupuestos | El inicial está por encima del aviso (ya lo estaba antes de Proiectul Împreună: 652,8 kB) y el de estilos del escenario también. Avisan, no bloquean |
| Dependencias | Sin Dependabot. `npm audit`: 19 avisos (2 críticos, 10 altos), casi todos en herramientas de desarrollo; en producción, `pdfjs-dist` (alto: ejecución de JS con un PDF malicioso; hoy sólo abre PDF propios). Angular 22.1.7 → 22.2.6 disponible |
| Despliegue | 40 últimos: 39 bien, 1 fallido a los 21 s. **De 104–136 s a principios de octubre a 161–219 s en noviembre**: el paso «Family prayer PDFs» imprime las 11 semanas en cada publicación (64 s en octubre, **108 s** hoy; el build son 13 s) |
| `main` | Sin protección; cada *push* publica. No hay entorno de pruebas |
| Node | El global del equipo es 20.10 y el proyecto exige ≥ 22.22: depende de acordarse de anteponer el Node portable |

### 2.6 Contenido, repositorio y datos personales

- **Contenido muerto en el arranque**: 9 de 11 anuncios caducados (el más
  antiguo, del 26/09) y 5 de 10 eventos pasados siguen en `church.config.ts`.
  Sin ids duplicados y sin referencias rotas (45 de 45 ficheros existen).
- **Peso**: el build local son 91,5 MB en 936 ficheros —18 MB de fotos de
  familias, 14,5 MB de un único `.mp4`, 13 MB de retratos, 20 MB de
  bautismos—; en producción, con los PDF de las 11 semanas (36,6 MB), ronda los
  115 MB. El repositorio, 174 MB con 122 commits; 790 de sus 1.298 ficheros son
  binarios. Las familias suman ~1,6 MB de fotos por semana más ~3,3 MB de PDF.
  El límite de GitHub Pages es 1 GB: hay margen de años, pero el historial de
  git sólo crece.
- **Datos personales.** El repositorio es **público**. Contiene y publica las
  fotos de 54 familias (con menores), los perfiles de los candidatos al
  bautismo y `/cauze-de-rugaciune`, con ocho personas nombradas bajo
  «Vindecare». Las páginas llevan `noindex`, que sólo pide a los buscadores que
  no las listen: quien tenga el enlace —o abra el repositorio— lo ve todo, y
  una foto retirada de la web **sigue en el historial de git**. No es un fallo
  de código sino una decisión que conviene tomar a sabiendas (§ 7.1).
- **Sin página legal ni de privacidad.** La web recoge datos (formulario por
  Web3Forms, suscripciones push por OneSignal), incrusta el mapa de Google en
  `/contact`, `/media/locatie` y `/media`, y pide las fuentes a Google en todas
  las páginas. Lo único que lo explica hoy es la frase de consentimiento del
  formulario.

### 2.7 Accesibilidad y SEO (lo que falla)

| Hallazgo | Dónde | Medida |
|---|---|---|
| Sin `<h1>` y con dos `<main>` | Las 8 páginas `/media/*` | El escenario trae su propio `<main>` dentro del de la maqueta |
| Contraste | `toc__badge` y `article__anchor` (credo, familias) | 2,5:1 a 12 px (mínimo 4,5) |
| Contraste | `fpdf__meta`, rango de fechas de familias | 3,26 y 3,32:1 |
| Contraste | `gallery__item-date` | 4,26:1 |
| Contraste | `ui-status` (`warn`, `live`, `ok`) en `/stil` | 3,17–3,95:1: es una primitiva del catálogo |
| Objetivos táctiles < 24 px | Migas (15 × 15), enlaces del pie (19 px de alto), puntos del hero (31 × 15), `plan-watch`, `milestone-row__watch` | WCAG 2.2 AA pide 24 × 24 |
| Enlaces profundos | 131 de 163 enlaces internos | Estado 404 |
| Tarjeta al compartir | Todas menos `/invitati` | La misma `og-image.jpg` genérica |
| Español | Toda la web | Sin URL propia ni `hreflang`: Google sólo ve el rumano |
| Eventos | — | Sin JSON-LD `Event` |
| Descripciones cortas | 6 departamentos y `/biserica` | 31–43 caracteres |

### 2.8 Documentación desalineada

Los shards son el manual de trabajo de la IA; cuando mienten, la IA se equivoca
con seguridad. Encontrado:

- `70-roadmap.md`, `50-build-deploy.md` y `copilot-instructions.md`: «aún sin
  specs» — hay 177 tests.
- `copilot-instructions.md`: presupuesto «500 kB / 1 MB» (es 620 / 800); regla
  de `mat.x-theme` por componente (es de M2, el tema ya es M3); su tabla de
  shards no conoce ninguno del 32 al 49 ni el 75.
- `00-index.md`: `_theme.scss` «(M2, navy + dorado)».
- `app.config.ts`: «≈ 200 kB de chunks diferidos» (son 2,7 MB).
- `deploy.yml`: «hoy `invitati/`» (son 32 páginas).
- `docs/ai` pesa 543 kB; tres shards pasan de 45 kB, contra el propio
  protocolo de «cargar sólo lo necesario».

### 2.9 Estado del plan de septiembre

| Fase | Entonces | Hoy |
|---|---|---|
| 1 · Carga rápida | ⏳ | Material/CDK del inicial 224 → 65 kB ✅; `forms` fuera del inicial ✅. Siguen: Material Symbols, fuentes propias, presupuestos (se incumplen) |
| 2 · Proyección legible | ✅ | ✅ |
| 3 · Web compacta | Fundamentos ✅ | No auditada aquí (el diseño no está cerrado: `AGENTS.md`) |
| **4 · Arquitectura modular** | Pendiente | **Sin empezar**, y con diez módulos más encima |
| 5 · Plataforma | Angular 22 ✅ | Siguen *zoneless*, prerender (hay páginas estáticas sólo con metadatos), `ErrorHandler` |
| 6 · Red de seguridad | Vitest configurado | 177 tests escritos pero sin conectar; sin Playwright ni ESLint |

El objetivo de «inicial ≤ 420 kB» ya no es realista: sólo las librerías suman
476 kB en Angular 22, sin contar `zone.js`. El objetivo útil no es el peso del
JS sino **que el primer pintado no dependa de él** (§ 3.5).

---

## 3. Arquitectura objetivo

Cinco piezas. Cada una resuelve un problema medido y ninguna rompe los
invariantes del repositorio (sin backend, estático, ES/RO en paridad).

### 3.1 Un registro de módulos del que se deriva todo

```
features/<modulo>/
  <modulo>.module.ts     ModuleDef: id, ruta, SEO, entrada de menú, i18n, bloques
  <modulo>.routes.ts     rutas hijas (loadChildren)
  <modulo>.content.ts    sus datos, tipados
  i18n/{ro,es}.json      sus textos
  ui/ …                  lo que otras features pueden usar de él (API pública)
```

`core/modules/registry.ts` lista los `ModuleDef` —sólo metadatos y cargadores
perezosos, nada de componentes— y de ahí salen `APP_ROUTES`, `MAIN_NAV`, el
pie, las páginas estáticas y el `sitemap.xml` (el script lee el registro con
`load-ts-module.mjs`), los paquetes de traducción y los bloques proyectables.
Añadir un módulo pasa a ser **una carpeta y una línea**; `scripts/new-module.mjs`
genera el esqueleto. Las cuatro listas que hoy deben coincidir a mano dejan de
existir.

### 3.2 Contenido separado del código, y validado

- `church.config.ts` se parte por dominio. En el arranque queda sólo la
  **identidad** (nombre, URL, contacto, redes). Anuncios, eventos, hero,
  galería, familias y lectura viven con su módulo y los carga quien los pinta.
- **`scripts/check-content.mjs`** en `npm run check`: fechas válidas,
  `expiresOn` posterior a `publishedOn`, ids únicos, cada imagen referenciada
  existe en todos sus anchos y dentro de su presupuesto de peso, cada clave
  i18n citada existe. Y un informe de **lo caducado**, que se archiva fuera del
  bundle en vez de acumularse.
- El contenido sigue siendo TypeScript: el compilador es hoy el mejor validador
  que tiene el proyecto y se conserva. No propongo un CMS (§ 8).
- **Imágenes por una sola puerta**: `npm run images:add -- <preset>` con los
  anchos y el presupuesto de cada tipo (retrato, cartel, familia, hero).

### 3.3 La proyección como complementos aislados

`BlockDef { id, titleKey, load, auto(ctx), expand(ctx), defaultDurationS }`
junto a cada bloque. El motor (`PresentationBlocksService`, hoy 1.123 líneas)
se queda en orden, activación, selección y persistencia, e itera el registro
sin conocer ningún bloque por su nombre. Tres consecuencias:

1. `/media/program` descarga su bloque (~30 kB), no los 325 kB del escenario.
2. Cada bloque se monta dentro de una **frontera de error**: si uno falla, se
   registra y el carrusel salta a la siguiente diapositiva. La proyección no se
   queda en blanco (invariante 5, hoy sin garantía en código).
3. Al abrir la ventana de proyección se **precargan todos los bloques activos**:
   la carga perezosa nunca ocurre a mitad de culto.

### 3.4 Fronteras vigiladas por la máquina

ESLint (`angular-eslint`) con reglas de frontera: una *feature* sólo importa de
`core`, de `shared` y de la API pública (`ui/`) de otra; `shared` y `layout` no
importan de `features`; nada importa de `features/*/` por dentro. Los 13 cruces
de hoy se resuelven moviendo cada pieza a su sitio. Es lo que impide que la
arquitectura se vuelva a deshacer con los próximos diez módulos.

### 3.5 Render: HTML primero

`outputMode: 'static'` de `@angular/build` (la opción ya existe en la versión
instalada; hay que añadir `@angular/ssr`) con hidratación: cada ruta pública
sale del build como HTML con su
contenido. El primer pintado deja de esperar al JS y cada URL —también las de
datos— responde 200 con su propio título y su propia tarjeta. Herramientas del
operador (`/media/control`, `/media/ecran`, hojas de imprimir) siguen en
cliente. Lo que depende de la hora («hoy», cuenta atrás) se pinta en cliente o
se refresca con una compilación nocturna.

Es la pieza de más impacto y de más riesgo: va la última y **con una decisión
intermedia barata** (fase 1): generar páginas estáticas con metadatos para las
URL de datos, que arregla los 404 sin tocar el render.

### 3.6 Una tubería que no publica nada sin pasar

```
push ─▶ verify: lint · tipos · build (presupuestos como error) · unit · scripts
                 · check-content · e2e de humo sobre el dist
        └─▶ deploy (sólo si verify está en verde) ─▶ humo contra producción
cron nocturno ─▶ verify + deploy (refresca lo que depende de la fecha)
```

El e2e de humo (Playwright sobre el `dist` servido en local) recorre las rutas
del registro en dos anchos —estado, consola limpia, sin desbordes, un `<h1>`,
axe— y la proyección a 1920 × 1080: todas las diapositivas pintan, ninguna en
blanco, tamaño mínimo de letra. Es, automatizado, el barrido que se ha hecho a
mano para esta auditoría.

---

## 4. Plan por fases

Esfuerzo en jornadas de trabajo con IA, como en el plan anterior.

### Fase 0 · Limpieza sin riesgo — 1 día

| Cambio | Efecto esperado |
|---|---|
| `ng test --watch=false` dentro de `npm run check` | 177 tests pasan a bloquear un despliegue roto (+8 s) |
| Quitar `provideAnimationsAsync()` y `@angular/animations` | Una dependencia obsoleta menos y −68 kB del precaché |
| Quitar Material Symbols (enlace, script, CSS, `setDefaultFontSetClass`) y el `preconnect` sobrante | Código muerto fuera; una conexión menos |
| Zonas destacadas del mega-menú tras `@defer (on hover; prefetch on idle)` | **≈ −80 kB del inicial** (estimado: la suma de lo que hoy arrastra); se confirma con el build |
| `withNavigationErrorHandler` (recarga una vez si falta un chunk) + `provideBrowserGlobalErrorListeners()` + `ErrorHandler` → `LoggerService` | Los fallos dejan de ser silenciosos |
| Página 404 de verdad en lugar de la redirección a la portada | El visitante sabe qué ha pasado y adónde ir |
| `<h1>` y un solo `<main>` en `/media/*`; contraste de las 6 clases de § 2.7; objetivos táctiles ≥ 24 px | 0 fallos en el barrido |
| `lazy` en las fotos de familias de la portada; miniatura propia para los avatares de evento | −200 kB en la portada |
| Dependabot mensual agrupado; `pdfjs-dist` y Angular 22.2 | Avisos de seguridad atendidos |
| PDF de familias: imprimir sólo las semanas nuevas o cambiadas; el resto, de caché | Despliegue de vuelta a ~1-2 min y sin crecer cada semana |
| Corregir los 6 desajustes de documentación de § 2.8; `.nvmrc` | La IA deja de leer datos falsos |
| Presupuesto del inicial como **error** justo por encima del valor resultante | No puede volver a crecer sin que alguien lo decida |

**Aceptación**: inicial ≤ 590 kB; `npm run check` ejecuta los tests; barrido de
§ 2.7 sin fallos de contraste, de encabezados ni táctiles; build y proyección
verificados.

### Fase 1 · Red de seguridad — 2-3 días

- ESLint con las reglas de frontera en modo aviso (pasan a error en la fase 3).
- Specs de `Schedule`, `Announcements`, `PresentationBlocks`, `Carousel`,
  `PresentationSync` y `FamilyPrayer`.
- Playwright de humo (§ 3.6) y axe en el despliegue.
- `check-content.mjs`.
- **Páginas estáticas para las URL de datos** (`/anunturi/<id>`,
  `/conducere/<persona>`, `/impreuna/ziua/<n>`, `/botezuri/…`) con su título,
  su descripción y `noindex` donde toque, ampliando `generate-route-pages.mjs`.
- `deploy.yml` partido en `verify` → `deploy` → humo en producción; cron
  nocturno.

**Aceptación**: 0 enlaces internos con 404; un cambio que rompa una ruta, un
bloque o una fecha no se publica.

### Fase 2 · Contenido por dominio — 2-3 días

- `church.config.ts` → identidad + un fichero por dominio; caducados
  archivados.
- i18n por módulo con el `TranslationPackService` que ya existe: `about`,
  `talent_contest`, `leadership`, `presenter`, `baptisms`, `contact`, `donate`,
  `install`.
- `images:add` con presupuestos; recomprimir las `-1600.webp` que pasan de
  300 kB.

**Aceptación**: inicial ≤ 565 kB; diccionario principal ≤ 25 kB; ningún
`-1600.webp` por encima de 300 kB.

### Fase 3 · Registro de módulos — 3-5 días

`ModuleDef`, registro, derivación de rutas, menú, pie, páginas estáticas e
i18n; `new-module.mjs`; los 13 cruces entre *features* resueltos; reglas de
frontera como error.

**Aceptación**: un módulo de prueba = una carpeta + una línea; `app.routes.ts`
por debajo de 80 líneas; 0 avisos de frontera.

### Fase 4 · Proyección como complementos — 3-4 días, con la proyección delante

Registro de bloques, carga perezosa con precarga al proyectar, frontera de
error por diapositiva, `PresentationBlocksService` y `stage.component.scss`
partidos por bloque.

**Aceptación**: `/media/program` descarga menos de 80 kB de escenario; un
bloque que lanza una excepción no detiene el carrusel (probado en e2e);
`stage.component.scss` dentro de presupuesto.

### Fase 5 · Carga en frío — 3-5 días

1. Fuentes propias (subconjunto latino + extendido, dos precargadas).
2. *Zoneless* (−35 kB) — pendiente de tu decisión desde septiembre.
3. Cabecera sin Material: `<app-icon>` pinta su SVG sin `MatIconRegistry`
   (−65 kB; Material sigue siendo la librería de la app, cargada donde se usa).
4. Prerender estático con hidratación de las rutas públicas.

**Aceptación**: en «4G lento + CPU ×4», FCP ≤ 2 s y LCP ≤ 3 s en la portada;
inicial ≤ 480 kB; ninguna petición a Google.

---

## 5. Mejoras de producto

Ordenadas por valor ÷ esfuerzo, y apoyadas en lo que ya existe:

| Mejora | Valor | Esfuerzo | Se apoya en |
|---|---|---|---|
| **Tarjeta propia al compartir** cada anuncio, evento y día de Împreună (imagen 1200 × 630 generada en el despliegue) | Alto: WhatsApp es el canal de la iglesia y hoy todo enlace enseña la misma imagen | Bajo | Playwright en CI + páginas estáticas de la fase 1 |
| **Arhivă de predici**: emisiones con buscador y filtros por tipo, tema y fecha | Alto | Medio | `youtube-title.ts` ya parte el título; el cron ya trae los datos |
| **Calendario mensual**: eventos, programa, botezuri y fases del concurso en una vista | Alto | Medio | `CalendarService` y el `.ics` |
| **Boletín semanal** en PDF e imagen para el grupo: programa, anuncios, lectura y familias | Alto | Medio | La misma tubería que los PDF de familias |
| **Avisos push por tema**: anuncio nuevo y «empezamos en directo» | Alto | Medio | `PushService` (ojo al límite de etiquetas del plan gratuito de OneSignal) |
| **Cereri de rugăciune**: formulario como el de contacto | Medio-alto | Bajo | `ContactFormService` |
| **Salud del contenido en el panel de control**: qué caduca esta semana, qué falta | Medio | Bajo | `check-content` |
| **Buscador global** (páginas, anuncios, eventos, credo, personas) con índice generado en el build | Medio, crece con los módulos | Medio | El buscador del credo; el registro de la fase 3 |
| **JSON-LD `Event`** | Medio (resultados enriquecidos) | Bajo | Fase 1 |
| **URL en español** (`/es/…`) + `hreflang` | Medio: quien busca «iglesia Arganda» hoy no os encuentra | Alto sin prerender, bajo con él | Fase 5 |

---

## 6. Métricas objetivo

| Métrica | Hoy | Tras fase 0 | Final |
|---|---|---|---|
| Inicial (raw / gzip) | 661 / 203 kB | ≤ 590 | ≤ 480 / ≤ 150 kB |
| FCP · LCP, portada, 4G lento | 6,9 s · 6,9 s | — | ≤ 2 s · ≤ 3 s |
| LCP, visita repetida | 0,31 s | = | = |
| JS de una primera visita | 712 kB | = | por decidir (§ 7.5) |
| Enlaces internos con 404 | 131 | 131 | 0 (fase 1) |
| Tests que bloquean el despliegue | 69 | 246 | + e2e de humo |
| Ficheros para añadir un módulo | 6-10 | = | 1 carpeta + 1 línea |
| Fallos de contraste / páginas sin `<h1>` / clases con objetivo táctil corto | ~35 / 8 / 7 | 0 | 0, vigilado en CI |
| Despliegue | 170–220 s y subiendo | ~90 s estable | — |
| Diccionario principal | 63,7 kB | = | ≤ 25 kB |

---

## 7. Decisiones que necesitan al usuario

1. **Datos personales en abierto** (no es asesoría legal: es una decisión del
   comité). Opciones, de menos a más cambio: (a) seguir igual, con
   consentimiento escrito de cada familia y un plazo de retirada; (b) reducir:
   en la web sólo la semana en curso y nombres de pila en las causas de
   sanidad; (c) puerta de acceso sin backend: el contenido cifrado en el
   navegador con una clave que se reparte en el grupo de la iglesia; (d) sacar
   fotos y datos personales a un repositorio privado que el despliegue lee
   —el código sigue público y el historial deja de acumular—.
2. **Página «Legal y privacidad»** y mapa de Google sólo al pulsar. Recomendado:
   sí; es una página y una fachada.
3. **Analítica sin cookies y registro de errores**. Requiere un tercero (no hay
   backend). Recomendado: sí, lo mínimo, para decidir § 5 con datos.
4. **Zoneless**. Recomendado: sí, dentro de la fase 5 y con el e2e delante.
5. **Precarga total**. Hoy todo visitante baja la app entera (822 kB) para que
   funcione sin red. Es una virtud en el templo y un coste en datos móviles.
   Recomendado: mantenerla, pero sin las herramientas del operador para el
   público.
6. **Prerender** (fase 5.4): decidir tras medir las fases 0-2.
7. **Qué mejoras de producto** entran y en qué orden.

---

## 8. Lo que no propongo, y por qué

- **Un backend o un CMS.** Rompe el invariante 1 y no hay evidencia de que haga
  falta: quien publica eres tú, con IA, y el contenido tipado es más seguro que
  un formulario. Si algún día publica otra persona, la separación de contenido
  de § 3.2 es exactamente lo que un CMS sobre git necesita.
- **Cambiar de alojamiento ahora.** GitHub Pages obliga a tres apaños
  (`404.html`, páginas estáticas, sin cabeceras ni brotli) y los tres están
  resueltos o se resuelven en la fase 1. Sólo lo reabriría la decisión 7.1 (d).
- **Quitar Angular Material.** Ya decidido en septiembre; lo que queda en el
  inicial son 65 kB y se resuelven cargándolo donde se usa.
- **Migrar el estado a un store global.** `16-state.md` acierta: signals en
  servicios; no hay estado de servidor.
- **Tocar el diseño ni el alto del hero.** Esta auditoría mide; no rediseña.
