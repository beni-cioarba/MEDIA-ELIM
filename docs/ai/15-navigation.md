# 15 · Navegación, rutas y layout

> Lee este shard si vas a **añadir una página, una entrada de menú o un
> enlace profundo**. Para el contenido de la página en sí, ve a
> `10-architecture.md`.

## Piezas

| Fichero                                | Responsabilidad                                          |
| -------------------------------------- | -------------------------------------------------------- |
| `core/navigation/app-paths.ts`          | **Única** fuente de segmentos de URL. Nada de strings sueltos. |
| `core/navigation/nav.model.ts`          | `NavItem` + `isNavGroup()` / `isExternalNavItem()`.      |
| `core/navigation/navigation.config.ts`  | `MAIN_NAV`: el árbol del menú. Nada más define el menú.  |
| `app.routes.ts`                         | Rutas reales. Un solo padre con `MainLayoutComponent`.   |
| `layout/main-layout/`                   | Shell: nav + `<router-outlet>` + pie + dock flotante.    |
| `layout/top-nav/`                       | Barra superior (escritorio, `mat-menu`).                 |
| `layout/mobile-nav/`                    | Drawer móvil, diferido con `@defer (when …)`.            |
| `layout/tab-bar/`                       | Barra de pestañas inferior (`< lg`), una pestaña por bloque. |
| `features/nav-hub/`                     | Portada de sección de cada grupo (`/biserica`, `/program`, `/multimedia`). |
| `core/navigation/nav-summary.service.ts`| Resumen vivo de cada entrada (portada y marcas del cajón). |

## Modelo mental

```
app.routes.ts
└── '' → MainLayoutComponent          (eager: hace falta en el primer pintado)
    ├── ''            → HomeComponent        (lazy)
    ├── 'biserica' · 'program' · 'multimedia' → NavHubComponent (lazy, `data.navGroup`)
    ├── 'despre-noi'  → AboutComponent       (lazy)
    ├── 'marturisirea-de-credinta' → CredoComponent (lazy + resolve i18n)
    ├── 'conducere'   → LeadershipComponent  (lazy)
    ├── 'media'       → StageComponent       (lazy)  ← todos los bloques
    ├── 'media/:blockId' → StageComponent    (lazy)  ← un bloque suelto
    ├── 'contact'     → ContactComponent     (lazy)
    ├── 'doneaza'     → DonateComponent      (lazy)
    └── '**'          → redirect a ''
```

El escenario (`/media`) tiene **doble vida**:

- Sin parámetro → muestra todos los bloques, uno debajo de otro.
- Con `:blockId` → muestra sólo ese bloque, con su propia URL compartible.
- En modo presentación → ignora la URL y obedece al carrusel.

Los slugs viven en `STAGE_BLOCK_SLUGS` y se traducen con `blockPath(id)` /
`blockIdFromSlug(slug)`. **Nunca** escribas `/media/galerie` a mano.

## Receta: añadir una página nueva

1. `app-paths.ts` → añade la clave (`APP_PATHS.donations = 'donatii'`).
2. Crea `features/donations/donations.component.ts` (standalone, OnPush).
3. `app.routes.ts` → hijo nuevo con `loadComponent` y `data.seo`:

   ```ts
   {
     path: APP_PATHS.donations,
     loadComponent: () => import('./features/donations/donations.component')
       .then((m) => m.DonationsComponent),
     data: { seo: { title: 'seo.donations.title', description: 'seo.donations.description' } },
   }
   ```

4. `navigation.config.ts` → entrada en `MAIN_NAV` (o dentro de un grupo).
5. `es.json` **y** `ro.json` → `nav.donations`, `seo.donations.*` y los textos.

Las **rutas del operador** (`/media/control`, `/media/ecran`) no cuelgan del
`MainLayoutComponent`: se declaran antes que él en `APP_ROUTES`, sin cabecera
ni pie, y no aparecen en `MAIN_NAV`. Cualquier herramienta interna nueva sigue
ese patrón; una página pública, el de abajo.

Si la página admite un elemento con URL propia (como `/anunturi/:id`), se
declara una segunda ruta con el **mismo** `loadComponent` y el componente lee
el parámetro con `ActivatedRoute.paramMap` (patrón de `/media/:blockId`). El
menú sólo enlaza la ruta base; `NavActiveService` marca la entrada también en
la ruta hija por coincidencia de prefijo.

## Reglas del menú (para que escale)

- **1 módulo = 1 entrada.** Si un módulo necesita varias páginas, agrúpalas.
- **Máximo 2 niveles.** Nada de submenús dentro de submenús.
- **Máximo ~7 entradas de primer nivel**: por encima, la barra deja de leerse.
- Los grupos llevan `descriptionKey`: se ve en el desplegable y en el drawer.
- `cta` saca la entrada de la lista de enlaces y la lleva a la zona de acciones
  de la derecha. Hay exactamente dos, y no deben crecer:
  - `cta: 'live'` → «En directo», píldora dorada rellena (`.nav__live`). Es
    la **única** píldora de la barra: una cabecera tiene una forma de botón.
  - `cta: 'support'` → «Donativos», plano y sin borde (`.nav__donate`), sólo
    en escritorio. El rótulo está siempre visible; lo que se aprieta para
    hacerle sitio por debajo de `xl` es el relleno de los enlaces.
  En móvil ambas siguen dentro del cajón, que recorre `MAIN_NAV` entero.
- Separar navegación de acciones es lo que mantiene la lista en cinco enlaces:
  las entradas con `cta` **no** cuentan para el límite de ~7.
- Las etiquetas viven bajo `nav.*` y deben existir en los dos idiomas.

## Estado activo: `NavActiveService`

Quién está activo **no** se decide con `routerLinkActive`, sino con
`core/navigation/nav-active.service.ts`, porque:

- los disparadores de grupo son `<button>` y `routerLinkActive` no los alcanza;
- las rutas se solapan (`/media`, `/media/galerie`, `/media/locatie`) y hace
  falta resolver por **coincidencia más larga**, no por prefijo ni por exacto.

El servicio expone `url`, `trail` (`[grupo, hoja]`) y `activeIds`. En plantilla:

```html
<a [class.is-active]="activeIds().has(item.id)"
   [attr.aria-current]="activeIds().has(item.id) ? 'page' : null">
```

Lo consumen la barra, el drawer y los enlaces del panel de grupo. `trail` es
además la base de una futura migaja de pan: no dupliques esta lógica.

## El panel de grupo (mega-menú)

Un grupo de `MAIN_NAV` abre un panel de ancho completo **dentro de la
cabecera**. No es un `mat-menu` ni un overlay del CDK: al ocupar toda la
pantalla no puede salirse de ella, así que no hace falta posicionarlo.

El panel tiene **dos zonas**, no dos filas:

```
[ enlaces del grupo · 22rem ] │ [ bloque destacado · el resto ]
```

- **Enlaces**: una columna apilada, uno por hijo del grupo.
- **Destacado** (`asideKind()` en el componente): contenido real de ese grupo.
  - `media` → tira de miniaturas de los álbumes de la galería.
  - `program` → «lo próximo» (culto, evento, lectura) + la semana entera +
    **las familias de la semana** en carrusel (`app-card-carousel`, tarjetas
    de 9,5 rem con la foto entera en 4:3 y «Apellido / nombres»; enlaza a
    `#<id>` de su ficha). Con cinco caben y no se mueve; si la semana trae
    más, avanza solo cada 4 s (pausa al apuntar, con foco, con
    `prefers-reduced-motion` o en cuanto se toca). Equilibra el panel: la
    columna de seis enlaces medía ~390 px y el destacado ~270.
  - `about` → tarjeta de invitación (culto, dirección, cómo llegar).

Por qué en dos zonas y no apilado: medido a 1512 px, con los enlaces arriba y
el contenido abajo sobraban **568 px a la derecha de la fila de enlaces** y el
panel medía 390 px —el 43 % de la pantalla— para tres enlaces. En dos zonas el
hueco es el destacado y el panel baja a 235. El detalle está en la decisión 29
de `47-design-language.md`.

**Si añades un grupo**: dale destacado o no se lo des, pero sé consciente de
que sin él el panel se queda con la columna de enlaces y el resto en blanco.
`has-aside` es lo único que decide el reparto; sin esa clase el panel cae solo
a una rejilla de enlaces a todo el ancho.

Por debajo de `xl` (1280) el panel vuelve a apilarse: ahí al destacado le
quedaban 617 px y las miniaturas caían a 106×60. El panel nunca pasa del alto
de la ventana (`max-height` + scroll propio): apilado, el de Programa con
familias no cabía en un portátil bajo.

**Iconos del grupo Programa**: cada entrada el suyo (antes «Evenimente» y
«Program săptămânal» compartían `calendar`): `sparkles` para eventos,
`family` para las familias y `pray` («folded_hands» de Material Symbols,
copiado como `FilledIcon` en `icon-registry.ts`) para las causas. Un icono
figurativo se toma de un set profesional, no se dibuja a mano.

## Accesibilidad (ya resuelta, no la rompas)

- `.u-skip-link` → `#main-content` (el `<main>` tiene `tabindex="-1"`).
- Escritorio: el panel de grupo es un **disclosure**, no un menú ARIA. El
  disparador es un `<button>` con `aria-expanded` + `aria-controls`; el panel
  es un `role="group"` con el nombre del grupo. Cierra con `Escape`, al pulsar
  fuera, al navegar y al retirar el ratón (con 220 ms de gracia). **No le
  pongas `role="menu"`**: obliga a que todo lo de dentro sea un `menuitem` y
  prohíbe justo el contenido que el panel enseña.
- Dentro del panel, los rótulos de sección son `<span>` con `id`, no
  encabezados: un `h2` que sólo existe mientras el menú está abierto ensucia
  el esquema del documento. Las listas se nombran con `aria-labelledby`.
- Móvil: `role="dialog"` + `aria-modal` + `cdkTrapFocus` + `Escape` +
  bloqueo de scroll del documento (`body.has-drawer-open`).
- La entrada activa marca `aria-current="page"` (ver `NavActiveService`).

## Rendimiento

- El layout es de los pocos componentes **eager**: mantenlo ligero.
- `mobile-nav` se descarga la primera vez que se abre el menú; en la pantalla
  del templo eso no pasa nunca.
- El pie usa `@defer (on viewport(footerAnchor))` con un `@placeholder` que
  **reserva altura** para no provocar CLS (17 rem escritorio / 48 rem móvil:
  si cambia el alto del pie, se vuelve a medir y se ajusta).

## El pie (compacto, 29/09/2026)

Columnas derivadas de `MAIN_NAV` (un grupo nuevo aparece solo). Identidad =
logo + redes (sin lema, misión ni rótulo visible «Síguenos»: el `h2` queda
`u-sr-only`). Franja inferior en **dos grupos**: © + versión a la izquierda;
a la derecha acciones en iconos de 34 px (volver arriba, compartir, panel de
control, guía de estilos; nombre en `title`/`aria-label`), separador y marca
INEB. «Donează» sin icono. ~280 px en escritorio (1600) y ~300 (1280):
columnas de enlaces a su contenido (`auto`), grupos largos en dos
subcolumnas (`splitAfter` = 4 → Program 3 + 3), «Donează / În direct» bajo
las redes y `li` en flex (el enlace `inline-block` sobre el interlineado del
cuerpo inflaba cada fila de 21 a 31 px). El logo de INEB enlaza al
LinkedIn del desarrollador («Desarrollado por INEB · LinkedIn») hasta que
exista la web de la consultora (`FooterComponent.links.partner`).

**El dock flotante se retira mientras el pie está a la vista** (≥ 30 %):
el pie repite sus acciones. Lo coordina `DockOverlapService`
(`shared/floating-actions/`): el bloque que duplica acciones informa de su
visibilidad (`report('footer', …)`) y el dock lee `duplicateVisible`. El
pie informa él mismo porque entra con `@defer`: buscarlo desde el dock con un
temporizador fallaba. Se usa la proporción (`intersectionRatio`), no
`isIntersecting`, o al subir el dock no volvía. Mismo patrón que
Administrativ.

Email y teléfono del pie: los reales de `church.config.ts → contact`.

**Teléfono con acciones** (29/09/2026): tras el número, dos botones redondos
pegados a él —llamar (`tel:`) y WhatsApp (`wa.me` con el saludo ya escrito
en el idioma activo)—. El icono va a color en reposo (oro / verde WhatsApp,
7,9:1 sobre el navy) porque son la acción del dato; al apuntar se rellenan.
32 px con ratón (margen negativo: la fila no crece) y ~41 px en táctil
(`pointer: coarse`). Sin `whatsapp` en la configuración, sólo sale llamar.

**Rejilla ≥ xl**: identidad y contacto con suelo `max-content`
(`minmax(max-content, 1fr)` / `minmax(max-content, 1.25fr)`). Con suelo fijo
de 14,5 rem la identidad reservaba 41 px que no usaba y el contacto, con suelo
0, se quedaba en 206 px a 1280: el correo real y la fila del teléfono (246 px)
se salían y el borde del pie los recortaba. A 1280 la rejilla suma ~1.191 de
1.194 px: si crece el contenido, adelantar el apilado de `xl`.
- El dock flotante usa `@defer (on idle)`.

## Barra de pestañas y portadas de sección (03/10/2026)

**Cuándo**: exactamente cuando la cabecera pasa a la hamburguesa (`< lg`,
1024 px, el mismo corte que `.u-mobile-only`). La cabecera sigue igual; la
barra la complementa. Fuera en presentación (`fullscreen`).

**Qué pestañas**: todo el primer nivel de `MAIN_NAV`, también las `cta`
(hoy siete: Acasă, Biserica, Program, Media, Contact, Donează, În direct),
resueltas en `TabNavService`. Sin lista propia. Siete es el techo (regla 6 de
`navigation.config.ts`): a 320 px cada pestaña mide ~43 px, así que por
debajo de 380 sólo la activa lleva rótulo (patrón de Material 3) y puede
ocupar el hueco de sus vecinas. «În direct» lleva un punto dorado latiendo.
Cápsula de 3,4 rem (`--tab-bar-height`) con 0,4 rem de margen.

**Deslizar** (`SwipeTabsDirective`, en el `<main>`): de derecha a izquierda
pasa a la pestaña siguiente y al revés, sin dar la vuelta; la página nueva
entra desde ese lado (`is-swipe-next/prev`, 240 ms). Sólo con el dedo y con
la barra visible. No actúa si el gesto empieza en los 24 px del borde
(«atrás» del sistema), en algo con gesto horizontal propio (carruseles,
campos, vídeo, cualquier caja con scroll horizontal o `[data-no-swipe]`),
con texto seleccionado, si no es claramente horizontal (|dx| > 1,8·|dy|) o
si es lento (> 700 ms). Marca con `data-no-swipe` cualquier pieza nueva que
se arrastre en horizontal.

**Adónde lleva cada pestaña**: una hoja, a su página; un grupo, a su
**portada de sección**. Por eso todo grupo lleva `path` (la portada) y
`descriptionKey` (su entradilla y su meta descripción). Pulsar la pestaña de
la página actual sube arriba. Activa = `NavActiveService.trail()[0]`; en
páginas fuera de las pestañas (Donează) el indicador se apaga.

**Portada de sección** (`NavHubComponent`, una para todos los grupos):
cabecera navy + una tarjeta por hijo con icono, rótulo, descripción y el
**dato vivo** de `NavSummaryService` (próximo culto, avisos en vigor, lectura
de hoy, familias de la semana, fase del concurso, miniaturas de la
galería…). Debajo, el **destacado** del grupo (`nav-hub/spotlights/`,
cabecera común `hub-section`): el equivalente a escala de página del bloque
derecho del panel de escritorio —Program: la semana entera desde hoy + el
carrusel de familias; Media: los álbumes con foto + las últimas emisiones
(JSON estático, `youtube.start('ligero')`); Biserica: la invitación (culto,
dirección, cómo llegar)—. Las tarjetas no repiten lo del destacado (por eso
«Cine suntem» da los años en Arganda y no la dirección). Ojo: el destacado
es rejilla de `minmax(0, 1fr)`; sin él el carrusel ensanchaba la página a
~800 px en el teléfono. Grupo nuevo = `path` + `descriptionKey` en `MAIN_NAV` +
`navHubRoute()` en `app.routes.ts`. Página nueva dentro de un grupo = sale
sola; darle dato vivo = un `case` en `NavSummaryService.build()`.
`/multimedia` y no `/media`: `/media` es el panel completo y circula en QR.

**Contrato de altura** (`_base.scss`): `MainLayoutComponent` pone
`body.has-tab-bar`; ahí se declaran `--tab-bar-height`, `--tab-bar-gap`,
`--app-tab-bar-h` (lo que ocupa desde el borde, con margen y barra de
gestos; 0 sin barra) y `--app-bottom-safe` (0 con barra: la zona segura la
absorbe ella). Lo consumen:

- el **pie**: lo suma a su relleno inferior → al llegar abajo se ve entero
  y la cápsula flota sobre su propio navy;
- el **dock flotante**: se aparta (`bottom: tab-bar + dock-offset + …`);
- las **barras de documento** (Credo, hoja de `doc-toc`): se apoyan encima.

Cualquier pieza nueva fija abajo debe sumar `var(--app-tab-bar-h, 0px)`.

Con un campo de texto enfocado en táctil la barra se hunde (el teclado
virtual la subiría encima del campo).

**Cajón** (misma fecha): accesos arriba (próximo culto + «În direct» +
«Donează»), filas con icono · rótulo · descripción como el panel de
escritorio, marca viva a la derecha (`NavSummary.badge`: avisos, fecha del
próximo evento, culto de hoy) y el rótulo de cada grupo enlaza a su portada.
Sin Material. La marca se reserva para lo que cambia; un recuento estático
no lleva marca.
