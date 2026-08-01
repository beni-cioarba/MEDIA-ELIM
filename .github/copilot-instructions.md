# Copilot · Instrucciones del repositorio

App Angular 17 (standalone + signals) de la **Iglesia Elim Arganda**: una web
pública que además funciona como **diapositiva proyectable** en el templo
(modo presentación a pantalla completa con carrusel de bloques y QR).

## Regla nº 1 — no re-analices el proyecto

La estructura ya está documentada en `docs/ai/`. **Antes de explorar el
repositorio, lee el shard que corresponda a tu tarea** (y sólo ese).

| Si la tarea trata de…                                              | Lee                        |
| ------------------------------------------------------------------ | -------------------------- |
| Ubicar algo / visión general / no sé por dónde empezar              | `docs/ai/00-index.md`      |
| Arquitectura, rutas, servicios, flujo de datos, añadir una feature  | `docs/ai/10-architecture.md` |
| Menú, navegación, layout, URLs con nombre, enlaces profundos        | `docs/ai/15-navigation.md` |
| Estado compartido, signals, SignalStore, logs                       | `docs/ai/16-state.md`      |
| Contenido: eventos, redes, programa semanal, textos, idiomas        | `docs/ai/20-content-i18n.md` |
| Modo presentación, carrusel, bloques a proyectar, atajos, QR        | `docs/ai/30-presentation.md` |
| Estilos del escenario, responsive, encapsulación                    | `docs/ai/40-styling.md`    |
| Tokens, tema, Angular Material, iconos, tipografía                  | `docs/ai/45-design-system.md` |
| Build, despliegue, PWA, GitHub Actions, scripts de imágenes/YouTube | `docs/ai/50-build-deploy.md` |
| Convenciones de código y recetas paso a paso                        | `docs/ai/60-conventions.md` |
| Deuda técnica conocida y mejoras pendientes                          | `docs/ai/70-roadmap.md`    |

Reglas de uso:

- Lee **un** shard, actúa, y sólo abre otro si el primero te remite a él.
- No hagas búsquedas semánticas globales para preguntas ya cubiertas arriba.
- Si cambias arquitectura, contenido o presentación, **actualiza el shard**
  afectado en el mismo cambio.

## Postura por defecto

Estas dos reglas se cargan solas (`.github/instructions/`) sólo cuando el
fichero que tocas encaja con su `applyTo`, así que **no hace falta repetirlas
en cada prompt**:

- `design-posture.instructions.md` (`*.scss`, plantillas): actúa como
  **diseñador de producto sénior** — tema único azul/dorado, diseño compacto,
  jerarquía explícita, estados completos y accesibilidad.
- `engineering-posture.instructions.md` (`src/app/**/*.ts`, `scripts/`): actúa
  como **programador sénior** — analiza antes de escribir, deriva en vez de
  duplicar, y elige la solución más eficiente y escalable.

## Reglas duras

- Angular 17 **standalone**, sin `NgModule`. Siempre `ChangeDetectionStrategy.OnPush`.
- Estado con **signals** (`signal` / `computed` / `effect`), no `BehaviorSubject`.
- Datos no traducibles → `src/app/core/church.config.ts`. Textos → `src/assets/i18n/{es,ro}.json`.
  **Las dos claves deben existir en ambos idiomas.**
- Nada de texto literal en plantillas: siempre `| translate`.
- Rutas nuevas → `src/app/app.routes.ts`, siempre con `loadComponent`,
  colgando de `MainLayoutComponent` y con `data.seo`. El segmento se declara
  en `core/navigation/app-paths.ts`; el menú, en `navigation.config.ts`.
- Estilos: los componentes sólo consumen variables semánticas
  (`var(--c-*)`, `var(--sp-*)`…) tras `@use 'ds' as *`. Prohibido escribir
  colores, píxeles o breakpoints en crudo.
- Angular Material: al importar un `MatXModule` hay que añadir
  `@include mat.x-theme($elim-theme);` en `src/styles/_theme.scss`, y quitarlo
  si se deja de usar. Nunca `mat.all-component-themes`.
- Iconos de interfaz: `<app-icon name="…">` con un `IconName` del tipo unión.
- Estado: local → `signal()`; compartido simple → servicio con signals;
  compartido complejo → SignalStore en `core/state/`. Nada de `console.*`:
  usa `LoggerService.prefix('ámbito')`.
- Lo que no se ve en el primer pintado va con `@defer`, y siempre con
  `@placeholder` que reserve altura para no provocar CLS.
- TypeScript está en `strict` + `strictTemplates`: no uses `any` ni `!` salvo
  justificación en comentario.
- No introduzcas librerías nuevas sin necesidad: el bundle inicial se descarga
  en la pantalla de la iglesia (presupuesto: 500 kB warning / 1 MB error).
- Comentarios y documentación **en español**; el código en inglés.

## Comandos

```bash
npm start                 # ng serve
npm run build             # producción
npm test                  # Karma/Jasmine (aún sin specs)
npm run pwa:icons         # regenera iconos PWA desde el logo
node scripts/optimize-images.js   # webp hero+thumb para la galería
```
