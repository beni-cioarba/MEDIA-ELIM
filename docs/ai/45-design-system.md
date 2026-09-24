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
| `_theme.scss`               | Tema M3 de Angular Material (`mat.theme` + overrides de marca). |
| `_theme-colors.scss`        | Paletas M3 generadas desde navy/oro (no editar a mano).          |
| `_base.scss`                | Reset y estilos de elemento (`html`, encabezados, `:focus`…).   |
| `_utilities.scss`           | Conjunto **cerrado** de utilidades `u-*`.                       |
| `_material-overrides.scss`  | Ajustes de marca globales (los overlays viven en `<body>`).     |
| `_ds.scss`                  | Barril público. Emite 0 bytes: seguro de importar siempre.      |

En cualquier `*.component.scss`:

```scss
@use 'ds' as *;   // funciona gracias a stylePreprocessorOptions.includePaths
```

## Angular Material

- Versión **22**, **tema M3** con `mat.theme()` en `_theme.scss`: emite una sola
  vez los tokens de sistema (`--mat-sys-primary`, `--mat-sys-on-surface`,
  `--mat-sys-body-large`…) y cada componente los lee. El CSS del tema pesa lo
  mismo con 3 componentes que con 30 (21 kB de hoja global, antes 38).
- Paletas en `_theme-colors.scss`, **generadas** con
  `ng generate @angular/material:theme-color --primary-color=#1a365d
  --tertiary-color=#d4af37 --neutral-color=#faf9f6 --directory=src/styles`:
  no se editan a mano.
- Fidelidad de marca: M3 pone en `primary` el tono 40 (#455f88); `_theme.scss`
  lo fija con `mat.theme-overrides` a `navy(700)` y a `gold(500)` en `tertiary`,
  para que un botón Material y un `.btn` propio sean el mismo azul y el mismo
  oro. `color-scheme: light` fijo: no hay modo oscuro.
- Tipografía de los controles (`plain-family` Inter, `brand-family` Playfair) y
  `density: -1` en el mismo `mat.theme()`.
- **Se carga donde se usa**: la portada sólo necesita botón e icono; el menú
  (`MatMenu` + overlay) y lo que traigan los módulos nuevos van en sus chunks
  lazy o tras `@defer`. Material y CDK son la librería de componentes oficial de
  la app (decisión del usuario): se usan a fondo, pero no en el bundle inicial
  sin necesidad.

### Añadir un componente de Material

1. Impórtalo en el componente standalone: `imports: [MatXModule]`. Con M3
   **no hay que tocar `_theme.scss`**: el componente ya lee los tokens.
2. Si necesita retoque de marca y su DOM vive en el overlay del CDK
   (menús, diálogos, tooltips), el ajuste va en `_material-overrides.scss`
   con los tokens `--mat-<componente>-*`, nunca clases internas; si vive dentro
   del componente, en su propio `.scss`.
3. Si el componente es de un módulo, que entre con el módulo (lazy), no en
   `MainLayout`.

Módulos en uso hoy: `MatButtonModule`, `MatMenuModule`, `MatListModule`,
`MatDividerModule`, `MatIconModule` (+ `A11yModule` y `DragDropModule` del CDK;
este último en el panel de control para reordenar bloques, sin tema propio).

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

- **Display `Plus Jakarta Sans`** (`--font-display`) para encabezados e
  interfaz destacada.
- Sans `Inter` (`--font-sans`) para cuerpo, datos y controles.
- Serif `Playfair Display` (`--font-serif`) **sólo** para la marca (wordmark) y
  las citas/versículos. El porqué, en `docs/ai/47-design-language.md` →
  «Tipografía».
- Tamaños fluidos con `clamp()` en `--fs-*`.
- `html { font-size: clamp(15px, 0.9vw + 0.5rem, 20px); }`: todo escala en la
  pantalla del templo sin media queries.

Ojo: la tipografía **de Material** usa tamaños fijos en `rem` a propósito;
`clamp()` rompería sus cálculos de densidad.

## Marca — qué logo va en cada sitio

Hay **tres piezas de marca** y ninguna es una imagen suelta en `assets/`
(los PNG/WebP `logo-elim.*` y `logo-ineb.png` se retiraron: sólo servían sobre
fondo oscuro, se veían borrosos y estaban desfasados). Las tres son las mismas
que usa la app administrativa (`INEB_ELIM_Administrativ/elim-admin`), así que
las dos apps se reconocen como hermanas.

| Pieza | Qué es | Dónde vive | Dónde se usa |
| --- | --- | --- | --- |
| **Wordmark ELIM** | `ELIM` sobre `ARGANDA DEL REY`, tipográfico | `shared/brand-logo/` (`app-brand-logo`) | **Toda** representación de la iglesia dentro de la interfaz: cabecera, pie, escenario proyectable, panel de control |
| **Emblema** | Paloma, cruz y llama sobre disco claro (disco interior del sello institucional) | `scripts/assets-src/emblema-elim.png` (máster, no se publica) → `assets/pwa/*` + `favicon.ico` | **Sólo iconos de la app**: favicon, PWA, Apple touch. Nunca dentro de una página |
| **Marca INEB** | Placa TECH + «IN» + «EB», SVG autocontenido | `shared/ineb-logo/` (`app-ineb-logo` + `README.md` = hoja de marca) | Entidad asociada: franja legal del pie, enlace a ineb.es |

Regla para la IA (y para cualquiera): **¿la iglesia dentro de la UI? →
`app-brand-logo`. ¿Icono de la app? → `npm run pwa:icons` (emblema). ¿INEB? →
`app-ineb-logo`.** Nada de PNG a mano, nada de copiar marcado, nada de
«actualizar» colores. Si aparece la necesidad de un cuarto uso, se añade aquí
antes de tocar código.

### Wordmark: `app-brand-logo`

`src/app/shared/brand-logo/` es **la única** representación de la iglesia en
toda la interfaz, y su `README.md` es la **hoja de marca** (retícula, colores y
contrastes medidos, mínimos, fondos, prohibiciones, reproducción fuera de
Angular). La consumen la cabecera (`size="md" tone="light"`), el pie
(`size="lg" tone="dark"`), el escenario proyectable (`size="xl" [link]="null"`) y
el panel de control (`size="sm"` sobre pastilla clara). Si hace falta la marca en
un sitio nuevo, se importa el componente; **no** se copia el marcado ni se
inserta una imagen.

Como `app-ineb-logo`, es una carpeta **autocontenida** que se copia tal cual a
otra app: paleta y tipografías declaradas dentro con los valores de marca
(`--brand-navy`, `--brand-gold`…, iguales a `navy(700)` / `gold(500)` / `gold(700)`
de los tokens), CSS plano sin mixins de `ds`, y ngx-translate **opcional** (el
nombre accesible sale de `brand.name` si hay traductor; si no, de `label`). Es la
excepción consciente a la regla de «sólo variables semánticas»: la marca no es
tema, es identidad, y debe verse igual en cualquier app de la iglesia.

| Entrada        | Valores                                   | Para qué                                        |
| -------------- | ----------------------------------------- | ----------------------------------------------- |
| `size`         | `sm` \| `md` \| `lg` \| `xl` \| `context` | Fija `--brand-size`; todo lo demás deriva. `context` deja el tamaño al `--brand-size` del consumidor (otras apps). |
| `tone`         | `light` \| `dark`                         | Claro: navy + oro profundo. Oscuro: papel + oro. Cada tono lleva su oro: no son intercambiables (2,0 y 3,0 de contraste cruzados). |
| `link`         | ruta, `https://…` o `null`                | Externa → pestaña nueva; `null` → `role="img"` no navegable. |
| `showLocation` | `boolean`                                 | Forma compacta (sólo el nombre), mínimo 16 px.  |
| `mono`         | `boolean`                                 | Una tinta: la localidad toma la del nombre (sello, grabado). |
| `label`        | texto                                     | Nombre accesible explícito; vacío = traducción o «Biserica Elim». |
| `name` · `location` | texto                                | Constantes de marca (`Elim` · `Arganda del Rey`); no son traducciones y por eso **ya no están en `i18n/*.json`**. |

La escala es responsabilidad del componente, no del consumidor: `md` es fluida
(`clamp(24px, 5vw, 1.8rem)`: 24 px en móvil, ~36 en escritorio) y `xl` se recorta
en proyectores apaisados de poca altura. **Mínimo de la forma completa: 24 px**
(la localidad queda en 6,9 px, el mismo listón que INEB da a «TECH» en su
mínimo); por debajo, `showLocation="false"`. Con los presets no se sobrescribe
`--brand-size` desde fuera (`:host(.is-*)` gana); para eso está `context`.

La marca es puramente tipográfica y sólo dice el nombre y el sitio: `ELIM`
sobre `ARGANDA DEL REY`. `brand.name` («Biserica / Iglesia Elim») sigue en i18n
pero sólo como `aria-label` (reactivo al idioma) y en el `<title>`.

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
  (`calc(var(--brand-size) * 0.289)`) y también el hueco entre líneas
  (`row-gap: calc(var(--brand-size) * 0.14)`; antes usaba `em` del contexto y
  variaba con el cuerpo de la página): cambiar el tamaño nunca descuadra la
  proporción. Alto total 1,43 S, ancho ≈ 3,16 S.

Motivos para no volver a una imagen (no lo revirtáis sin uno mejor):

- 0 kB extra y nitidez perfecta a cualquier densidad de pantalla.
- La barra es translúcida (`glass()`); un PNG/WebP con fondo propio peleaba con
  el contraste al hacer scroll sobre el hero.
- No provoca CLS: no hay imagen que cargar.

`CHURCH_CONFIG` ya **no tiene** campo `logo`: no hay imagen de marca que
configurar. Los metadatos (manifest, `apple-touch-icon`, favicon) apuntan a los
iconos generados, no a un logotipo.

### Emblema: sólo en los iconos de la app

El emblema es el **disco interior** del sello institucional (el sello completo,
con el anillo «Departament Administrativ», es de la app administrativa y no se
usa aquí). Vive como máster en `scripts/assets-src/emblema-elim.png` (674 px,
recorte al 69,5 % del sello original de 970 px, con máscara circular) y
`npm run pwa:icons` (`scripts/generate-pwa-icons.mjs`, con `sharp`) lo sirve
sobre **baldosa navy de marca** (`navy(700)` = `--c-primary` = `#1a365d`, el
mismo navy que la app administrativa):

| Salida | Tamaño | Emblema | Para |
| --- | --- | --- | --- |
| `assets/pwa/icon-512.png`, `icon-192.png` | 512 / 192 | 78 % del lado | manifest, `purpose: "any maskable"` (cabe en el círculo de seguridad del 80 %, así **un PNG sirve para los dos**) |
| `assets/pwa/icon-180.png` | 180 | 78 % | `apple-touch-icon` |
| `assets/pwa/favicon-32.png` | 32 | 84 % | `<link rel="icon" sizes="32x32">` |
| `src/favicon.ico` | 16 / 32 / 48 | 84 % | navegadores antiguos y marcadores |

Nunca se edita un PNG a mano: si cambia el emblema, se sustituye el máster y se
regenera. `theme_color` / `background_color` del manifest siguen siendo el fondo
del escenario (`#060914`); la baldosa navy se ve como icono, no como splash.

### Marca INEB: `app-ineb-logo`

`src/app/shared/ineb-logo/` es una **carpeta autocontenida** (no depende de
tokens, i18n ni servicios) copiada tal cual desde la app administrativa; su
`README.md` es la **hoja de marca completa** (anatomía, retícula y medidas,
paleta, mínimos, fondos, prohibiciones, cómo reproducirla fuera de Angular).
Cualquier cambio en la marca se hace en una app y se copia la carpeta entera a
la otra.

Lo imprescindible para usarla bien:

- Entradas: `tone` (`dark` sobre fondo oscuro → nombre en blanco; `light` →
  navy), `variant` (`lockup` completa · `compact` una línea · `mark` isotipo ·
  `auto`), `mono`, `tile` (sólo `mark`), `label` (vacío = decorativo).
- El **alto lo fija el contexto** con `--ineb-size`, **en px**: la forma completa
  no baja de **32 px** (por debajo «TECH» no se lee); `compact` y `mark` admiten
  16 px. No uses `rem`: la raíz baja a 15 px en móvil.
- Colores fijos (`--ineb-yellow/red/navy`): tocarlos deja de ser la marca. El
  rojo es el mismo en todos los fondos.
- En esta web sólo aparece en el pie: `<app-ineb-logo tone="dark" />` dentro del
  enlace `.footer__partner` (que lleva el `aria-label`), a
  `clamp(32px, 2.4vw, 36px)`, atenuado al 75 % hasta el hover para no competir
  con la marca de la iglesia.

### Ojo con `StageComponent`

Usa `ViewEncapsulation.None`, así que sus selectores son globales. Por eso su
cabecera se llama `.stage-brand` y no `.brand`: un `.brand` global pisaría el
interior de `app-brand-logo`. Prefija siempre las clases del escenario.

## Pie de página

`src/app/shared/footer/` es la superficie oscura que cierra todas las páginas
públicas: identidad + misión + redes, las columnas del mapa del sitio, los
datos de visita (dirección, correo, teléfono, horarios) con sus dos CTA
(donar y directo), y una franja legal mínima con el copyright, la versión, el
acceso al panel de control y la marca de la entidad asociada (`app-ineb-logo`).

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
