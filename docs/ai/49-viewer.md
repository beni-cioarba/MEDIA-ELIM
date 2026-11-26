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

**Zoom directo (26/11/2026)**, como en la galería; antes sólo había botones y
atajos. Los motores lo piden con `zoomTo` y el shell lo aplica (`setZoom`, mismo
tope 25–400 % de `core/zoom.ts`; cerca de 100 vuelve a «Ajustat»):

| | Imagen | PDF |
| --- | --- | --- |
| Rueda | ±20 % por muesca, en el punto del cursor | desplaza las páginas (como cualquier lector) |
| Ctrl + rueda / pellizco del panel táctil | proporcional al gesto | ±10 % por muesca o proporcional, en el punto del cursor |
| Doble clic | 250 % en ese punto; ampliada, vuelve a ajustar | — (seleccionaría texto) |
| Pellizco con dos dedos | sí (`touch-action: none` en el lienzo) | el del navegador |

El punto queda quieto: en la imagen, con el desplazamiento (`tx`, `ty`) que se
recalcula a los límites al llegar la nueva escala; en el PDF, sobre la página
bajo el cursor (fracción de su ancho y alto), no sobre el área, porque las
páginas van centradas con márgenes fijos. Una ráfaga de eventos (panel táctil)
lee el último zoom **pedido** (`requested`), no la entrada, que llega un ciclo
tarde: sin eso se perdían pasos. Ctrl + rueda siempre se intercepta: si no,
ampliaba la página entera del navegador.

No se proyecta: en la proyección del templo la directiva va desactivada
(`[appViewableDisabled]="fullscreen()"` en la ficha de familia).

## Galería con vídeo (19/11/2026)

La galería admite **vídeo** además de imagen y PDF (`kind()` = `video` si
`resolveCategory` lo dice: `mimeType: 'video/mp4'` o extensión). Se pinta el
reproductor nativo entero (`object-fit: contain` sobre negro), arranca solo,
`playsinline`, póster = `thumb`; sin zoom ni gestos (los manejadores de
puntero sólo actúan con imagen). Primer uso: la crónica de la tabără (`StoryPhoto.video`).

**Autorreproducción con vídeo (26/11/2026).** El ▶ de la barra sale también en
los vídeos y cada elemento pasa al siguiente cuando *termina*:

| Elemento | Cuándo avanza | Segmento de la barra |
| --- | --- | --- |
| Imagen | 4 s (`AUTOPLAY_MS`) **desde que se ha pintado**, no desde que se pidió | animación CSS de 4 s (`--playing`) |
| Vídeo | al acabar (`ended`), dure lo que dure | sigue al vídeo: `--mv-fill` = `currentTime / duration` (`--media`) |
| Fallo de carga (imagen o vídeo) | 4 s, para no atascarse | animación de 4 s |
| PDF | no avanza: no tiene final; se pasa a mano | — |

Si el vídeo se pausa a mano, la galería espera (no hay `ended`). Encender el ▶
sobre un vídeo ya terminado pasa al siguiente en el acto. Con zoom tampoco
avanza. Señales: `playing()` (puede avanzar), `timed()` (va por plazo),
`mediaProgress()`.

**Arranque de un vídeo**: `ViewerDocument.start` recorta (lo anterior no se ve
nunca: `clampStart`); `from` sólo dice por dónde empezar esta vez (p. ej. el
reel de una crónica que ya se venía viendo en la página). La galería usa
`#t=max(from, start)` (`videoSrc()`).

**Vídeo sin zoom (26/11/2026)**: el escenario llevaba la lupa (`zoom-in`) también
sobre los vídeos, y `+` los «ampliaba» (sólo se pinta en la foto) parando la
autorreproducción. Se descartó ampliar vídeo: escalar el `<video>` escala
también sus controles nativos, el arrastre para desplazarse choca con la barra
de tiempo, y son 720 p (ampliados se ven borrosos). Ahora `mv__stage--video`
pone cursor normal y los atajos de zoom sólo actúan con imagen.

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

## Regla: toda foto de contenido se amplía (26/10/2026)

Petición expresa del usuario: **cualquier foto que la web enseña como contenido
se abre en el visor**. Al añadir una imagen nueva, lleva `[appViewable]` en su
contenedor (con `srcset` para que el visor pida la mayor). Excepciones, porque
su clic ya hace otra cosa: imágenes dentro de un enlace o de una tarjeta
enlazada (mosaico de departamentos, carteles de la portada, álbumes que abren
Drive, miniaturas de YouTube, avatares que llevan al perfil), el carrusel de
portada, logotipos, iconos y fondos decorativos (`aria-hidden`). Y nunca en la
proyección (`[appViewableDisabled]`).

## «Atrás» cierra el visor (25/11/2026)

`LazyOverlay` se cierra con `popstate`: la capa cuelga de `<body>` y se quedaba
encima de la página anterior (atajo, botón del ratón o gesto).

## Dónde está puesto hoy

- **Cine suntem** (`/despre-noi`): la foto de «Povestea noastră».
- **Botezuri**: la portada del botez destacado (próximo o último), si tiene foto.
- **Crónicas de departamentos** (`stories`, `39-departments.md`): cada foto
  del mosaico abre la galería con todas las de la crónica.
- **Masa de tineret** (`youth-meal`, `39-departments.md`): cada foto abre la
  galería con todas.

- Fichas de **Rugăciune pentru familii**: abre la foto en el visor documental con
  todas las familias de la semana (‹ › entre ellas).
- Retrato del **perfil de la conducere**: se activa solo cuando haya foto real.
- **Índice de la conducere** (07/10/2026): toda foto real de las tarjetas
  (destacadas, conducerea, comité, vista por personas) se amplía al pulsarla,
  tenga la persona perfil o no. Cada bloque es una galería (`photoGallery`,
  `leadership.view.ts`): ‹ › pasa a las demás fotos del bloque. En las filas de
  3,2 rem se oculta el control flotante (no cabe); quedan la lupa y el foco.
