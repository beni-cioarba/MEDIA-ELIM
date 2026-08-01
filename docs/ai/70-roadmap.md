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

## Pendiente — prioridad alta

1. **Sin tests.** Karma/Jasmine está configurado pero no hay ni un `.spec.ts`.
   Candidatos de mayor valor (lógica pura, fácil de cubrir):
   - `ScheduleService`: filtrado de pasados, orden por día y hora, `hasUpcomingEvents`.
   - `PresentationBlocksService`: resolución `override ?? auto`, fallback a un
     bloque, persistencia.
   - `CarouselService`: recorte de índice al cambiar el conjunto de bloques.
   - `UiStore`: transiciones de drawer/grupo.
2. **Contenido real pendiente** en `church.config.ts`: `leadership` está con
   `members: []` y `foundedYear: 2000` sin confirmar. La UI ya contempla el
   estado «pendiente», pero es contenido visible.
3. **`stage.component.scss` sigue con ~2.100 líneas.** Conviene partirlo en
   parciales (`styles/_socials.scss`, `_streams.scss`, …). Movimiento mecánico
   pero de riesgo visual: hacerlo con la proyección delante.

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

- Bloque de anuncios editable sin desplegar (JSON en la rama de datos, igual
  que `youtube.json`).
- Programación horaria de bloques (ej. «Próximos eventos» sólo los domingos).
- Contador en vivo para el evento más cercano cuando falta menos de 24 h.
- Buscador global (rutas + eventos + predicaciones) con `MatAutocomplete`.
- Migas de pan en las páginas interiores.
