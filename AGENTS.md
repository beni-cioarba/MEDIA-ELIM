# AGENTS.md

Punto de entrada para agentes de IA que trabajan en este repositorio.
Es intencionadamente corto: **la documentación real está fragmentada en
`docs/ai/` para que sólo cargues lo que necesites**.

## Qué es este proyecto

Angular 22 (standalone + signals, Material M3) · web pública de la Iglesia Elim Arganda que
también actúa como diapositiva proyectable en el templo (pantalla completa,
carrusel de bloques, QR, ES/RO). Sin backend: todo es estático + GitHub Pages.

## Regla que manda sobre todas las demás: el diseño no está cerrado

**La guía de estilos (`/stil`, `47-design-language.md`, catálogo `ui-*`) NO es
vinculante por defecto.** La app está en construcción y lo que hay en ella no
es el diseño final: describe *lo que hay hoy*, no *lo que debe haber*.

**Se sigue la guía sólo cuando el usuario lo pide expresamente** en esa tarea
(«sigue la guía», «usa las primitivas», «como el resto de la app»). Mientras no
lo diga, se actúa como **diseñador experto** y se decide caso por caso.

### Cómo se decide entonces (esto sí es obligatorio siempre)

1. **Medir antes de opinar.** Si hay una referencia sobre la mesa —una URL, una
   captura, un producto— se abre, se mide con `getComputedStyle` y se
   reproduce. Si no la hay, se miden los valores actuales de la app antes de
   proponer un cambio. Nada de «se ve pequeño»: cuánto mide, y cuánto debería.
2. **Buscar la solución más práctica y profesional, y sólo entonces aplicarla.**
   Primero el análisis y las alternativas, después el código. Un cambio a medias
   es peor que ninguno.
3. **La mejor arquitectura para el caso**, no la más cercana a lo que ya hay:
   si el patrón correcto pide cambiar el mecanismo (de `mat-menu` a un panel,
   de una lista a una rejilla, de píxeles fijos a una medida derivada), se
   cambia el mecanismo.
4. **Los estilos que pida el caso**, no los que estén a mano. El objetivo es
   que *esa* pieza se vea lo más profesional posible, aunque sus valores no
   salgan del catálogo. Lo nuevo se documenta en su propio shard (como
   `48-carousel-cards.md`), no se mete a la fuerza en el catálogo existente.
5. **Comprimido siempre que se pueda.** Densidad por columnas alineadas y
   jerarquía, no por letra pequeña. El aire que no separa ideas, sobra.
6. **Pensado para crecer.** Van a entrar muchos módulos: una solución que
   funcione con los datos de hoy pero se rompa con el doble, no vale. Medidas
   derivadas antes que fijas, rejillas antes que anchos a mano, datos antes que
   marcado repetido.

### Lo que no se negocia aunque no se siga la guía

La **marca** (navy y oro), la **accesibilidad** (contraste, foco,
`prefers-reduced-motion`, WCAG) y el **responsive al 100 %**.

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
| `docs/ai/30-presentation.md` | Fullscreen, carrusel, bloques a proyectar, atajos, QR, escala `--pj-u` |
| `docs/ai/35-announcements.md`| **Anunțuri**: modelo, vigencia, límites de proyección, protocolo de redacción |
| `docs/ai/40-styling.md`      | SCSS del escenario, responsive, encapsulación              |
| `docs/ai/45-design-system.md`| Tokens, tema, Angular Material, iconos, tipografía         |
| `docs/ai/47-design-language.md` | **Lenguaje visual**: superficies (web / consola / proyección), decisiones y catálogo `ui-*`. Referencia viva: `/stil` |
| `docs/ai/48-carousel-cards.md` | **Escaparate (línea nueva)**: carruseles y tarjetas de promoción, calcados de la referencia medida. Manda sobre el catálogo dentro de un carrusel |
| `docs/ai/50-build-deploy.md` | Build, PWA, GitHub Actions, scripts de datos e imágenes    |
| `docs/ai/60-conventions.md`  | Convenciones y recetas paso a paso                         |
| `docs/ai/70-roadmap.md`      | Deuda técnica y mejoras pendientes                         |
| `docs/ai/75-plan-evolucion.md` | **Plan por fases**: carga rápida, proyección legible, web compacta, arquitectura modular, Angular 20/zoneless, CI. Leer antes de empezar cualquier fase |

Instrucciones automáticas por tipo de fichero (se aplican solas al editar):
`.github/instructions/*.instructions.md`.

Reglas globales y comandos: `.github/copilot-instructions.md`.
