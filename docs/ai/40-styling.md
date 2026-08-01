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
| `features/stage/styles/_responsive.scss`      | Media queries del escenario                 |
| `features/stage/stage.component.scss` (~2.100)| Hoja del escenario **y de todos los bloques** |
| Cada componente de `shared/` y `layout/`      | `styles: [...]` inline, encapsulado         |

## Decisión clave: `ViewEncapsulation.None` en `StageComponent`

`stage.component.scss` contiene reglas transversales que cruzan fronteras de
componente:

- overrides de proyección: `.stage.is-fullscreen .card__name { … }`
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
| Bloque redes                      | `.socials*`, `.card*`, `.scroll-indicator`                |
| Bloque transmisiones              | `.broadcasts*`, `.streams*`, `.live-now*`                 |
| Bloque galería                    | `.gallery*`                                               |
| Bloque semanal                    | `.weekly*`                                                |
| Bloque próximos eventos           | `.upcoming*`                                              |
| QR y pie                          | `.qr*`, `.bar*`                                           |
| Ubicación                         | `.location*`                                              |
| **Overrides de proyección**       | `.stage.is-fullscreen { … }` (al final del fichero)       |

Al final hay un bloque dedicado a **legibilidad a distancia**: en proyección se
suben pesos tipográficos y contraste, porque las fuentes finas no se leen desde
el fondo del templo. Si añades texto proyectable, súmalo a esas listas.

## Responsive

Escalado con `clamp()` y estos cortes (`_responsive.scss`):

| Rango                              | Objetivo                              |
| ---------------------------------- | ------------------------------------- |
| ≥ 1600px                           | Proyector grande / TV 4K              |
| 1025–1280px                        | Escritorio pequeño (2 columnas)       |
| ≤ 1024px                           | Tablet: el QR se oculta, 1 columna    |
| ≤ 768px                            | Móvil grande                          |
| ≤ 480px                            | Móvil pequeño                         |
| landscape y `max-height: 720px`    | Portátiles/proyectores bajos          |
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
