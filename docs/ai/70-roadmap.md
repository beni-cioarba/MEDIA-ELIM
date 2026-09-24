# 70 · Auditoría y deuda técnica

Estado tras la reestructuración de navegación + design system.

## Ya resuelto

### Iteración 1 — presentación

- Router montado con carga diferida → el escenario salió del bundle inicial.
- Escenario reducido a orquestación; cinco bloques extraídos a componentes.
- Lógica temporal centralizada en `ClockService` + `ScheduleService`.
- Carrusel movido a `CarouselService` (`effect()` en vez de `setInterval`).
- Control de **bloques a presentar** con modo auto/manual persistido.
- Documentación para IA fragmentada en `docs/ai/` + instrucciones por glob.

### Iteración 2 — web pública, navegación y design system

- `features/home` (escenario) renombrada a `features/stage`; `home` es ahora la
  **portada pública**.
- `MainLayoutComponent` + `TopNavComponent` + `MobileNavComponent`: shell
  reutilizable con menú de escritorio (`mat-menu`) y drawer móvil diferido.
- Rutas con nombre (`APP_PATHS`) y enlaces profundos por bloque
  (`/media/:blockId`), con SEO por ruta (`data.seo` + `AppTitleStrategy`).
- Páginas nuevas: portada con carrusel, «Quiénes somos» y «Liderazgo».
- **Design system en tres capas** (`src/styles/`): primitivas → semántica →
  componente, con mixins de breakpoints, foco y superficies.
- **Angular Material 17** con tema M2 propio (navy + dorado), emitiendo sólo el
  tema de los componentes en uso.
- Iconos: SVG inline registrados en `MatIconRegistry` (`provideElimIcons()`),
  tipados con `IconName`; Material Symbols como fuente secundaria no bloqueante.
- `UiStore` con `@ngrx/signals` para el estado de la interfaz.
- `LoggerService` con ámbito, cableado en `YouTubeService` y `CalendarService`.
- Logotipo web pasado a WebP de 384 px: **423 kB → 9 kB** (después retirado del
  todo: la iglesia es el wordmark `app-brand-logo`, INEB es SVG en el bundle y el
  icono de la app se genera desde el emblema — `45-design-system.md` → «Marca»).

### Iteración 3 — proyección legible a distancia

- **Sistema de proyección** propio (`features/stage/styles/_projection.scss`):
  unidad de diapositiva `--pj-u` y escala `--pj-fs-*` proporcional al lienzo,
  como una diapositiva; misma imagen en XGA, Full HD y 4K.
- Panel de medios **neutro**: tarjetas blancas con icono navy, sin gradientes
  de red, sin halos animados ni resaltado rotatorio en proyección; título
  anclado arriba en todas las diapositivas; dock y controles ocultos hasta
  acercar el ratón.
- Jerarquía de redes para el templo: red en versalitas → **@handle** a 4,8u →
  descripción. QR con corrección `M` (módulos un 24 % mayores).
- Primer paso del troceado de `stage.component.scss`: la proyección y el
  responsive salen a parciales-mixin incluidos al final (arregla, además, que
  Sass emitiera sus reglas antes de las base y quedaran pisadas).

### Iteración 4 — anuncios y control del lienzo

- **Anunțuri** (`docs/ai/35-announcements.md`): modelo estructurado en
  `church.config.ts` con caducidad, servicio de vigencia, página `/anunturi`
  (+ enlace propio por anuncio) y **una diapositiva por anuncio** al principio
  del carrusel. Un solo renderizador para web y proyección, con autoajuste
  (`appFitToBox`) para que siempre quepa, con o sin QR.
- Modelo de **diapositivas** (`PresentationSlide`) separado del de bloques;
  «Próximos eventos» paginado (2 por diapositiva) para que nada se corte.
- **QR configurable**: mostrar/ocultar (tecla `Q`) y tamaño S/M/L
  (`PresentationDisplayService`); sin QR los bloques se recolocan.
- **Ritmo y selección**: duración por bloque editable desde el panel (anuncios
  30 s por defecto) y casilla por anuncio para dejar fuera el que no toque.
- Tarjeta de anuncio rediseñada (ficha de fecha, columnas editoriales, tipos
  de sección `prices`/`people`/`schedule`, banda de cierre).
- **Citirea Bibliei**: bloque proyectable con la semana del plan de lectura
  que toca (la que contiene mañana), datos generados desde el Excel de la
  iglesia por `scripts/import-bible-plan.py`.

### Iteración 5 — panel de control y ventana de proyección

- **Dos ventanas**: panel de control (`/media/control`, vista del presentador
  con lista de diapositivas, vista previa, transporte y ajustes) y ventana de
  proyección (`/media/ecran`) que se abre aparte y se lleva a la segunda
  pantalla (directamente, con la Window Management API en Chromium).
- **Un solo reloj**: `PresentationSyncService` (BroadcastChannel) elige líder
  por prioridad, publica estado y ejecuta órdenes; los ajustes se sincronizan
  por `storage`. La proyección sigue sola si se cierra el panel; la vista
  previa releva si se cierra la ventana.
- Los controles flotantes de la proyección se conservan como respaldo.
- **Pantalla completa desde el panel**: el gesto del clic viaja delegado a la
  ventana (`postMessage` + `delegate: 'fullscreen'`), el líder publica
  `fullscreen` en su latido y el panel pinta el botón como pulsado; donde no hay
  delegación, aviso para pulsar `F`. La referencia a la ventana se recupera por
  su nombre si el panel se recarga.

### Iteración 6 — sistema de marca compartido con la app administrativa

- **Tres piezas y un solo uso para cada una** (`45-design-system.md` → «Marca»):
  wordmark `app-brand-logo` para la iglesia en la UI; **emblema** (disco interior
  del sello institucional) sólo en el icono de la app, generado con
  `npm run pwa:icons` sobre baldosa navy (un PNG para `any` + `maskable`, Apple
  180, favicon PNG + ICO 16/32/48); **INEB** como `app-ineb-logo`, SVG
  autocontenido copiado tal cual de la app administrativa con su hoja de marca.
- Retirados `assets/logo-elim.png/webp` y `logo-ineb.png` y el campo
  `CHURCH_CONFIG.logo`: no queda ninguna imagen de marca en `assets/`.
- **Auditoría del wordmark** con el listón de INEB: `app-brand-logo` pasa a ser
  autocontenido (paleta y tipografías de marca literales, CSS plano, ngx-translate
  opcional, `mono`, `label`, `size="context"`, enlace externo) con su propio
  `README.md` (hoja de marca: retícula, contrastes medidos por fondo, mínimo 24 px,
  prohibiciones, reproducción fuera de Angular). Arreglado el hueco entre líneas,
  que dependía del cuerpo del contexto y no del tamaño de marca. `brand.short` y
  `brand.location` dejan de ser claves i18n (son constantes de identidad). La
  copia *port* de la app administrativa debe sustituirse por esta carpeta.

### Iteración 7 — responsive 100 % y plan de evolución

- Auditoría responsive de las 11 rutas en 320 · 375 · 768 · 1024 · 1280 con
  `scripts/responsive-audit.snippet.js`; corregidos la barra del panel (envuelve
  en vez de aplastar), la cabecera pública a 320 px (dos columnas, directo en
  icono), el rango de semana del bloque bíblico, la cabecera de bloque del panel
  y el distintivo de vista previa. Regla e invariante «responsive 100 %» escritos
  para la IA.
- Marca en el panel de control en su tinta oscura (sin pastilla clara).
- `docs/ai/75-plan-evolucion.md`: diagnóstico medido (bundle, fuentes, proyección,
  densidad) y plan por fases. **Los pendientes de abajo quedan subordinados a ese
  plan.**

### Iteración 8 — Angular 22, tema M3, proyección legible

- **Angular 17 → 22.1** paso a paso con `ng update` (Material/CDK, `@ngrx/signals`,
  `angularx-qrcode` 22; ngx-translate 18 con `provideTranslateService` y
  `TranslatePipe`; TypeScript 6; `@angular/build` + Vitest en vez de devkit +
  Karma; `provideAppInitializer`). Node 24 LTS portable en `C:/workspace/.tools`
  porque el CLI exige ≥ 22.22. zone.js sigue, explícito: zoneless pendiente de
  decisión.
- **Tema Material M3** (`mat.theme` + paletas generadas + overrides a navy/oro):
  hoja global 38 → 21 kB; ya no hay que registrar el tema de cada componente.
- **i18n sólo del idioma activo**: chunk por idioma (`import()`), inicial 585 kB
  (597 en Angular 17 pese a cinco versiones más).
- **Proyección legible a distancia, en escala de cartel** (segunda vuelta tras
  probar la paginación y descartarla: «cada anuncio en una diapositiva, de un
  vistazo»): escala `--pj-fs-*` 3,2 / 3,8 / 4,6 / 5,6 / 8u; un anuncio = una
  diapositiva con jerarquía (columnas hasta 2 secciones, apiladas con 3+,
  personas en texto corrido, autoajuste 1–0,7 con suelo de 3,2u por `max()`,
  sección `webOnly` para el detalle); semana entera en una diapositiva (fila
  día | hora | título); eventos de dos en dos; rótulos cortos; filas a altura
  natural; secundario fuera; `check-projection-sizes.mjs` en `npm run check` y
  en CI. Medido con y sin QR: 10 diapositivas sin desbordes, mínimo 3,2u.
- El panel completo de la web (`/media`) ya **no** muestra anuncios ni lectura
  bíblica: cada uno vive en su sección (`/anunturi`, `/media/citirea-bibliei`)
  y en la proyección. `expand(id, view)` distingue `projection` / `panel` / `web`
  (la web no pagina nada).

### Iteración 9 — lenguaje visual y guía de estilos viva

- **Cambio de lenguaje visual** destilado de Coursera, Google Store, Gmail y la
  consola de Google Cloud (detalle y porqués en `47-design-language.md`):
  radios contenidos (4–16 px, antes 6–32), elevación plana (el filete separa,
  la sombra flota), raíz tipográfica 15→17 px (antes llegaba a 20) y escala
  tipográfica corta, botones planos sin degradado ni salto.
- **Densidad como token** (`--ui-*`) con dos modos: `comfortable` (web) y
  `compact` (consolas, clase `.ui-dense`). Y **superficie oscura** `.ui-dark`,
  que sólo redefine tokens: las primitivas funcionan igual en claro y oscuro.
  El panel de control ya arranca con `ui-dense ui-dark` en su host.
- **Catálogo de primitivas** `ui-*` (`src/styles/_primitives.scss`): tarjeta,
  panel, cabecera de sección, lista y fila densa, barra de herramientas, botón
  de icono, chip, estado, segmentado, campo, pestañas, métrica, metadatos,
  estado vacío, tecla y filete.
- **Guía de estilos viva en `/stil`** (`features/styleguide/`): tokens y
  primitivas en vivo, con su marcado copiable, un interruptor de densidad y la
  escala de proyección. Es la referencia para personas y para la IA; una
  primitiva nueva sin su ejemplo allí es un cambio incompleto.

### Iteración 10 — las referencias, medidas y aplicadas

- **Se abrieron Coursera y Google Store y se midieron** con `getComputedStyle`
  en vez de trabajar sobre capturas. La tabla de valores vive en `/stil` →
  «Referencias medidas» y resumida en `47-design-language.md`.
- **Lo que cambió por lo medido**: tracking graduado por nivel (`--ls-*`, de
  −0,02 em a +0,01 em) en vez de un −0,02 em plano; rótulo de bloque a
  `--fs-section` (≈20 px, como las referencias) y en grotesca —el
  `ui-section-head__title` seguía en serif, contra lo ya decidido—; radio
  único de tarjeta `--r-card` (16 px web / 8 px consola) donde convivían
  cinco; nada de `translateY` al apuntar; tintes planos en vez de degradados.
- **Piezas nuevas del catálogo**: `ui-band` (+`__inner`, `--gold`) y
  `ui-stat--band` para el corte de ritmo a sangre, `ui-card--soft` (superficie
  con tono, sin filete) y `ui-row--wrap` (título a dos líneas, para columnas
  estrechas).
- **Portada**: tablero de tres columnas «lo que viene» sobre banda agrupadora,
  banda de cifras a sangre en navy (las cifras salieron de la columna derecha
  de «bienvenida», que pasa a ser un bloque editorial a ancho de prosa),
  ministerios como `ui-chip` y rejilla de accesos a 3 × 2 (antes 4 + 2, con
  fila coja).
- **Páginas públicas** (`about`, `credo`, `contact`, `donate`): radios
  unificados y fuera el salto al apuntar.
- **Portada a pantalla completa otra vez** (revisa la decisión de la
  iteración 9): foto a sangre ocupando el viewport menos la cabecera desde
  860 px —66 svh en móvil, para que asome lo que viene—, con carrusel
  automático, *Ken Burns* alternado, fundido de 1,2 s y barra de progreso en
  los puntos. El recorte se gobierna con el `focus` de cada diapositiva y la
  legibilidad, con velo diagonal (horizontal) o de abajo arriba (vertical).
  Se para con el puntero, el foco, la pestaña oculta y `prefers-reduced-motion`.
- Verificado a 375, 1280 y 1440 px sin scroll horizontal; `npm run check` y
  `npm run build` en verde.

### Iteración 11 — el mega-menú, en dos zonas

- **Panel de grupo repartido en dos zonas**: enlaces a la izquierda en una
  columna de 22 rem, contenido destacado a la derecha. Medido a 1512 px, el
  panel de Medios baja de **390 px a 235** y los **568 px muertos** que dejaba
  la fila de enlaces (`auto-fill` reserva las columnas vacías; `auto-fit` no)
  pasan a ser contenido.
- **Los tres grupos tienen destacado**, porque uno sin él vuelve a dejar el
  hueco: Medios enseña las miniaturas de los álbumes, Programa «lo próximo»
  más la semana entera —rotada para empezar por hoy— y La iglesia una tarjeta
  de invitación con el culto, la dirección y cómo llegar.
- **El panel cierra al retirar el ratón** (220 ms de gracia). Antes sólo se
  cerraba con `Escape`, pulsando fuera o navegando: pasar el cursor por encima
  de un grupo camino de otro sitio dejaba 390 px tapando media pantalla.
- **La barra mide exactamente su token**: el filete inferior pasa de `border`
  a `box-shadow` y el alto real vuelve a ser los 59,5 px que dice
  `--nav-height`, que es lo que resta la portada.
- **Sin texto cortado en el panel**: nombres de álbum, títulos de evento y de
  la semana pasan a dos líneas con altura mínima de dos líneas, así se leen
  enteros y las fichas siguen midiendo lo mismo.
- Corregido `var(--sp-7)`, que **no existe** en la escala: invalidaba el
  `clamp` entero y dejaba la separación en 0 (también en la ficha de
  liderazgo, donde nunca se reservó el hueco del botón de cerrar).
- Verificado a 390, 1100, 1280, 1512 y 1920 px: márgenes alineados con la
  cabecera, sin scroll horizontal, sin texto cortado y sin errores de consola.
  `npm run check` y `npm run build` en verde (547,87 kB iniciales).

## Pendiente — prioridad alta

1. **Sin tests.** Vitest (`@angular/build:unit-test`) está configurado pero no hay ni un `.spec.ts`.
   Candidatos de mayor valor (lógica pura, fácil de cubrir):
   - `ScheduleService`: filtrado de pasados, orden por día y hora, `hasUpcomingEvents`.
   - `PresentationBlocksService`: resolución `override ?? auto`, fallback a un
     bloque, persistencia.
   - `CarouselService`: recorte de índice al cambiar el conjunto de bloques.
   - `UiStore`: transiciones de drawer/grupo.
2. **Contenido real pendiente** en `church.config.ts`: `foundedYear: 2000` sigue
   sin confirmar. El organigrama ya está completo en `leadership.config.ts`.
3. **`stage.component.scss` sigue con ~1.750 líneas.** La proyección y el
   responsive ya viven en parciales-mixin; falta partir los bloques
   (`styles/_socials.scss`, `_streams.scss`, …) con el mismo patrón.
   Movimiento mecánico pero de riesgo visual: hacerlo con la proyección delante.

## Pendiente — prioridad media

4. **`angularx-qrcode` arrastra `qrcode` (CommonJS)** y provoca un bailout de
   optimización. Ya está aislado en un chunk `@defer`; evaluar alternativa ESM.
5. **`npm test` no tiene CI**: añadir un job de build+test a los workflows.
6. **SEO estructurado**: `sitemap.xml`, `robots.txt` y JSON-LD (`Church`,
   `Event`) ahora que hay varias rutas indexables.
7. **Imágenes responsive**: la galería y el hero sirven una sola resolución.
   `ngSrcset` + `sizes` reduciría bastante en móvil.

## Pendiente — prioridad baja

8. Rotación manual de la clave de YouTube (hoy restringida por referrer).
9. Analítica sin cookies (ej. Plausible autoalojado) para saber qué se usa.
10. Tests e2e de humo (Playwright) sobre las rutas y el modo presentación.

## Ideas de producto

Ordenadas por relación valor/esfuerzo:

| Idea                                    | Valor | Esfuerzo | Notas                                        |
| --------------------------------------- | ----- | -------- | -------------------------------------------- |
| Biblioteca de predicaciones con buscador| Alto  | Medio    | Reutiliza `YouTubeService`; filtrar por fecha/predicador |
| Peticiones de oración                   | Alto  | Bajo     | `mailto:` o formulario sin backend (Formspree) |
| Calendario mensual completo             | Alto  | Medio    | Ya existe `CalendarService` para el `.ics`   |
| Página de contacto con formulario       | Medio | Bajo     | Hoy sólo hay ubicación                       |
| Donativos / ofrendas                    | Medio | Bajo     | Datos bancarios + Bizum, sin pasarela        |
| Grupos pequeños / células               | Medio | Medio    | Mapa por barrios                             |
| Bautismo y membresía (pasos a seguir)   | Medio | Bajo     | Contenido estático, mucho valor pastoral     |
| Noticias / blog                         | Medio | Alto     | Requiere flujo de edición sin desplegar      |
| Testimonios                             | Medio | Bajo     | Texto + foto en `church.config.ts`           |
| Recursos descargables                   | Bajo  | Bajo     | PDFs en `assets/`                            |
| Escuela dominical (material por edades) | Bajo  | Medio    |                                              |
| Misiones (proyectos apoyados)           | Bajo  | Bajo     |                                              |
| Área privada de miembros                | Bajo  | Alto     | Rompe el «sin backend»: valorar bien         |

Mejoras sobre lo existente:

- Anuncios editables **sin desplegar** (JSON en la rama de datos, igual que
  `youtube.json`): el modelo `Announcement` ya existe; faltaría cargarlo desde
  un JSON externo en vez de `church.config.ts`.
- Avance de los anuncios vigentes en la portada (`home`), enlazando a
  `/anunturi`.
- Programación horaria de bloques (ej. «Próximos eventos» sólo los domingos).
- Contador en vivo para el evento más cercano cuando falta menos de 24 h.
- Buscador global (rutas + eventos + predicaciones) con `MatAutocomplete`.
- Migas de pan en las páginas interiores.
