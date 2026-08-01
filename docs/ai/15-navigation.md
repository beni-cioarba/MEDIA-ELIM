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

## Modelo mental

```
app.routes.ts
└── '' → MainLayoutComponent          (eager: hace falta en el primer pintado)
    ├── ''            → HomeComponent        (lazy)
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

## Reglas del menú (para que escale)

- **1 módulo = 1 entrada.** Si un módulo necesita varias páginas, agrúpalas.
- **Máximo 2 niveles.** Nada de submenús dentro de submenús.
- **Máximo ~7 entradas de primer nivel**: por encima, la barra deja de leerse.
- Los grupos llevan `descriptionKey`: se ve en el desplegable y en el drawer.
- `cta` saca la entrada de la lista de enlaces y la lleva a la zona de acciones
  de la derecha. Hay exactamente dos, y no deben crecer:
  - `cta: 'live'` → «En directo», píldora dorada rellena (`.nav__live`).
  - `cta: 'support'` → «Donativos», píldora perfilada (`.nav__donate`), sólo
    en escritorio; por debajo de `xl` se repliega al icono (el rótulo sigue en
    `aria-label`/`title`) porque «Donativos» es mucho más ancho que «Doneață».
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

Lo consumen la barra, el drawer y los `mat-menu-item`. `trail` es además la
base de una futura migaja de pan: no dupliques esta lógica.

## Accesibilidad (ya resuelta, no la rompas)

- `.u-skip-link` → `#main-content` (el `<main>` tiene `tabindex="-1"`).
- Escritorio: `mat-menu` aporta `role="menu"`, flechas, `Escape`, foco
  devuelto al disparador y reposicionamiento. No lo sustituyas por un `div`.
- Móvil: `role="dialog"` + `aria-modal` + `cdkTrapFocus` + `Escape` +
  bloqueo de scroll del documento (`body.has-drawer-open`).
- La entrada activa marca `aria-current="page"` (ver `NavActiveService`).

## Rendimiento

- El layout es de los pocos componentes **eager**: mantenlo ligero.
- `mobile-nav` se descarga la primera vez que se abre el menú; en la pantalla
  del templo eso no pasa nunca.
- El pie usa `@defer (on viewport(footerAnchor))` con un `@placeholder` que
  **reserva altura** para no provocar CLS.
- El dock flotante usa `@defer (on idle)`.
