# 40 · Estilos del escenario

> Los **tokens, el tema de Material y las reglas del design system** están en
> `45-design-system.md`. Este shard cubre sólo el CSS del escenario
> proyectable (`features/stage`).

## Ficheros

| Fichero                                       | Alcance                                     |
| --------------------------------------------- | ------------------------------------------- |
| `src/styles.scss`                             | Orquesta el design system global            |
| `src/styles/*`                                | Design system (ver `45-design-system.md`)   |
| `features/stage/styles/_tokens.scss`          | Variables propias del escenario             |
| `features/stage/styles/_responsive.scss`      | Media queries de la **web pública** (mixin `stage-responsive`) |
| `features/stage/styles/_projection.scss`      | **Proyección**: unidad `--pj-u`, escala y overrides de todos los bloques (mixin `stage-projection`) — ver `30-presentation.md` |
| `features/stage/stage.component.scss` (~1.750)| Hoja del escenario **y de todos los bloques** en la web pública |
| Cada componente de `shared/` y `layout/`      | `styles: [...]` inline, encapsulado         |

### Orden del cascade (no lo cambies)

`_responsive.scss` y `_projection.scss` exponen **mixins** que
`stage.component.scss` incluye **al final**:

```scss
@include responsive.stage-responsive;
@include projection.stage-projection;
```

Motivo: Sass emite el CSS de un módulo `@use` *antes* del fichero que lo usa,
y a igual especificidad gana la regla que va después. Con `@use` suelto la
mayoría de media queries y todos los overrides de proyección quedaban
pisados por las reglas base (así estaba hasta la reforma de la proyección).

## Decisión clave: `ViewEncapsulation.None` en `StageComponent`

`stage.component.scss` contiene reglas transversales que cruzan fronteras de
componente:

- overrides de proyección: `.stage.is-fullscreen .card__handle { … }` (en `_projection.scss`)
- responsive: `@media (max-width: 768px) { .streams__list { … } }`

Con encapsulación emulada esas reglas no alcanzarían el DOM de
`features/stage/blocks/*`. Por eso `StageComponent` declara
`encapsulation: ViewEncapsulation.None` y su hoja actúa como stylesheet del
escenario completo.

Consecuencias que **debes respetar**:

- Toda clase nueva en el escenario o en un bloque usa prefijo BEM propio
  (`.upcoming__item`, `.gallery__tile`…). Nada de `.title`, `.item`, `.grid`.
- Los componentes de `shared/` **sí** conservan encapsulación: sus estilos van
  en `styles: [...]` y pueden usar nombres cortos sin riesgo.
- Los componentes de bloque no llevan estilos propios salvo
  `:host { display: contents; }`, que los hace transparentes al layout del
  `.slide` padre (flex/grid). Si añades estilos a un bloque, ten en cuenta que
  quedarán encapsulados y no recibirán los overrides de `.stage.is-fullscreen`.

## Mapa de secciones de `stage.component.scss`

Aproximado, para no leer el fichero entero:

| Zona                              | Selectores principales                                   |
| --------------------------------- | -------------------------------------------------------- |
| Layout                            | `app-home`, `.stage`, `.backdrop`, `.halo`, `.grain`      |
| Cabecera y contenido              | `.brand`, `.content`, `.content--carousel`                |
| Carrusel                          | `.carousel`, `.slide`, `.stage__hover-zone`, `.stage__controls`, `.carousel__dot*`, `.carousel__nav`, `.carousel__pause` |
| Bloque redes (sólo proyección)    | `.socials*`, `.card*` (`__network`, `__handle`). La web usa `.nets*` en la hoja del componente |
| Bloque transmisiones              | `.broadcasts*`, `.streams*`, `.live-now*`                 |
| Bloque galería                    | `.gallery*`                                               |
| Bloque semanal                    | `.weekly*`                                                |
| Bloque próximos eventos           | `.upcoming*` (cabecera + proyección). La web usa `.ev*` en la hoja del componente |
| QR y pie                          | `.qr*`, `.bar*`                                           |
| Ubicación                         | `.location*`                                              |
| Cierre                            | `@include` de responsive y proyección (al final)          |

Los **overrides de proyección** (`.stage.is-fullscreen { … }`) ya no viven en
este fichero: están en `styles/_projection.scss`, con su propia escala. Si
añades texto proyectable, dale tamaño allí con `--pj-fs-*`.

**Excepción documentada**: la tarjeta de anuncio
(`features/announcements/announcement-card/announcement-card.component.scss`)
es global (`ViewEncapsulation.None`, BEM `.announcement__*`) y lleva sus
propios overrides `.stage.is-fullscreen .announcement…` en **su** hoja, porque
se reutiliza fuera del escenario (página `/anunturi`) y porque la hoja del
escenario está al límite de su presupuesto. Sus medidas de proyección se
multiplican por `--fit` (autoajuste). Aplica el mismo criterio a cualquier
otra tarjeta que viva en la web y en la proyección a la vez.

Las tarjetas de redes son **neutras** (superficie blanca, icono navy): el
campo `gradient` de `SocialLink` sólo lo consume ya el pie de la web pública.

**Redes en la web pública** (`socials-block.component.scss`, marcado propio
`.nets` / `.net__*`; la proyección conserva `.socials` / `.card`):

- Una fila de fichas desde 72 rem de contenedor (`@container nets`), 2 desde
  34 rem, 1 por debajo. Las columnas de la fila ancha las calcula el
  componente (`--nets-cols`): todas hasta 4; con más, sin huérfanas (6 → 3+3).
- Ficha: icono | red en versalitas / **@handle** (protagonista, `6.2cqi` con
  tope 19 px, la ficha es contenedor) / descripción a 2 líneas. Copiar y ↗
  arriba a la derecha; el enlace se estira sobre la ficha (`::after`) y el
  botón de copiar queda encima. Foco con `:has(:focus-visible)` en la ficha.
- QR por red sólo en escritorio con ratón (`(hover: hover) and (pointer: fine)
  and (min-width: 64rem)`), cargado con `@defer (on viewport)`, con la URL en
  monoespaciada debajo de «Escanea con el móvil».
- Hover: borde degradado navy → oro (dos fondos `padding-box`/`border-box`) y
  −2 px; nada se mueve con `prefers-reduced-motion`. Sin resaltado rotatorio.
- Medido a 1.483 px: antes 2 × 2 tarjetas de 686 × 104 px (220 px de alto);
  ahora 4 × 339 × 213 px con QR incluido. El relleno vertical del escenario
  en la web bajó de `4vw` (59 px) a `clamp(1.25rem, 2vw, 2rem)`.

## Responsive — 100 %, siempre

**Invariante**: toda pantalla de la app (web pública, panel de control y
proyección) funciona de **320 px a 4K sin scroll horizontal, sin solapes y sin
textos recortados**, y sin que el operador tenga que hacer zoom. No es una fase
final: cada componente nuevo nace responsive y se verifica antes de darse por
hecho.

Cómo se consigue (en este orden de preferencia):

1. **Fluido antes que breakpoint**: `clamp()`, `minmax()`, `auto-fit`,
   `flex-wrap`, `aspect-ratio`. Un breakpoint sólo cuando cambia la
   *disposición*, no para ajustar píxeles.
2. **Nada tiene ancho mínimo implícito**: `white-space: nowrap` sólo con
   `overflow: hidden; text-overflow: ellipsis` o dentro de algo que envuelve;
   `min-width: 0` sólo en el hijo que debe encoger (el que lleva el ellipsis),
   nunca en la caja de un rótulo que no puede desaparecer.
3. **Las barras envuelven, no aplastan**: `flex-wrap: wrap` y el grupo de
   acciones baja a otra fila (`flex: 1 1 100%` en estrecho) antes que pintar
   encima del título. Ejemplo: `.topbar` del panel de control.
4. **Degradación en pasos** (criterio 6 del diseño): N columnas → N-1 → 1; lo
   largo ocupa la fila entera antes que estrecharse.
5. **Los cortes son los del sistema** (`_tokens.scss` → `$breakpoints`: xs 480 ·
   sm 720 · md 860 · lg 1024 · xl 1280 · stage 1600) con `@include until()` /
   `from()`. Ningún número suelto.
6. **La proyección escala con `--pj-u`** (1/100 del lienzo 16:9) y no necesita
   cortes; lo que debe caber, cabe por proporción o se autoajusta
   (`appFitToBox`) — nunca se recorta.

**Verificación obligatoria** antes de dar por terminado un cambio de UI:
`scripts/responsive-audit.snippet.js` pegado en la consola (o ejecutado por la
IA con su navegador) en **320 · 375 · 768 · 1024 · 1280** en cada ruta tocada;
debe devolver `ok` (sin `hScroll`, `overflowing`, `overlaps` ni `nowrap`). Los
únicos falsos positivos admitidos son `.u-sr-only` y `.footer__version`.

Estado auditado (sep. 2026): las 11 rutas pasan en los cinco anchos.

| Rango                              | Objetivo                              |
| ---------------------------------- | ------------------------------------- |
| ≤ 1024px                           | Tablet: una columna                   |
| ≤ 1024px **y vertical**            | Proyección en un dispositivo en vertical: el QR se oculta. Un proyector XGA (1024×768) es apaisado y conserva las dos columnas |
| ≤ 768px                            | Móvil grande                          |
| ≤ 480px                            | Móvil pequeño                         |
| `prefers-reduced-motion: reduce`   | Sin animaciones ni transiciones       |

## Encuadre de las fotos (hero)

Todas las fotos de `assets/drive-media/` salen del script de optimización a
**1600×1067 px, es decir 3:2**. La portada a pantalla completa es más apaisada
que eso, así que **siempre sobra alto y hay que recortar**. La pregunta no es
si se recorta: es *qué* se recorta.

Decisión (sep. 2026, revisada): **portada a sangre y a pantalla completa**,
con el recorte gobernado.

- **Alto**: desde 860 px, `calc(100svh − var(--nav-height))` —la cabecera es
  `sticky`, así que ocupa sitio en el flujo y la resta es exacta—. Por debajo,
  `max(26rem, 66svh)`: en un teléfono una portada de pantalla completa esconde
  la web entera, y hay que dejar asomar lo que viene.
- **Qué se recorta**: cada diapositiva declara su `focus` (`ImageFocus`,
  `upper` por defecto), que `hero-carousel.component.ts` traduce a
  `object-position`. Con `upper` el recorte se lleva el suelo y deja las
  cabezas. En vertical el recorte pasa a ser lateral y se centra, que es lo
  correcto para una foto de grupo.
- **Legibilidad**: velo diagonal (100°) en horizontal —oscurece el lado del
  texto y deja ver la foto en el otro— y de abajo arriba en vertical, donde
  además el texto se ancla al pie en lugar de centrarse: centrado caía en la
  franja media de la foto, la más clara y la más llena de detalle.
- **Movimiento**: *Ken Burns* de 6 s con el sentido alternado por
  diapositiva, fundido cruzado de 1,2 s y barra de progreso en cada punto al
  ritmo real del carrusel. Todo se pausa con el puntero encima, con el foco
  dentro, con la pestaña oculta (WCAG 2.2.2) y con `prefers-reduced-motion`.
  Elegir un punto reinicia el intervalo, para que la barra no mienta.
- **Mandos** (oct. 2026): pie único alineado con el titular —pista de
  segmentos (vistos a medio tono, activo en oro) y debajo pausa, anterior,
  siguiente, contador `03 / 09` y rótulo como texto, no pastilla—. La pausa
  es explícita (WCAG 2.2.2: en el teléfono no hay «puntero encima») y se
  oculta con `prefers-reduced-motion`, donde no hay auto-avance. Flechas del
  teclado con el foco dentro y deslizar con el dedo (`touch-action: pan-y`).
  Por debajo de 560 px anterior/siguiente se ocultan y su sitio es del rótulo.
- **Contenido de portada** (`home.component.*`): chip de estado enlazado al
  programa con tres estados (`heroNext`): en marcha (verde que late, hasta
  2 h desde el inicio), hoy (verde + «en 1 h 45 min») y otro día (oro); si el
  culto de hoy ya terminó, anuncia el siguiente. Titular
  compacto (ver abajo) con `text-wrap: balance`. Acción
  principal en **oro** (el navy desaparecía sobre el velo navy); si hay
  directo, la secundaria lleva a la emisión con punto rojo. Entrada
  escalonada de 0,7 s sólo al cargar.
- **Compacta** (oct. 2026, segunda pasada): la foto es la protagonista. El
  texto se ancla **abajo a la izquierda en todas las anchuras** (ya no se
  centra en escritorio) y ocupa ~13 % de la portada (antes ~21 %): titular
  `clamp(2rem, 1.45rem + 2vw, 3.25rem)`, subtítulo ~17 px, botones de 40 px,
  chip de 27 px y mandos de 32 px con pista de 2 px. El velo lateral plano
  (hasta 92 % de navy) pasa a ser una **elipse desde la esquina inferior
  izquierda** (≥ 55 % bajo el subtítulo, AA sobre una pared blanca) y el
  resto de la foto queda limpio; las sombras de texto amplias sostienen el
  contraste. Chip, botón secundario y mandos son cristal translúcido.
- **Dock flotante sobre la portada** (`floating-actions`): mientras la foto de
  un `app-hero-carousel` queda detrás (se mide la posición, no la ruta), pasa
  a cristal oscuro casi transparente (`dock--on-photo`) con iconos claros;
  al bajar vuelve al cristal claro. Botones de 38 px sin relleno propio.
- **Fluidez del pase** (oct. 2026). Tres fallos medidos: el ratón encima
  pausaba (y al volver con el scroll el puntero suele quedar encima); un clic
  en cualquier mando dejaba el foco dentro y el pase parado hasta hacer clic
  fuera; y había **dos relojes** —un `setInterval` que al reanudar volvía a
  contar 6 s desde cero y la animación CSS de barra y zoom, que seguía donde
  iba—, así que la barra se llenaba, el zoom se congelaba y la foto tardaba
  segundos en cambiar. Ahora:
  1. **Un solo reloj**: el `animationend` de la barra activa cambia de foto.
     Pausar y reanudar es `animation-play-state`, exacto. Ni un temporizador
     ni nada por fotograma. La barra **no se puede ocultar** con
     `display:none`: sin ella no hay avance. Con encapsulación emulada el
     nombre del keyframe lleva prefijo: se compara con `endsWith`.
  2. Pausa sólo por: botón, foco **de teclado** (`:focus-visible`), pestaña
     oculta y portada fuera de pantalla (`IntersectionObserver`; al volver
     sigue donde iba). El ratón ya no pausa.
  3. La foto que sale (`.is-leaving`) conserva su animación congelada durante
     el fundido: antes saltaba a escala 1 en mitad del cruce.
  4. Se montan sólo la foto activa, las vistas y la siguiente: apiladas, las
     nueve estaban «en el viewport» y el `lazy` no frenaba ninguna.
- Ojo con `<ng-content>`: los estilos encapsulados del carrusel **no** alcanzan
  a los nodos proyectados; acota con un envoltorio propio (`.hero__text`), no
  con `.hero__content > *` (así se «descolocó» el titular).

### Peso de la portada (es la imagen LCP de la web)

Tres cosas, por orden de impacto:

1. **Tres anchos y `sizes="100vw"`.** Las fotos existían a 1600 px y a 480, sin
   nada en medio, y el `<img>` sólo tenía `src`: **un teléfono se descargaba la
   imagen de escritorio entera** para pintar 390 px. Se generó la variante de
   960 px (`npm run images`) y ahora un móvil 2× coge 53 kB donde antes cogía
   112.
2. **La precarga también lleva `imagesrcset`.** Es la trampa: un
   `<link rel="preload" as="image">` con un solo `href` **gana siempre** al
   `srcset` de la etiqueta —el recurso ya está descargado y el navegador lo
   reutiliza—, así que el móvil seguía bajando los 1600 px por mucho `srcset`
   que tuviera el `<img>`. Con `imagesrcset`/`imagesizes` la precarga elige el
   mismo ancho que elegiría la etiqueta. Comprobado: una sola descarga, la
   correcta.
3. **El escenario lleva el color medio de la foto activa** (medido con canvas,
   campo `tone` en `church.config.ts`). Mientras la imagen viaja por la red se
   ve su propio tono en vez del navy de marca, que no se parece a nada de lo
   que va a aparecer. Cuesta cero bytes.

### Nitidez de la portada (oct. 2026)

Diagnóstico medido en 1920×1000: el navegador elige la de 1600 px y la
estira a 1948 px CSS (×1,22 a densidad 1; ×1,8 en un portátil a 150 %), y el
*Ken Burns* sumaba otro 12 %. Además varias fotos ya llegaron blandas y muy
comprimidas: nitidez (varianza del laplaciano) 43-45 en `botez_2025` y
`cor_2026` frente a 353 en `concert_copii_2025`, con 0,26-0,47 bits por píxel.
Lo que se arregla en código: zoom 1,00 → 1,05 y variante opcional `large`
(2560 px) en `HeroSlide`, que entra en el `srcset` si existe.
`scripts/optimize-images.js` la genera sólo si el original mide ≥ 2400 px
(calidad 82 la de 1600, 80 la de 2560 y la de 960) y avisa si no. Lo que no se
arregla en código: una foto que ya llegó comprimida; hace falta el fichero
original de la cámara. **Los originales no se borran**: se sacan de
`assets/` (que se publica entero) y se guardan fuera.

Alternativa probada y descartada: **hero partido** (texto sobre navy a la
izquierda, foto entera en un marco 3:2 a la derecha). Evitaba el recorte por
completo, pero la bienvenida pasaba a leerse como una ficha de producto: al
entrar no se veía la iglesia, se veía una tarjeta. El recorte controlado por
`focus` cuesta menos que esa pérdida.

## Galería (`/media/galerie`, bloque `gallery`) — oct. 2026

Auditoría medida a 1280×900 antes del cambio: el destacado era 16:9 a todo el
ancho (1193×671) y las miniaturas empezaban en y = 879, **fuera de la
pantalla**: el selector no se veía. Las fotos son 3:2 y el 16:9 les cortaba
cabeza y pies; la variante `medium` (960) y `tone` no se usaban; rotaba cada
4,5 s sin forma de pararlo (WCAG 2.2.2) y los botones decían `role="tab"` sin
`tablist`. Con 20 eventos la rejilla de miniaturas habría crecido en filas
bajo la foto.

Ahora (`gallery-block.component.*`, sección `.gallery` de
`stage.component.scss`, § 8 de `_projection.scss`):

- **Escenario + carril.** ≥ 1025 px: foto a la izquierda y carril vertical a
  la derecha (`--gallery-rail`, 18–24 rem), con filas `minmax(4.75rem, 1fr)`:
  con pocos eventos llenan el alto, con muchos el carril se desplaza solo (y
  se centra en el activo sin mover la página). Por debajo: foto 16:10 (tablet)
  o 4:3 (móvil) y tira horizontal con scroll-snap (el gesto de pestañas la
  respeta porque desplaza en horizontal).
- **Alto derivado del viewport** en la web: `.gallery__body` =
  `100svh − --nav-height − --gallery-chrome` (migas 2,7 rem + cabecera del
  bloque 3,1 rem + relleno vertical del escenario), entre 26 y 60 rem. A
  1280×900 todo el bloque cabe sin scroll (cuerpo 640 px); a 1920×1080, 786.
  El ancho es la columna común (`--page-inset`), alineada con el logo.
- **Foto entera**: `object-fit: contain` sobre un fondo ambiental hecho con su
  propia miniatura desenfocada (ya en caché por el carril). Nunca corta caras,
  sea cual sea la proporción del hueco. `srcset` 960/1600 y precarga de la
  siguiente.
- **Un solo reloj** (mismo patrón que la portada): `animationend` de la barra
  del evento activo avanza. Pausa: botón, foco de teclado, fuera de pantalla,
  pestaña oculta y, proyectando, si la galería no es la diapositiva visible.
  El ratón no pausa. 6 s en la web, 4,5 s proyectando. Con
  `prefers-reduced-motion`, en la web no hay auto-avance (ni botón de pausa).
- Controles en la cabecera: `02 / 05` · pausa · ‹ ›. Flechas del teclado con
  el foco en la foto; deslizar el dedo sobre ella cambia de evento
  (`data-no-swipe` para que no cambie de pestaña).
- **Segunda pasada (medida a 1536×900)**:
  - El escenario toma el ancho **3:2 de su alto** (`--gallery-ratio`, la
    proporción de todas las fotos; `--gallery-h` es el alto derivado) y el
    carril el resto, entre 18 y 30 rem: 1048×699, sin franjas laterales (antes
    1053×619 con 63 px de ambiente oscuro a cada lado). En móvil y tablet el
    hueco también es 3:2.
  - En `/media/galerie` el escenario usa `--gallery-pad` (16–24 px) en vez de
    4vw: antes había 61 px muertos bajo las migas y la galería acababa 70 px
    antes del borde.
  - Miniaturas 3:2 sin recorte (142×95), que crecen con el carril
    (`clamp(6.5rem, 40%, 10rem)`). El carril no lleva relleno lateral: su
    borde derecho coincide con el del botón «siguiente».
  - **Dock**: se sentaba encima del último evento. La cabecera lleva su propio
    «compartir» (`app-share-button`, como control redondo) y la galería
    informa a `DockOverlapService` (`'gallery'`) mientras su cuerpo llega a
    la franja inferior de 96 px: el dock se retira y vuelve al bajar. Por
    debajo de 1025 px la galería no alcanza esa esquina: no hay botón propio
    y el dock sigue.
  - `app-icon` mide `1em`: se dimensiona con `font-size`, no con `width`.
  - Móvil: rótulo compacto (título en una línea, CTA pequeño) para no tapar
    una foto de ~230 px de alto.
- «Ver fotos y vídeos» abre la subcarpeta de Drive del evento
  (`driveFolderId`, sólo el ID) y, si falta o no es válido, la carpeta
  principal. Receta y verificación: `20-content-i18n.md` → «Añadir un evento
  a la galería».

## Reglas

- Usa siempre los tokens de `_tokens.scss`; nada de colores hexadecimales
  sueltos en el escenario.
- Prefiere `clamp()` a media queries nuevas: la misma hoja tiene que servir de
  un móvil a un proyector 4K.
- Presupuesto de estilos por componente: 36 kB warning / 48 kB error.
- Respeta `prefers-reduced-motion` en cualquier animación nueva.
