# 30 · Modo presentación

La web se proyecta en la pantalla del templo. Al pulsar **Presentar** (botón
del dock o tecla `F`) se entra a pantalla completa y el contenido pasa de
página larga a **carrusel de bloques** con el QR a la derecha.

> El botón de presentar **sólo aparece en `/media`** (panel completo), que es la
> única página pensada para proyectarse; en el resto sería un control sin
> destino. Lo decide `FloatingActionsComponent.canPresent()` comparando
> `NavActiveService.url()` con `APP_PATHS.media`. Se mantiene visible mientras
> la presentación esté activa para poder salir siempre.

## Piezas

| Pieza                           | Responsabilidad                                              |
| ------------------------------- | ------------------------------------------------------------ |
| `PresentationService`           | Fullscreen API nativa; si falla, modo *simulado* con la clase `is-simulated-fullscreen` en `<body>` |
| `PresentationBlocksService`     | Qué bloques entran en la rotación                             |
| `CarouselService`               | Slide activo, pausa, progreso, avance automático              |
| `PresentationSettingsComponent` | UI del selector de bloques (en `shared/`)                     |
| `StageComponent`                 | Escenario, atajos de teclado, QR, controles                   |
| `features/stage/blocks/*`        | Contenido de cada bloque                                      |

## Bloques proyectables

Definidos en `BLOCK_DEFS` (`core/services/presentation-blocks.service.ts`).
El orden del array **es** el orden del carrusel.

| id         | Componente             | Regla automática (¿hay contenido?)   |
| ---------- | ---------------------- | ------------------------------------ |
| `socials`  | `SocialsBlockComponent`  | `socials.length > 0`               |
| `streams`  | `StreamsBlockComponent`  | siempre                            |
| `gallery`  | `GalleryBlockComponent`  | `mediaEvents.length > 0`           |
| `weekly`   | `WeeklyBlockComponent`   | `weeklyProgram.length > 0`         |
| `upcoming` | `UpcomingBlockComponent` | `ScheduleService.hasUpcomingEvents()` |

`location` existe como bloque (`LocationBlockComponent`) pero **sólo se muestra
en la web pública**, no en la proyección.

## Selector de bloques (auto / manual)

Botón con icono de cuadrícula y contador `n/N` dentro de la barra de controles.
Cada bloque tiene tres estados:

- **Auto** (por defecto): se proyecta sólo si la regla automática dice que hay
  contenido. Caso principal: *Evenimente viitoare* desaparece solo cuando no
  queda ningún evento futuro.
- **Forzado ON**: se proyecta aunque esté vacío (para anunciar la sección).
- **Forzado OFF**: nunca se proyecta.

Resolución: `enabled = override ?? autoAvailable`.

Persistencia: `localStorage['iglesia-redes.presentation.blocks']`, sólo los
overrides manuales (`{"upcoming": true}`). El botón ↺ devuelve un bloque a auto;
«Restablecer automático» los devuelve todos.

Garantías:

- `activeBlockIds()` nunca devuelve lista vacía (fallback al primer bloque).
- La UI deshabilita el interruptor del último bloque activo.
- El filtro **sólo afecta a la proyección**: en la web pública se renderizan
  todos los bloques (`StageComponent.renderedBlocks`).

## Carrusel

- Avance automático cada `SLIDE_DURATION_MS` (12 s).
- El bucle `requestAnimationFrame` se arranca y se detiene desde un único
  `effect()` que observa: fullscreen, pausa, `ClockService.pageVisible` y número
  de bloques activos. Fuera de presentación **no corre nada**.
- `currentIndex` se recorta contra el número real de bloques activos, así que
  activar/desactivar bloques nunca deja el carrusel en un índice inválido.

## Atajos de teclado (`StageComponent.handleKey`)

| Tecla        | Acción                                     |
| ------------ | ------------------------------------------ |
| `F`          | Entrar / salir de presentación             |
| `Esc`        | Salir del modo simulado                    |
| `←` `→`      | Bloque anterior / siguiente                |
| `PageUp/Down`| Igual que las flechas                      |
| `Espacio`    | Pausar / reanudar                          |
| `1`…`9`      | Ir al bloque n-ésimo **de los activos**    |

Salvo `F` y `Esc`, sólo actúan en modo presentación. El panel de bloques hace
`stopPropagation()` mientras está abierto para no disparar estos atajos.

## Sistema de proyección (`features/stage/styles/_projection.scss`)

La pantalla del templo se lee desde 15-20 m: lo que importa no es la
resolución sino **qué fracción del lienzo ocupa cada letra**, como en una
diapositiva. Por eso en proyección no se usan `rem` ni `clamp()` con topes en
px, sino la **unidad de diapositiva**:

```
--pj-u = min(1vh, 0.5625vw)     → 1/100 del alto de un lienzo 16:9 encajado
```

| Pantalla    | 1u       | Qué manda                                 |
| ----------- | -------- | ----------------------------------------- |
| 1920×1080   | 10,8 px  | alto                                      |
| 3840×2160   | 21,6 px  | alto — misma imagen que en Full HD         |
| 1024×768    | 5,76 px  | ancho — lienzo 16:9 dentro del 4:3         |
| 2560×1080   | 10,8 px  | alto — lienzo centrado, márgenes laterales |

Escala (todas en `.stage.is-fullscreen`):

| Variable            | u    | Uso                                              |
| ------------------- | ---- | ------------------------------------------------ |
| `--pj-fs-eyebrow`   | 2,2  | etiquetas en versalitas («INSTAGRAM», «HOY»)      |
| `--pj-fs-caption`   | 2,5  | descripciones, leyenda del QR, versículo          |
| `--pj-fs-body`      | 2,9  | cuerpo de lectura (hora + título del programa)    |
| `--pj-fs-lead`      | 3,4  | destacado dentro de una tarjeta                   |
| `--pj-fs-title`     | 4,2  | título de la diapositiva (`pj-section-title`)     |
| `--pj-fs-hero`      | 4,8  | el dato clave: `@handle`, nombre del evento       |
| `--pj-fs-display`   | 7    | cifras y titulares de anuncio                     |
| `--pj-sp-1…6`       | 1…6  | espaciado · `--pj-r`, `--pj-r-sm` radios · `--pj-stroke` trazo ≥ 1px · `--pj-icon`, `--pj-icon-sm` |

Criterio: ~1 cm de altura de letra por cada 3-4 m de distancia ⇒ nada
secundario por debajo de 2,5u y el dato clave en 4,4-5u.

Reglas fijas del lienzo proyectado:

- **Área segura** (`padding` 3u × 6u) frente al overscan de TV/proyector y
  lienzo 16:9 centrado en pantallas más anchas (`--pj-canvas-w`).
- **Fondo plano**: halos y grano ocultos (bandas y suciedad en proyector).
- **Título anclado arriba** en todos los bloques, con el mismo cuerpo y una
  regla dorada corta (`@include pj-section-title`). Los subtítulos se ocultan.
- **Colores neutros**: superficies blancas, texto carbón/`--c-muted`, marca
  navy. Oro sólo como acento; rojo `--c-live` sólo para «en directo» / «hoy».
- **Sin chrome**: flecha de las tarjetas, botones de compartir y dock
  flotante ocultos (el dock y la barra reaparecen al acercar el ratón).
- **Sin movimiento propio**: el resaltado rotatorio de redes sólo existe en
  la web pública; el único movimiento es el cambio de diapositiva.
- **Tres emisiones** en «Transmisiones» (`PROJECTED_STREAMS`), en lista
  vertical con miniatura + título a cuerpo de lectura.

## Receta — añadir un bloque proyectable nuevo (anuncios, avisos…)

1. `features/stage/blocks/<nombre>-block/` con componente standalone + OnPush y
   `styles: [':host { display: contents; }']` (para no romper el layout flex/grid
   del `.slide` padre).
2. Añade el id al tipo `PresentationBlockId` y una entrada en `BLOCK_DEFS`
   (con `titleKey` i18n) en la posición deseada del carrusel.
3. Añade su regla automática en `autoAvailability` (`true` si siempre aplica).
4. Registra el componente en `StageComponent.imports` y añade su `@case` en el
   `@switch` de `stage.component.html`.
5. Estilos de la web pública: sección nueva en `stage.component.scss` con
   prefijo BEM propio (`.<nombre>__…`) — ver `docs/ai/40-styling.md`.
6. Estilos de proyección: sección nueva dentro de `stage-projection` en
   `styles/_projection.scss`, **sólo** con variables `--pj-*`: el bloque ocupa
   `height: 100%`, es `flex-direction: column`, su `__title` incluye
   `pj-section-title` y el cuerpo crece con `flex: 1 1 auto; min-height: 0`.
7. Claves i18n en `es.json` y `ro.json`.

## QR

`shared/qr-panel`, cargado con `@defer (on idle)`. Codifica siempre
`config.publicUrl` (no la URL del navegador) para que apunte a producción
aunque se esté proyectando desde `localhost`.

- Corrección de errores **`M`**, no `H`: en pantalla no hay roturas que
  corregir y `H` sólo añade módulos (41×41 → 33×33 con esta URL). A igual
  tamaño, módulos un 24 % mayores = se escanea desde más lejos.
- El componente está encapsulado: la proyección lo escala por variables
  (`--qr-frame-pad`, `--qr-frame-radius`, `--qr-gap`, `--qr-caption-size`,
  `--qr-caption-weight`, `--qr-caption-color`), fijadas en `.stage.is-fullscreen .qr`.
