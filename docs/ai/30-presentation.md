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

## Receta — añadir un bloque proyectable nuevo

1. `features/stage/blocks/<nombre>-block/` con componente standalone + OnPush y
   `styles: [':host { display: contents; }']` (para no romper el layout flex/grid
   del `.slide` padre).
2. Añade el id al tipo `PresentationBlockId` y una entrada en `BLOCK_DEFS`
   (con `titleKey` i18n) en la posición deseada del carrusel.
3. Añade su regla automática en `autoAvailability` (`true` si siempre aplica).
4. Registra el componente en `StageComponent.imports` y añade su `@case` en el
   `@switch` de `stage.component.html`.
5. Estilos: sección nueva en `stage.component.scss` con prefijo BEM propio
   (`.<nombre>__…`) — ver `docs/ai/40-styling.md`.
6. Claves i18n en `es.json` y `ro.json`.

## QR

`shared/qr-panel`, cargado con `@defer (on idle)`. Codifica siempre
`config.publicUrl` (no la URL del navegador) para que apunte a producción
aunque se esté proyectando desde `localhost`.
