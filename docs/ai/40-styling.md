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
| Bloque redes                      | `.socials*`, `.card*` (`__network`, `__handle`, `__desc`), `.scroll-indicator` |
| Bloque transmisiones              | `.broadcasts*`, `.streams*`, `.live-now*`                 |
| Bloque galería                    | `.gallery*`                                               |
| Bloque semanal                    | `.weekly*`                                                |
| Bloque próximos eventos           | `.upcoming*`                                              |
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

Alternativa probada y descartada: **hero partido** (texto sobre navy a la
izquierda, foto entera en un marco 3:2 a la derecha). Evitaba el recorte por
completo, pero la bienvenida pasaba a leerse como una ficha de producto: al
entrar no se veía la iglesia, se veía una tarjeta. El recorte controlado por
`focus` cuesta menos que esa pérdida.

## Reglas

- Usa siempre los tokens de `_tokens.scss`; nada de colores hexadecimales
  sueltos en el escenario.
- Prefiere `clamp()` a media queries nuevas: la misma hoja tiene que servir de
  un móvil a un proyector 4K.
- Presupuesto de estilos por componente: 36 kB warning / 48 kB error.
- Respeta `prefers-reduced-motion` en cualquier animación nueva.
