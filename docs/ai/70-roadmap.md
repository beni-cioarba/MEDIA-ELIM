# 70 · Auditoría y deuda técnica

Estado tras la reestructuración de navegación + design system.

## Ya resuelto

### Iteración 1 — presentación

- Router montado con carga diferida → el escenario salió del bundle inicial.
- Escenario reducido a orquestación; cinco bloques extraídos a componentes.
- Lógica temporal centralizada en `ClockService` + `ScheduleService`.
- Carrusel movido a `CarouselService` (`effect()` en vez de `setInterval`).
- Control de **bloques a presentar** con modo auto/manual persistido.
- Documentación para IA fragmentada en `docs/ai/` + instrucciones por glob.

### Iteración 2 — web pública, navegación y design system

- `features/home` (escenario) renombrada a `features/stage`; `home` es ahora la
  **portada pública**.
- `MainLayoutComponent` + `TopNavComponent` + `MobileNavComponent`: shell
  reutilizable con menú de escritorio (`mat-menu`) y drawer móvil diferido.
- Rutas con nombre (`APP_PATHS`) y enlaces profundos por bloque
  (`/media/:blockId`), con SEO por ruta (`data.seo` + `AppTitleStrategy`).
- Páginas nuevas: portada con carrusel, «Quiénes somos» y «Liderazgo».
- **Design system en tres capas** (`src/styles/`): primitivas → semántica →
  componente, con mixins de breakpoints, foco y superficies.
- **Angular Material 17** con tema M2 propio (navy + dorado), emitiendo sólo el
  tema de los componentes en uso.
- Iconos: SVG inline registrados en `MatIconRegistry` (`provideElimIcons()`),
  tipados con `IconName`; Material Symbols como fuente secundaria no bloqueante.
- `UiStore` con `@ngrx/signals` para el estado de la interfaz.
- `LoggerService` con ámbito, cableado en `YouTubeService` y `CalendarService`.
- Logotipo web pasado a WebP de 384 px: **423 kB → 9 kB**.

### Iteración 3 — proyección legible a distancia

- **Sistema de proyección** propio (`features/stage/styles/_projection.scss`):
  unidad de diapositiva `--pj-u` y escala `--pj-fs-*` proporcional al lienzo,
  como una diapositiva; misma imagen en XGA, Full HD y 4K.
- Panel de medios **neutro**: tarjetas blancas con icono navy, sin gradientes
  de red, sin halos animados ni resaltado rotatorio en proyección; título
  anclado arriba en todas las diapositivas; dock y controles ocultos hasta
  acercar el ratón.
- Jerarquía de redes para el templo: red en versalitas → **@handle** a 4,8u →
  descripción. QR con corrección `M` (módulos un 24 % mayores).
- Primer paso del troceado de `stage.component.scss`: la proyección y el
  responsive salen a parciales-mixin incluidos al final (arregla, además, que
  Sass emitiera sus reglas antes de las base y quedaran pisadas).

### Iteración 4 — anuncios y control del lienzo

- **Anunțuri** (`docs/ai/35-announcements.md`): modelo estructurado en
  `church.config.ts` con caducidad, servicio de vigencia, página `/anunturi`
  (+ enlace propio por anuncio) y **una diapositiva por anuncio** al principio
  del carrusel. Un solo renderizador para web y proyección, con autoajuste
  (`appFitToBox`) para que siempre quepa, con o sin QR.
- Modelo de **diapositivas** (`PresentationSlide`) separado del de bloques;
  «Próximos eventos» paginado (2 por diapositiva) para que nada se corte.
- **QR configurable**: mostrar/ocultar (tecla `Q`) y tamaño S/M/L
  (`PresentationDisplayService`); sin QR los bloques se recolocan.
- **Ritmo y selección**: duración por bloque editable desde el panel (anuncios
  30 s por defecto) y casilla por anuncio para dejar fuera el que no toque.
- Tarjeta de anuncio rediseñada (ficha de fecha, columnas editoriales, tipos
  de sección `prices`/`people`/`schedule`, banda de cierre).
- **Citirea Bibliei**: bloque proyectable con la semana del plan de lectura
  que toca (la que contiene mañana), datos generados desde el Excel de la
  iglesia por `scripts/import-bible-plan.py`.

## Pendiente — prioridad alta

1. **Sin tests.** Karma/Jasmine está configurado pero no hay ni un `.spec.ts`.
   Candidatos de mayor valor (lógica pura, fácil de cubrir):
   - `ScheduleService`: filtrado de pasados, orden por día y hora, `hasUpcomingEvents`.
   - `PresentationBlocksService`: resolución `override ?? auto`, fallback a un
     bloque, persistencia.
   - `CarouselService`: recorte de índice al cambiar el conjunto de bloques.
   - `UiStore`: transiciones de drawer/grupo.
2. **Contenido real pendiente** en `church.config.ts`: `foundedYear: 2000` sigue
   sin confirmar. El organigrama ya está completo en `leadership.config.ts`.
3. **`stage.component.scss` sigue con ~1.750 líneas.** La proyección y el
   responsive ya viven en parciales-mixin; falta partir los bloques
   (`styles/_socials.scss`, `_streams.scss`, …) con el mismo patrón.
   Movimiento mecánico pero de riesgo visual: hacerlo con la proyección delante.

## Pendiente — prioridad media

4. **`angularx-qrcode` arrastra `qrcode` (CommonJS)** y provoca un bailout de
   optimización. Ya está aislado en un chunk `@defer`; evaluar alternativa ESM.
5. **`npm test` no tiene CI**: añadir un job de build+test a los workflows.
6. **SEO estructurado**: `sitemap.xml`, `robots.txt` y JSON-LD (`Church`,
   `Event`) ahora que hay varias rutas indexables.
7. **Imágenes responsive**: la galería y el hero sirven una sola resolución.
   `ngSrcset` + `sizes` reduciría bastante en móvil.

## Pendiente — prioridad baja

8. Rotación manual de la clave de YouTube (hoy restringida por referrer).
9. Analítica sin cookies (ej. Plausible autoalojado) para saber qué se usa.
10. Tests e2e de humo (Playwright) sobre las rutas y el modo presentación.

## Ideas de producto

Ordenadas por relación valor/esfuerzo:

| Idea                                    | Valor | Esfuerzo | Notas                                        |
| --------------------------------------- | ----- | -------- | -------------------------------------------- |
| Biblioteca de predicaciones con buscador| Alto  | Medio    | Reutiliza `YouTubeService`; filtrar por fecha/predicador |
| Peticiones de oración                   | Alto  | Bajo     | `mailto:` o formulario sin backend (Formspree) |
| Calendario mensual completo             | Alto  | Medio    | Ya existe `CalendarService` para el `.ics`   |
| Página de contacto con formulario       | Medio | Bajo     | Hoy sólo hay ubicación                       |
| Donativos / ofrendas                    | Medio | Bajo     | Datos bancarios + Bizum, sin pasarela        |
| Grupos pequeños / células               | Medio | Medio    | Mapa por barrios                             |
| Bautismo y membresía (pasos a seguir)   | Medio | Bajo     | Contenido estático, mucho valor pastoral     |
| Noticias / blog                         | Medio | Alto     | Requiere flujo de edición sin desplegar      |
| Testimonios                             | Medio | Bajo     | Texto + foto en `church.config.ts`           |
| Recursos descargables                   | Bajo  | Bajo     | PDFs en `assets/`                            |
| Escuela dominical (material por edades) | Bajo  | Medio    |                                              |
| Misiones (proyectos apoyados)           | Bajo  | Bajo     |                                              |
| Área privada de miembros                | Bajo  | Alto     | Rompe el «sin backend»: valorar bien         |

Mejoras sobre lo existente:

- Anuncios editables **sin desplegar** (JSON en la rama de datos, igual que
  `youtube.json`): el modelo `Announcement` ya existe; faltaría cargarlo desde
  un JSON externo en vez de `church.config.ts`.
- Avance de los anuncios vigentes en la portada (`home`), enlazando a
  `/anunturi`.
- Programación horaria de bloques (ej. «Próximos eventos» sólo los domingos).
- Contador en vivo para el evento más cercano cuando falta menos de 24 h.
- Buscador global (rutas + eventos + predicaciones) con `MatAutocomplete`.
- Migas de pan en las páginas interiores.
