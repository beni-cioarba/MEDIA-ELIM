# Copilot · Instrucciones del repositorio

App Angular 22 (standalone + signals, Material M3) de la **Iglesia Elim Arganda**: una web
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
| **Anuncios** (añadir, redactar, retirar; cómo se proyectan)          | `docs/ai/35-announcements.md` |
| Estilos del escenario, responsive, encapsulación                    | `docs/ai/40-styling.md`    |
| Tokens, tema, Angular Material, iconos, tipografía                  | `docs/ai/45-design-system.md` |
| Build, despliegue, PWA, GitHub Actions, scripts de imágenes/YouTube | `docs/ai/50-build-deploy.md` |
| Convenciones de código y recetas paso a paso                        | `docs/ai/60-conventions.md` |
| Deuda técnica conocida y mejoras pendientes                          | `docs/ai/70-roadmap.md`    |
| **Plan vigente** (auditoría nov. 2026 y fases)                       | `docs/ai/76-plan-maestro.md` |

La tabla completa de shards (módulos 32-39, diseño 47-49) está en `AGENTS.md`:
es la que manda.

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

- Angular 22 **standalone** (por defecto, sin `standalone: true`), sin `NgModule`. Siempre `ChangeDetectionStrategy.OnPush`.
- Estado con **signals** (`signal` / `computed` / `effect`), no `BehaviorSubject`.
- Datos no traducibles → `src/app/core/church.config.ts` (identidad y tipos) y
  `src/app/core/content/*.content.ts` (anuncios, eventos, programa, galería, fotos).
  Textos → `src/assets/i18n/{es,ro}.json`; los de una sola página, en su paquete
  (`core/i18n/route-packs.ts`).
  **Las dos claves deben existir en ambos idiomas.**
- Un **anuncio** nuevo es un objeto `Announcement` en
  `core/content/announcements.content.ts` con `expiresOn` obligatorio; **nunca** una plantilla o un
  componente a medida. Redáctalo siguiendo el protocolo de
  `docs/ai/35-announcements.md` (corregir, estructurar, acortar, caducidad).
- Nada de texto literal en plantillas: siempre `| translate`.
- Páginas nuevas → `node scripts/new-module.mjs <id>` (módulo con
  `<x>.pages.ts` + `<x>.routes.ts`, una línea en `app.routes.ts`). El segmento
  en `core/navigation/app-paths.ts`; el menú, en `navigation.config.ts`. Una
  feature sólo importa la carpeta `public/` de otra.
- Estilos: los componentes sólo consumen variables semánticas
  (`var(--c-*)`, `var(--sp-*)`…) tras `@use 'ds' as *`. Prohibido escribir
  colores, píxeles o breakpoints en crudo.
- Angular Material: tema **M3** único (`mat.theme()` en
  `src/styles/_theme.scss`); no hay que registrar el tema de cada componente.
  Material se importa **donde se usa** (chunks perezosos), nunca en el layout.
- Iconos de interfaz: `<app-icon name="…">` con un `IconName` del tipo unión.
- Estado: local → `signal()`; compartido simple → servicio con signals;
  compartido complejo → SignalStore en `core/state/`. Nada de `console.*`:
  usa `LoggerService.prefix('ámbito')`.
- Lo que no se ve en el primer pintado va con `@defer`, y siempre con
  `@placeholder` que reserve altura para no provocar CLS.
- TypeScript está en `strict` + `strictTemplates`: no uses `any` ni `!` salvo
  justificación en comentario.
- No introduzcas librerías nuevas sin necesidad: el bundle inicial se descarga
  en la pantalla de la iglesia (presupuesto: 600 kB warning / 620 kB error).
- Comentarios y documentación **en español**; el código en inglés.

## Comandos

```bash
npm start                 # ng serve
npm run build             # producción
npm test                  # Vitest, en modo observación
npm run check             # i18n + proyección + Drive + tests de scripts + tests unitarios (puertas de calidad; prebuild y CI)
npm run pwa:icons         # regenera el icono de la app (PWA, Apple, favicon) desde el emblema
node scripts/optimize-images.js   # webp hero+thumb para la galería
python scripts/import-bible-plan.py <xlsx>   # regenera el plan de lectura bíblica desde el Excel
```
