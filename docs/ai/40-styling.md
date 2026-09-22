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
**1600×1067 px, es decir 3:2**. Una banda a sangre nunca puede adoptar esa
proporción (a 1920 px de ancho medirían 1280 px de alto), así que con
`object-fit: cover` **siempre se pierde altura**. No es un fallo de CSS: es
geometría. Lo único que se decide es cuánto se pierde y qué se pierde.

- **Cuánto** — `hero-carousel.component.ts` fija
  `min-height: clamp(24rem, min(50vw, calc(100vh - var(--nav-height))), 64rem)`.
  El término `50vw` ancla la caja en ~2:1 en lugar de dejar que se estire a
  3:1 en monitores anchos: el recorte queda plano en ~25 % de 1024 px en
  adelante, en vez de crecer hasta el 53 % a 2560 px. El término con `100vh`
  garantiza que el hero completo cabe sobre la línea de flotación.
- **Qué** — cada `HeroSlide` puede declarar `focus` (`ImageFocus`:
  `top | upper | center | lower | bottom`). El carrusel lo traduce a
  `object-position`. El valor por defecto es `upper` (28 %), que es el correcto
  para fotos de grupo porque las caras viven en el tercio superior; sólo se
  declara `focus` cuando la foto pide otra cosa.

Alternativas descartadas: `object-fit: contain` (bandas negras, el hero deja de
ser a sangre) y `aspect-ratio: 3/2` en el contenedor (hero de 1280 px de alto
en escritorio). Si algún día se quiere el 100 % literal sin bandas, el patrón
es imagen `contain` sobre una copia `cover` desenfocada de fondo.

## Reglas

- Usa siempre los tokens de `_tokens.scss`; nada de colores hexadecimales
  sueltos en el escenario.
- Prefiere `clamp()` a media queries nuevas: la misma hoja tiene que servir de
  un móvil a un proyector 4K.
- Presupuesto de estilos por componente: 36 kB warning / 48 kB error.
- Respeta `prefers-reduced-motion` en cualquier animación nueva.
