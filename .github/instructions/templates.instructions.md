---
applyTo: "src/app/**/*.html"
description: "Reglas para plantillas Angular de este repo (i18n, control de flujo, a11y)."
---

# Plantillas

- **Cero texto literal**: todo pasa por `{{ 'clave' | translate }}` o
  `[attr.aria-label]="'clave' | translate"`. Al añadir una clave, créala en
  `src/assets/i18n/es.json` **y** `ro.json`.
- Control de flujo nuevo: `@if` / `@for` / `@switch`. `@for` siempre con `track`
  por un id estable (nunca `$index` si hay id).
- `@defer` para contenido pesado no crítico (`on idle`, `on viewport(ref)`,
  `when cond`), **siempre** con un `@placeholder` que reserve altura (CLS).
- Accesibilidad obligatoria: `role` correcto, `aria-hidden="true"` en SVG
  decorativos, `aria-current` en el elemento "hoy", `aria-selected` en tabs.
- Enlaces externos: `target="_blank" rel="noopener noreferrer"`.
- Enlaces internos: `routerLink` con `APP_PATHS` / `blockPath()`. Nunca una URL
  literal como `/media/galerie`.
- Iconos de interfaz: `<app-icon name="…" />` (nombre del tipo `IconName`).
  Nada de SVG sueltos repetidos en plantillas.
- Clases nuevas con prefijo BEM propio del bloque (`.upcoming__item`), porque
  la hoja del escenario es global (`ViewEncapsulation.None` en `StageComponent`).
- No metas lógica en la plantilla: si necesitas un cálculo, hazlo `computed()`.

Contexto ampliado: `docs/ai/20-content-i18n.md`, `docs/ai/15-navigation.md` y
`docs/ai/45-design-system.md`.
