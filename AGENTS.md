# AGENTS.md

Punto de entrada para agentes de IA que trabajan en este repositorio.
Es intencionadamente corto: **la documentación real está fragmentada en
`docs/ai/` para que sólo cargues lo que necesites**.

## Qué es este proyecto

Angular 17 (standalone + signals) · web pública de la Iglesia Elim Arganda que
también actúa como diapositiva proyectable en el templo (pantalla completa,
carrusel de bloques, QR, ES/RO). Sin backend: todo es estático + GitHub Pages.

## Cómo trabajar aquí (protocolo de contexto)

1. Lee `docs/ai/00-index.md` — es el mapa y cuesta muy poco.
2. Abre **sólo** el shard que cubra tu tarea.
3. Actúa. No explores el árbol completo ni releas ficheros grandes
   (`home.component.scss` tiene ~2.100 líneas: consulta `docs/ai/40-styling.md`
   antes de abrirlo).
4. Si tu cambio altera arquitectura, contenido o presentación, actualiza el
   shard correspondiente en el mismo commit.

| Shard                        | Cuándo                                                    |
| ---------------------------- | --------------------------------------------------------- |
| `docs/ai/00-index.md`        | Mapa del repo y dónde vive cada cosa                       |
| `docs/ai/10-architecture.md` | Rutas, servicios core, flujo de datos, añadir features     |
| `docs/ai/15-navigation.md`   | Menú, rutas con nombre, layout, enlaces profundos          |
| `docs/ai/16-state.md`        | Signals, servicios con estado y SignalStore                |
| `docs/ai/20-content-i18n.md` | Eventos, redes, programa semanal, traducciones             |
| `docs/ai/30-presentation.md` | Fullscreen, carrusel, bloques a proyectar, atajos, QR      |
| `docs/ai/40-styling.md`      | SCSS del escenario, responsive, encapsulación              |
| `docs/ai/45-design-system.md`| Tokens, tema, Angular Material, iconos, tipografía         |
| `docs/ai/50-build-deploy.md` | Build, PWA, GitHub Actions, scripts de datos e imágenes    |
| `docs/ai/60-conventions.md`  | Convenciones y recetas paso a paso                         |
| `docs/ai/70-roadmap.md`      | Deuda técnica y mejoras pendientes                         |

Instrucciones automáticas por tipo de fichero (se aplican solas al editar):
`.github/instructions/*.instructions.md`.

Reglas globales y comandos: `.github/copilot-instructions.md`.
