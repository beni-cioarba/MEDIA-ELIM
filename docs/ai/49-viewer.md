# 49 · Visores: documental y galería (`shared/viewer/`)

> Para ver una imagen o un documento a pantalla completa desde cualquier
> módulo. Adaptados de CemenWEB: el **visor documental** (`gestor-documental/
> componentes/visor`) y la **galería** (`atm-gallery`).

## Uso (lo único que necesita un módulo)

```html
<!-- Cualquier contenedor de imagen: control sutil al pasar el ratón, clic/Enter abre. -->
<div [appViewable]="docs" [appViewableIndex]="i" [appViewableDisabled]="proyectando">…</div>
<div [appViewable]="doc">…</div>                         <!-- un solo documento -->
<div [appViewable]="fotos" appViewableMode="gallery">…</div>  <!-- la galería -->
```

```ts
inject(DocumentViewerService).open(docs, índice);  // desde código
inject(GalleryViewerService).open(fotos, índice);
```

El contrato es `ViewerDocument` (`core/viewer-document.model.ts`): sólo `src` es
obligatorio; `name`, `mimeType`, `date`, `meta[]`, `status`, `details[]`,
`description`, `srcset`, `thumb`, `downloadName` enriquecen la vista. Cada
módulo traduce su modelo a esto (ver `FamilyPrayerComponent.weekMedia`).
La directiva va en el **contenedor**, no en el `<img>` (inserta el control dentro).
Con `null` / lista vacía / `disabled` no hace nada: se puede dejar puesta.

## Arquitectura

```
shared/viewer/
  core/              modelo, catálogo de categorías (icono, color, capacidades),
                     DocumentSourceService (descargar · imprimir · abrir en pestaña)
  document-viewer/   SHELL: barra única + motor + panel de información (presentacional)
  engines/           un motor por familia: image · pdf · media · text · unsupported
  overlay/           <dialog> a pantalla completa con la lista, LazyOverlay, DocumentViewerService
  gallery/           galería (progreso segmentado, miniaturas, autorreproducción, zoom)
  viewable.directive.ts   disparador reutilizable (+ control flotante)
```

- **Capacidades, no formatos**: la barra muestra zoom/giro/imprimir/ajuste de
  línea según `CATEGORIES[categoría]`. Formato nuevo = fila en `CATEGORIES` +
  extensión en `BY_EXTENSION` + motor + `@case` en el shell. Nada más.
- **Carga diferida**: los servicios son lo único que queda en el bundle de quien
  los usa; overlay, shell y motores van en su chunk (~49 kB) y se cargan al abrir.
- **pdf.js** (`pdfjs-dist`, build *legacy*) se sirve desde `assets/pdfjs/`
  (lo copia `angular.json`) y se importa en tiempo de ejecución: así no entra en
  la precarga de la PWA (`ngsw-config.json` precarga todos los `.js`). Tiene un
  polyfill de `Promise.try` (zone.js y Safari < 18.2 no lo traen).
- `<dialog>` modal: top layer, página inerte, `Esc` cierra, foco de vuelta a
  quien abrió, scroll de la página bloqueado mientras está abierto.

## Comportamiento (igual que CemenWEB, adaptado)

Visor documental: barra única (insignia de tipo, nombre, `meta · fecha`,
distintivo de estado, `n / total`), zoom −/%/+ y «Ajustat», girar ←/→, información
(panel superpuesto), descargar, imprimir, abrir en pestaña, cerrar; flechas ‹ ›
entre documentos (sin bucle). PDF: páginas que se pintan al acercarse a la vista
(IntersectionObserver), nítidas (devicePixelRatio), píldora de páginas, arrastre
con ratón. Atajos: `+` `-` `0` (ajustar) `R` / `Shift+R` `I` `←` `→` `Esc`.
En móvil se ocultan imprimir y abrir fuera y los datos de la barra.

No se proyecta: en la proyección del templo la directiva va desactivada
(`[appViewableDisabled]="fullscreen()"` en la ficha de familia).

## Galería: la foto siempre entera (09/10/2026)

`.mv__img` ocupa el escenario entero (`position: absolute; inset: 0`) con
`object-fit: contain`. Antes era `max-width/max-height: 100%` dentro de una
celda de rejilla de alto `auto`: el porcentaje no se resolvía y, con
`sizes="100vw"`, una foto **vertical** (1080 × 1620) se pintaba a 1920 × 2880
en un escenario de ~810 px —sólo se veía su franja central (una pared)—; las
apaisadas también se recortaban por arriba y abajo. Los límites del
desplazamiento con zoom se calculan sobre la **foto pintada**
(`paintedSize()`), no sobre la caja. Y el doble clic sólo amplía si es
**sobre la foto**: dos clics rápidos en ‹ › también son un `dblclick` que
subía al escenario y abría la foto siguiente al 250 % (10/10/2026). El visor documental no lo sufría (limita
con `--cw`/`--ch` medidos).

## Dónde está puesto hoy

- **Crónicas de departamentos** (`stories`, `39-departments.md`): cada foto
  del mosaico abre la galería con todas las de la crónica.

- Fichas de **Rugăciune pentru familii**: abre la foto en el visor documental con
  todas las familias de la semana (‹ › entre ellas).
- Retrato del **perfil de la conducere**: se activa solo cuando haya foto real.
- **Índice de la conducere** (07/10/2026): toda foto real de las tarjetas
  (destacadas, conducerea, comité, vista por personas) se amplía al pulsarla,
  tenga la persona perfil o no. Cada bloque es una galería (`photoGallery`,
  `leadership.view.ts`): ‹ › pasa a las demás fotos del bloque. En las filas de
  3,2 rem se oculta el control flotante (no cabe); quedan la lupa y el foco.
