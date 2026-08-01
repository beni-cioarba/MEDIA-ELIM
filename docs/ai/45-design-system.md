# 45 · Design system (tokens, tema y Angular Material)

> Lee este shard antes de tocar un color, un espaciado, una sombra o de
> añadir un componente de Angular Material. Para el CSS del **escenario
> proyectable** ve a `40-styling.md`.

## Las tres capas (no las mezcles)

```
1. PRIMITIVAS   src/styles/_tokens.scss      Sass. Paletas y escalas crudas.
                                             navy(700), gold(500), space(4)…
        ↓ sólo las consume _semantic.scss y _theme.scss
2. SEMÁNTICA    src/styles/_semantic.scss     Emite variables CSS en :root.
                                             --c-primary, --sp-4, --fs-h2…
        ↓ es lo ÚNICO que consumen los componentes
3. COMPONENTE   *.component.scss              @use 'ds' as *;
                                             color: var(--c-text);
```

Regla dura: **un componente nunca escribe `#1a365d`, `16px` ni `navy(700)`**.
Si te falta una variable, créala en `_semantic.scss` (y su primitiva en
`_tokens.scss` si hace falta), no la inventes en el componente.

## Ficheros

| Fichero                     | Qué hace                                                       |
| --------------------------- | -------------------------------------------------------------- |
| `_tokens.scss`              | Mapas Sass + funciones tipadas (`navy()`, `space()`, `z()`…).   |
| `_semantic.scss`            | Emite `--c-*`, `--sp-*`, `--r-*`, `--e-*`, `--fs-*`, `--z-*`, `--mo-*`, `--ea-*`. Incluye variantes para `is-fullscreen` y `prefers-contrast: more`. |
| `_mixins.scss`              | `from()`, `until()`, `focus-ring()`, `surface()`, `glass()`, `container()`, `auto-grid()`, `line-clamp()`, `motion-reduce`… |
| `_theme.scss`               | Tema de Angular Material (M2) con paletas navy/dorado.          |
| `_base.scss`                | Reset y estilos de elemento (`html`, encabezados, `:focus`…).   |
| `_utilities.scss`           | Conjunto **cerrado** de utilidades `u-*`.                       |
| `_material-overrides.scss`  | Ajustes de marca globales (los overlays viven en `<body>`).     |
| `_ds.scss`                  | Barril público. Emite 0 bytes: seguro de importar siempre.      |

En cualquier `*.component.scss`:

```scss
@use 'ds' as *;   // funciona gracias a stylePreprocessorOptions.includePaths
```

## Angular Material

- Versión 17, **API de temas M2** (`mat.define-palette`, `mat.define-light-theme`).
- **Nunca** uses `mat.all-component-themes`: mete ~200 kB de CSS.
- `_theme.scss` emite `mat.core()`, `mat.core-theme()` y **sólo** el tema de
  los componentes que la app importa de verdad.

### Añadir un componente de Material

1. Impórtalo en el componente standalone: `imports: [MatXModule]`.
2. Añade su línea en `_theme.scss`: `@include mat.x-theme($elim-theme);`.
   **Sin esto el componente sale sin color.**
3. Si necesita retoque de marca y su DOM vive en el overlay del CDK
   (menús, diálogos, tooltips), el ajuste va en `_material-overrides.scss`;
   si vive dentro del componente, en su propio `.scss`.
4. Si dejas de usarlo, quita la línea del tema. CSS muerto = kB en la
   pantalla del templo.

Módulos en uso hoy: `MatButtonModule`, `MatMenuModule`, `MatListModule`,
`MatDividerModule`, `MatIconModule` (+ `A11yModule` del CDK).

### Por qué Material y no otra librería

- Es oficial: mismo ciclo de vida que Angular, sin riesgo de abandono.
- El CDK ya estaba en el proyecto (overlay del selector de calendario).
- `MatMenu` resuelve gratis lo caro de un menú: `role`, teclado, foco,
  reposicionamiento y `Escape`.
- Es tematizable de verdad: no arrastramos un segundo sistema visual.
- Se importa por componente: pagamos sólo lo que usamos.

No añadimos PrimeNG/NG-ZORRO (segundo design system, incoherencia visual)
ni Tailwind (duplicaría esta capa de tokens).

## Iconos

Dos vías, y **hay que elegir la correcta**:

| Caso                                          | Qué usar                                  |
| --------------------------------------------- | ----------------------------------------- |
| Icono de la interfaz (menú, flechas, acciones) | `<app-icon name="menu" />` — SVG inline   |
| Icono suelto y poco frecuente                  | `<mat-icon>favorite</mat-icon>` (Material Symbols) |

`app-icon` usa `provideElimIcons()` (`core/ui/icon-registry.ts`), que registra
SVG **literales** en el `MatIconRegistry`: cero peticiones de red, cero CLS y
tipado estricto vía `IconName`. Para añadir uno: amplía `IconName` y añade su
trazado en `ICON_PATHS`. El compilador te avisará de los usos inválidos.

La fuente **Material Symbols Outlined** se carga sin bloquear el render desde
`index.html`; hasta que está lista, `html:not(.fonts-symbols-ready)` oculta
los ligature-icons para que no se vea el texto crudo.

## Tipografía

- Serif `Playfair Display` para encabezados (`--font-serif`).
- Sans `Inter` para texto (`--font-sans`).
- Tamaños fluidos con `clamp()` en `--fs-*`.
- `html { font-size: clamp(15px, 0.9vw + 0.5rem, 20px); }`: todo escala en la
  pantalla del templo sin media queries.

Ojo: la tipografía **de Material** usa tamaños fijos en `rem` a propósito;
`clamp()` rompería sus cálculos de densidad.

## Marca: `app-brand-logo` (wordmark, no logo)

`src/app/shared/brand-logo/brand-logo.component.ts` es **la única**
representación de la marca en toda la app. La consumen la cabecera
(`size="md" tone="light"`), el pie (`size="lg" tone="dark"`) y el escenario
proyectable (`size="xl" [link]="null"`). Si hace falta una marca en un sitio
nuevo, se importa el componente; **no** se copia el marcado ni se inserta
`logo-elim.*`.

| Entrada        | Valores                      | Para qué                                        |
| -------------- | ---------------------------- | ----------------------------------------------- |
| `size`         | `sm` \| `md` \| `lg` \| `xl` | Fija `--brand-size`; todo lo demás deriva.       |
| `tone`         | `light` \| `dark`            | Sobre fondo claro / sobre fondo de marca.        |
| `link`         | ruta o `null`                | `null` lo pinta como `role="img"` no navegable.  |
| `showLocation` | `boolean`                    | Oculta la línea de la localidad.                 |

La escala es responsabilidad del componente, no del consumidor: `md` es fluida
(baja sola en móvil) y `xl` se recorta en proyectores apaisados de poca altura.
No intentes sobrescribir `--brand-size` desde fuera: `:host(.is-*)` gana en
especificidad.

La marca es puramente tipográfica y sólo dice el nombre y el sitio: `ELIM`
sobre `ARGANDA DEL REY` (claves `brand.short` y `brand.location`; `brand.name`,
con «Biserica / Iglesia», sigue viva pero sólo como `aria-label` y en el
`<title>`).

Construcción del lockup (`.brand__name` / `.brand__city`):

- `ELIM` en serif, versalitas y `letter-spacing: 0.22em`: una palabra de cuatro
  letras necesita tracking para leerse como marca y no como una palabra suelta.
- **La localidad se justifica sola al ancho de `ELIM`.** No hay tracking
  calibrado a mano ni números mágicos por breakpoint:

  1. `.brand` es una rejilla de una sola columna. Sólo el nombre aporta
     ancho, y su `margin-inline-end: -0.22em` descuenta el `letter-spacing`
     que cuelga tras la «M», de modo que la columna mide **tinta** y no la
     caja con el hueco fantasma.
  2. La localidad usa `width: 0` + `min-width: 100%`: no aporta nada al
     tamaño de la columna pero la ocupa entera.
  3. `text-align-last: justify` reparte el sobrante entre las palabras y
     «REY» cae en la vertical exacta de la «M».

  Verificado de 375 a 1800 px: una sola línea y ≤ 0,61 px de diferencia entre
  los bordes derechos.
- El cuerpo de la localidad **deriva** del nombre
  (`calc(var(--brand-size) * 0.289)`): cambiar el tamaño nunca descuadra la
  proporción.

Motivos para no volver a una imagen (no lo revirtáis sin uno mejor):

- 0 kB extra y nitidez perfecta a cualquier densidad de pantalla.
- La barra es translúcida (`glass()`); un PNG/WebP con fondo propio peleaba con
  el contraste al hacer scroll sobre el hero.
- No provoca CLS: no hay imagen que cargar.

`CHURCH_CONFIG.logo` ya **no** lo consume ningún componente: queda para
metadatos (PWA, Open Graph). No lo uses para pintar la marca.

### Ojo con `StageComponent`

Usa `ViewEncapsulation.None`, así que sus selectores son globales. Por eso su
cabecera se llama `.stage-brand` y no `.brand`: un `.brand` global pisaría el
interior de `app-brand-logo`. Prefija siempre las clases del escenario.

## Pie de página

`src/app/shared/footer/` es la superficie oscura que cierra todas las páginas
públicas: identidad + misión + redes, las columnas del mapa del sitio, los
datos de visita (dirección, correo, teléfono, horarios) con sus dos CTA
(donar y directo), y una franja legal mínima con el copyright y el logo de la
entidad asociada.

«Volver arriba» **no** vive en el pie, sino en el dock flotante
(`shared/floating-actions`): aparece tras pantalla y media de scroll y está
disponible en toda la página, no sólo al final. El dock deja de esconderse
sobre el pie mientras ese botón está activo, que es justo cuando más se
necesita.

Tres decisiones que conviene no deshacer:

- **Las columnas se derivan de `MAIN_NAV`** (`MAIN_NAV.filter(isNavGroup)`):
  añadir un grupo al menú lo añade al pie automáticamente. No hay lista
  duplicada que se pueda desincronizar.
- **Los datos salen de `CHURCH_CONFIG`** (dirección, correo, teléfono, redes):
  cambiar un dato es tocar un fichero.
- **Se monta con `@defer (on viewport)`** desde `MainLayoutComponent`, con un
  hueco que reserva su altura (`.shell__footer-ph`). Por eso puede ser rico
  sin coste en el primer pintado. Si crece mucho, ajusta esa altura.

### Holgura de la barra

Entre 1024 y ~1400 px la lista se comía la zona de acciones. Se resuelve en tres
pasos, sin tocar el orden de los elementos:

1. `padding-inline: clamp(0.4rem, 0.85vw, 0.8rem)` en `.nav__link` (y un
   `clamp` equivalente en `.nav__desktop`): comprime sin saltos al redimensionar.
   El techo es corto a propósito: a partir de `xl` reaparece el rótulo del
   donativo y hace falta ese margen.
2. Compartir **no está en la cabecera**. Vive sólo en el dock flotante
   (`FloatingActionsComponent`) y en el menú móvil: es una acción secundaria y
   duplicarla arriba sólo robaba espacio a la navegación.
3. `.nav__donate` se repliega al icono por debajo de `xl`. Es el único ajuste
   que **no** depende del idioma: «Donativos» ocupa ~60 px más que «Doneață» y
   con el rótulo visible la lista invadía las acciones en castellano.

Si añades otro control a `.nav__actions`, vuelve a medir la separación entre el
último enlace y `.nav__donate` a 1024, 1280 y 1440 px **en los dos idiomas**.
El mínimo medido hoy es 9 px (1025 px, castellano).

### Diálogos sobre elementos transformados

El modal de compartir es un `<dialog>` abierto con `showModal()`, **no** un
`div` con `position: fixed`. Motivo: `ShareButtonComponent` se instancia dentro
del dock flotante y del cajón móvil, y ambos usan `transform` y
`backdrop-filter`; cualquiera de las dos propiedades convierte al ancestro en
bloque contenedor de sus descendientes fijos, así que el «modal a pantalla
completa» acababa midiendo 54×54 px dentro del propio botón. `showModal()`
promociona el elemento a la *top layer*, que ignora transformaciones, opacidad y
recortes de los ancestros, y añade atrapado de foco, cierre con Escape, fondo
inerte y `::backdrop`.

> Regla: cualquier capa flotante que nazca dentro de un componente con
> `transform`, `filter`, `backdrop-filter`, `perspective`, `contain` o
> `will-change` tiene que ser `<dialog>` + `showModal()` o un overlay del CDK.
> Hay que anular los estilos de agente de usuario del `<dialog>` (`margin`,
> `width: fit-content`, `max-width`, borde) y fijar `pointer-events: auto`,
> porque esa propiedad **sí** se hereda del ancestro aunque el elemento esté en
> la top layer.

## Ancho de lectura (`--w-prose`)

En `_base.scss` sólo **`p`** lleva `max-width: var(--w-prose)`. Los `li` **no**:
en esta app la mayoría de listas son rejillas de tarjetas, y limitarlas dejaba
las tarjetas estrechas dentro de contenedores anchos.

- Si necesitas prosa dentro de una lista, envuélvela en `.u-prose`
  (`.u-prose li` sí recibe el límite).
- Cualquier caja con `max-width` que deba quedar centrada necesita
  `margin-inline: auto` explícito: el `text-align: center` del contenedor no
  centra la caja. Ya está aplicado en `page-section` (`.section__head > p`) y en
  `_page-hero.scss` (`.page-hero__inner > p`).
- No parchees esto con `max-width: none` en el componente; corrige el origen.

## Accesibilidad y movimiento

- Foco visible siempre: `@include focus-ring` ya aplicado en `_base.scss` a
  botones, enlaces y controles.
- Objetivos táctiles ≥ 44 px (`@include tap-target`).
- Todo lo que anime debe tener su bloque `@include motion-reduce`.
- Contraste: hay un bloque `@media (prefers-contrast: more)` en `_semantic.scss`.
