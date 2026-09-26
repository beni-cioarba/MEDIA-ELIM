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

### Iteración 12 — emisiones en portada y la confesión de fe como documento

**Portada**
- **Franja «en directo»** pegada al hero, por delante de los avisos y sólo
  mientras se emite. `YouTubeService` ya comprobaba el directo cada dos
  minutos contra `liveStreamingDetails`; ahora eso se ve en la portada.
- **Tira de últimas emisiones** detrás del carrusel, formando pareja con él:
  uno enseña lo que viene y la otra lo que ya se emitió.
- El título de YouTube se **parte en tres** —tipo, tema y fecha
  (`core/youtube-title.ts`)— en vez de pintarse en crudo. Verificado contra
  los cinco títulos reales del canal, con vuelta atrás si no sigue el patrón.
- `YouTubeService.start()` pasa a ser idempotente: ahora lo llaman la portada
  y el escenario.

**Confesión de fe**
- **Índice lateral con seguimiento del apartado activo**
  (`shared/doc-toc`, reutilizable), medido sobre el «On this page» de
  `angular.dev`: columna fija de 16 rem con scroll propio, dos niveles por
  sangrado y «volver arriba». Por debajo de `xl` se convierte solo en un
  plegable pegado bajo la cabecera.
- El activo **se calcula por posición**, no por intersección: en la propia
  referencia el índice se queda sin activo dentro de un apartado largo.
- Pulsar una entrada **abre el artículo**, lo deja a 85 px del borde y lo hace
  destellar un segundo.
- **Buscador** sobre los 30 artículos, insensible a mayúsculas y diacríticos,
  que filtra también el índice y abre las coincidencias. Atajo `/`.
- **Abrir / cerrar todo**, recuento de resultados en vivo, enlace permanente
  por artículo y estilos de impresión que fuerzan el documento entero.
- 30 rótulos cortos nuevos por idioma: el `title` de cada artículo es la
  afirmación completa (80 caracteres) y en un índice no se puede leer.
- Se quitó el sumario en tarjetas: lo sustituye el índice, y ocupaba una
  pantalla entera antes del primer artículo.
- Corregido el margen de la página: caía en x=76 mientras el resto de la app
  cae en x=45 (la trampa del `container` de la decisión 28).

**Verificación**
- Índice: 8 de 8 apartados marcados correctamente al recorrer el documento,
  sin quedarse nunca sin activo. Los cuatro tipos de destino aterrizan a 85 px.
- Buscador: «sfintirea» → 2, «duhul sfant» → 8, «botez» → 5 (ro);
  «salvacion» → 4, «Maria» → 1 (es). Abrir/cerrar todo: 30 ↔ 0.
- Anchos 390, 1100 y 1512 px sin scroll horizontal ni texto cortado.
- `npm run check` y `npm run build` en verde (548,76 kB iniciales).

### Iteración 13 — segunda pasada a la confesión de fe

**Fallo grave corregido: los enlaces de sólo fragmento**
- `history.replaceState(null, '', '#id')` y `<a href="#id">` se resuelven
  contra el `<base href="/">` del documento, **no** contra `location.href`.
  La ruta se borraba (`/marturisirea-de-credinta` → `/`) y la ruta comodín
  `{ path: '**', redirectTo: '' }` acababa mandando al usuario a la portada
  un par de segundos después de pulsar el índice. Los dos llevan ya la ruta
  delante. Detalle en la decisión 42 de `47-design-language.md`.
- **Los enlaces directos no abrían nada**: entrar en
  `…/marturisirea-de-credinta#art-botez` dejaba el artículo **cerrado** y el
  índice marcando el primer capítulo, así que el enlace permanente no servía
  para nada. Ahora se atiende al cargar y en cada `hashchange`, con la misma
  ruta que usa el índice (`DocTocComponent.irA`).

**Diseño**
- **Cabecera alineada con el documento**: el título salía centrado en x=771
  sobre un texto que empieza en x=46. Y baja de 319 px a 253, con lo que el
  primer artículo sube de y=697 a y=603.
- **Barra de herramientas en una línea**: de 88 px a 61. El buscador se topa
  en 26 rem (se estiraba a 786 px) y el recuento pasa a ir pegado a él, no
  detrás del botón.
- **El galón de plegado pasa a ser un control**: de 11×23 px al 46 % de opacidad
  a una caja de 1,75 rem que se rellena al apuntar la fila.
- **El artículo abierto se marca** con filete dorado y superficie tenue: con
  «abrir todo», treinta artículos seguidos se leían como un solo bloque.
- **El índice pierde la barra de scroll** (10 px de una columna de 16 rem) y
  gana un difuminado al final, que se apaga solo cuando no sobra lista.
- **Cifras alineadas a la derecha** en el índice y en el documento.
- Quitada la aspa nativa del `type="search"`, que se duplicaba con la de la app.

**Mejora**
- El enlace permanente **copia la dirección completa** y lo confirma en el
  sitio, sin dejar de ser un `<a href>` (menú contextual y sin-JS intactos).

**Verificación**
- URL correcta tras pulsar el índice, el enlace permanente y «volver arriba»;
  la página ya no se va sola a la portada.
- Seguimiento 7/7 sin quedarse sin activo. Abrir/cerrar todo 30 ↔ 0, los 30
  con su filete. Buscador: `botez` 5, `sfintirea` 2, `duhul sfant` 8.
- 390, 1100 y 1543 px sin scroll horizontal ni texto cortado.
- `npm run check` y `npm run build` en verde.

### Iteración 14 — auditoría de la portada

**Accesibilidad (fallo de fondo)**
- **El oro de marca no pasaba AA como texto en ningún sitio**: los siete usos
  daban 3,82–4,03:1 sobre un mínimo de 4,5. Nuevo escalón `gold(750)`
  (#856618), al que apunta `--c-gold-deep`; pasa sobre los cuatro fondos
  reales y el único uso como fondo mejora de 4,03 a 5,37.
- Eliminadas las **ocho copias a mano** de `#9c7a1e`: la portada lee el token
  y las hojas autocontenidas (marca y proyección) llevan el valor nuevo. Eran
  la razón de que corregir el token sólo arreglara tres de los siete.
- Verificado: **0 fallos de contraste** en los diez textos de referencia.

**Estructura**
- **El carrusel ya tiene título** («Ce urmează»). Era el bloque más grande de
  la portada —512 px— y llegaba sólo con `aria-label`, mientras la tira de
  transmisiones, más pequeña, sí lo tenía. La página pasa de 5 a 7
  encabezados por 18 px.
- **El cierre deja de ser una dirección suelta**: título, próximo culto,
  dirección y las dos acciones. Era la última impresión de la portada.
- **La confesión de fe se enlaza desde la portada**: sólo se llegaba por el
  menú.

**Comprobado que NO eran problemas** (medidos antes de tocar): ninguna de las
22 imágenes provoca saltos de maquetación —todas reservan hueco por CSS—, y
la jerarquía de encabezados no tiene saltos de nivel.

**Verificación**
- 390, 1100 y 1512 px sin desbordes; marca, título del carrusel, primera
  tarjeta y título de transmisiones **en la misma vertical** en los tres.
- `npm run check` y `npm run build` en verde (548,76 kB).

### Iteración 15 — el índice y el documento, contra la referencia

- **Carril continuo**: pasa del enlace a la lista (`border-left` en el `<ul>`),
  como en `angular.dev`. Antes eran 34 segmentos sueltos. Los enlaces pierden
  borde y radio.
- **El activo deja de ser una pastilla dorada**: se enciende el tramo de
  carril y el rótulo pasa a tinta fuerte.
- **Título del índice en caja baja** (15 px / 700) en vez de versalitas de
  11,7 px con tracking.
- **Hueco muerto de 221 px** entre texto e índice, por acotar la columna en
  vez de la prosa. Ahora la columna llena su pista (68 px de hueco, el de la
  rejilla) y se topan el párrafo (44 rem) y el enunciado (46 rem).
- **El galón de plegado**: fuera el disco gris, icono SVG de la app al extremo
  de la fila. Referencias y enlace permanente comparten renglón.
- **Cabecera de capítulo**: el numeral sale del antetítulo y se convierte en
  el ancla del capítulo (cuadro de 2,75 rem); el aire entre capítulos sube de
  54 a 72 px.
- Panel principal auditado: los cuatro textos sobre el navy pasan AA
  (7,3 a 11,6). Sin cambios.

**Verificación**: enlace directo abre y marca; seguimiento 7/7; buscador
`botez` 5 / `sfintirea` 2; abrir-cerrar todo 30 ↔ 0 con los 30 marcados; 390
y 1512 px sin desbordes ni texto cortado; `npm run check` y `npm run build` en
verde.

### Iteración 16 — controles de documento en el dock (teléfono)

- **Los controles de la confesión de fe se meten en el dock flotante**: un
  botón que sube el módulo completo (buscador + desplegar todo + índice). En
  reposo no ocupa **ni un píxel**; antes la barra de herramientas se iba con
  el scroll y había que subir 2.000 px para buscar.
- Nuevo `DockActionsService`: una página registra acciones y el dock las pinta,
  sin que el dock sepa de ninguna página. Hace falta un servicio porque el
  dock vive en el layout y no es padre de la página enrutada.
- El índice compacto pasa de pegarse arriba a **hoja inferior que se abre
  hacia arriba** (`column-reverse`), con el resumen siempre mostrando en qué
  artículo estás.
- El dock se aparta lo justo para librar el módulo, y sólo mientras está
  abierto (`body.has-doc-panel` → `--dock-offset`).
- Corregido: la regla que ocultaba el botón en escritorio estaba antes que la
  base y empataba en especificidad, así que no se aplicaba.
- **Carrusel de portada reordenado**: abre el concierto de niños y cierra la
  velada de villancicos.

**Verificación**: en reposo barra y hoja ocultas y el botón en el dock; al
abrir, las dos apiladas sin solape y el dock librándolas; buscar desde el panel
filtra documento e índice; elegir una entrada cierra el panel y abre el
artículo; `Escape` cierra; el botón no existe por encima de 720 px; sin
desbordes a 390 ni 1512.

### Iteración 17 — un solo corte, y el teclado

- **Los controles del dock aparecen justo cuando desaparece la columna
  lateral** (1280), no a 720. Antes había una franja intermedia con un tercer
  diseño —un desplegable bajo la cabecera— que además se pintaba roto, porque
  al reestructurar el bloque sus estilos cayeron dentro del `@media`
  equivocado: salía con el marcador nativo del `<details>` y el rótulo pegado
  al apartado.
- **El panel era inalcanzable con teclado**: el botón que lo abre era el
  elemento 110 en orden de tabulación y sus controles el 11 y el 75. El índice
  pasa antes del documento en el marcado (con `grid-column` para no cambiar lo
  que se ve) y al abrir el foco entra en el panel; `Escape` lo devuelve al
  botón.
- **El documento se ensanchaba al estrechar la ventana**: 1.071 px a 1512 con
  columna contra 1.207 a 1.279 sin ella. Tope de 1.120 px, en píxeles porque
  la raíz es fluida.
- Corregido un `requestAnimationFrame` más que no corre con la pestaña en
  segundo plano (el del foco al abrir el panel).

**Verificación**: 390 / 1189 / 1269 / 1320 / 1512 sin desbordes; el botón del
dock y la columna lateral se relevan exactamente en 1280; contraste del módulo
inferior entre 11,99 y 12,14; al abrir, el foco cae en el índice y el
siguiente Tab entra en la lista; `Escape` cierra y limpia la clase del `body`.

### Iteración 18 — «Quiénes somos»

- **La página recupera su cabecera**: antetítulo, título y entradilla estaban
  escritos y traducidos pero con **cero usos**; el `h1` iba oculto. Se añade
  además la línea de datos (años, cultos, departamentos), que en esta página
  es donde pertenece.
- **La foto deja de leer `heroSlides[0]`**: al reordenar el carrusel de
  portada, esta página cambiaba de imagen sola. Ahora es `config.aboutImage`.
- **Fuera el pie de foto**, que repetía el `alt` palabra por palabra; el `alt`
  pasa a describir la escena.
- **«Tu primera visita» se convierte en un recorrido numerado**: son cuatro
  cosas que pasan en orden y se pintaban como cuatro tarjetas idénticas a la
  rejilla de pilares de la misma página. Se eliminan cuatro iconos declarados
  y nunca pintados.
- **Copia reescrita** en los dos idiomas (8 textos): la de la primera visita
  pasa de describir el culto a responder lo que de verdad frena a alguien
  —ropa, si hay que hacer algo, los niños—; se quita el relleno de
  «en todo lo que hacemos» y la repetición del número de artículos.
- **Cuándo y dónde** al final de esa sección: explicaba qué esperar de una
  visita y no daba ni la hora ni la calle.
- Corregida la alineación: la cabecera caía en x=45 y las secciones en 161.

**Segunda pasada**
- **Las dos rejillas de cuatro caían en 3+1** por debajo de ~1.150 px, con la
  cuarta tarjeta sola en su fila y más baja que las otras. `auto-fit` no vale
  para una cantidad fija: cortes explícitos 4 → 2×2 → 1.
- **Copia de los pilares acortada** (de 77-104 a 60-86 caracteres): a cuatro
  en fila el cuerpo queda en ~33 caracteres por línea y una frase larga se
  partía en cuatro renglones.

**Verificación**: los siete bloques de la página en la misma vertical (161);
390 / 956 / 1024 / 1512 px sin desbordes ni texto cortado, con las dos
rejillas siempre en filas llenas y todas las tarjetas a la misma altura; los
dos idiomas completos; sin clases huérfanas; `npm run check` y `npm run build`
en verde.

**Pendiente detectado (no tocado)**: el programa semanal guarda `dayLabel` y
`title` en rumano fijo, así que en la interfaz en español se lee «Vineri ·
20:30 · Seară de tineret». Pasa en toda la app (portada incluida) y es una
decisión de contenido —si los cultos se nombran en rumano a propósito o no—,
no un fallo de código.

### Iteración 19 — «Quiénes somos», anclado a la confesión

- **Los cuatro pilares citan su artículo**: Misión → 16 (La Iglesia),
  Visión → 11 (La santificación), Comunidad → 13 (Los dones), Servicio →
  29 (El amor). Cada tarjeta resume lo que dice ese artículo y enlaza a él;
  el número se resuelve desde `credo.data.ts`, no se escribe a mano.
- **Textos reescritos** en los dos idiomas con el vocabulario de la confesión
  («para el bien común de la Iglesia, no para provecho propio», «cuerpo, alma
  y espíritu», «sin distinción alguna»), en vez de frases que valdrían para
  cualquier congregación.
- **Nota de la Cena del Señor** (art. 19) al pie del recorrido de la primera
  visita: cada cuánto se comparte y quién participa. Es lo que más descoloca
  a un visitante y no estaba en ninguna página.
- El subtítulo del recorrido nombra el domingo como día de adoración (art. 25).

**Verificación**: los cuatro enlaces abren su artículo con el índice marcándolo
(probado con el art. 13); las cuatro referencias al pie de sus tarjetas a la
misma altura; 390 / 956 / 1512 px sin desbordes ni texto cortado; 535 claves en
ambos idiomas; sin clases huérfanas; `npm run check` y `npm run build` en verde.

### Iteración 20 — las cinco obras, el texto anclado y la cuota del directo

- **Las cinco obras de la confesión** sustituyen a los cuatro pilares de la
  iteración 19: los pilares los habíamos redactado nosotros y luego buscado un
  artículo que los avalara; el art. 16 ya enumera las obras de la Iglesia, así
  que el bloque es literalmente ésa —adoración, anuncio del Evangelio,
  formación de discípulos, servicio y comunión fraterna— con la referencia de
  cada una (16, 9, 11, 29, 19). Como fila, no como rejilla: cinco tarjetas
  dejan siempre una fila coja.
- **`citarArticulo()` en `credo.data.ts`**: el número y el ancla de un artículo
  en un solo sitio. Antes el prefijo `'art-'` estaba escrito tres veces y el
  número se resolvía a mano en `about`.
- **Cuatro textos más anclados a la confesión**: `home.welcome.body` (las cinco
  obras, art. 16), `home.ministries.subtitle` (art. 13), `donate.lead`
  (art. 25: el diezmo y las ofrendas voluntarias como disciplina) y la
  estructura de `conducere` (art. 17), con una nota de fundamento sobre el
  sacerdocio universal al pie del organigrama.
- **Barrido de claves huérfanas**: 23 claves que no pintaba nadie, entre ellas
  el bloque `home.today.*` completo y el `leadership.lead` que acabábamos de
  reescribir sin darnos cuenta de que era invisible. Criterio y lista en
  `20-content-i18n.md`.
- **Anuncio nuevo** (semana de oración por la slujire prin cântare) con un
  campo `verse` propio en el modelo: un versículo es una cita, no un aviso, así
  que no va en la caja dorada de `footnote`.
- **Detección de directo por ventana de culto**: la llamada con cuota la hace
  sólo la pantalla que proyecta y sólo de 15 min antes a 2 h después de cada
  comienzo del programa **real** (los sábados con evento suben el ritmo solos),
  con techo diario en `localStorage` que falla cerrado.

**Verificación**: ventana de culto probada con 12 casos (domingo 09:46 y 11:30
sí, 12:05 no; sábado sólo con evento; jueves 20:20 sí; 03:00 no). Cuota medida:
antes un domingo con 20 visitantes en transmisiones = 30.240 unidades (302 % de
la cuota); ahora un domingo son 540 (5,4 %) y una semana entera proyectando,
1.890 (18,9 %). Las cinco obras con sus números y enlaces correctos a 1512 y a
375 px (donde la fila pasa a dos columnas); el anuncio proyecta sin recorte a
1920×1080 y a 1280×720 (autoajuste 0,841, en el presupuesto de legibilidad);
517 claves en ambos idiomas y ninguna clave sin traducir en las 11 rutas;
`npm run check` y `npm run build` en verde.

### Iteración 21 — modo presentación: encaje, y elegir qué se proyecta

- **La casilla de «hoy» ya no se sale**: a tamaño de cifra (11u) «ESTE AZI»
  medía 298 px en una columna de 216 y se pintaba encima del borde de la
  tarjeta. Pasa a `lead` (5,6u), como ya hacía la web.
- **Eventos: uno por diapositiva con QR, dos sin él.** Con el QR el texto
  pierde un 30 % de ancho y dos tarjetas se pasaban 154 px de la caja: la
  segunda salía cortada a media frase. Con una sola, el resumen se lee entero
  y la tarjeta se centra.
- **Las insignias «ESTE AZI» / «URMĂTORUL» no se proyectan**: la cuenta atrás
  ya lo dice y partían la línea de la fecha en dos.
- **Selección por evento** en el panel y en los ajustes de pantalla, igual que
  los anuncios: una fila por evento (no por página), con su casilla, salto a
  su diapositiva y resumen «se proyectan n de N». Ocultarlos todos quita el
  bloque del carrusel en vez de mostrar «no hay eventos».
- **Referencia del versículo al mínimo legible**: estaba en 2,4u (26 px) y
  todas las demás etiquetas pequeñas de la tarjeta usan 3,2u.
- **Fuera de la web** la frase sobre la vestimenta en «Prima ta vizită», y la
  foto de «Cine suntem» pasa a ser la primera del carrusel (concierto de los
  niños) en lugar de la del coro.

**Verificación**: bloque de eventos sin recorte a 1920×1080 y 1280×720, con y
sin QR (márgenes 27–314 px); barrido de todos los bloques proyectados sin un
solo recorte accidental y con el texto más pequeño en 34,56 px = 3,2u exactos;
los cuatro anuncios encajan (0,70–1,0 con QR); ocultar un evento lo quita de
la proyección y repagina; ocultarlos todos retira el bloque; 518 claves en
ambos idiomas; `npm run check` y `npm run build` en verde.

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
