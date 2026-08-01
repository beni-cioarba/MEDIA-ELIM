---
applyTo: "src/app/**/*.ts"
description: "Convenciones de código Angular 17 (standalone + signals) de este repo."
---

# Código TypeScript / Angular

- `standalone: true` + `ChangeDetectionStrategy.OnPush` en **todos** los componentes.
  Nada de `NgModule`.
- Inyección con `inject()` en campos `readonly`; no uses parámetros de constructor.
- Estado: `signal()` / `computed()` / `effect()`. Nada de `BehaviorSubject`.
  Expón sólo lectura con `asReadonly()`.
- **Los cálculos derivados van en servicios de `core/services/`**, no en componentes.
  Los componentes consumen, no calculan.
- Temporizadores: guarda con `ClockService.pageVisible` (no leas `document.hidden`)
  y limpia con `inject(DestroyRef).onDestroy(...)`.
- Cadencias y umbrales en constantes nombradas a nivel de módulo
  (`const X_MS = 4_000;`), nunca números mágicos en el cuerpo.
- `strict` + `strictTemplates`: prohibido `any` y `!` sin comentario justificativo.
- `localStorage` siempre en `try/catch`, con clave prefijada `iglesia-redes.`.
- Rutas nuevas en `src/app/app.routes.ts` y **siempre** con `loadComponent`,
  colgando de `MainLayoutComponent` y con `data.seo`.
- Estado compartido: servicio con signals si es simple; SignalStore de
  `@ngrx/signals` en `core/state/` si tiene reglas. Ver `docs/ai/16-state.md`.
- Nada de `console.*`: `inject(LoggerService).prefix('ámbito')`.
- Nada de dependencias nuevas sin justificar el coste en el bundle: la pantalla
  del templo descarga el bundle inicial en cada arranque.
- Identificadores en inglés; comentarios y JSDoc en español.

Contexto ampliado: `docs/ai/10-architecture.md`, `docs/ai/15-navigation.md`,
`docs/ai/16-state.md` y `docs/ai/60-conventions.md`.
