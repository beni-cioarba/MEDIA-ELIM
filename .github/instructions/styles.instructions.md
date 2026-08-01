---
applyTo: "**/*.scss"
description: "Reglas de estilos: capas del design system, tokens, BEM global, responsive y proyección."
---

# Estilos SCSS

## Capas (regla nº 1)

```
_tokens.scss (Sass, primitivas) → _semantic.scss (variables CSS) → componente
```

- En cualquier hoja de componente: `@use 'ds' as *;` (barril de
  `src/styles/_ds.scss`; no emite CSS, es seguro importarlo siempre).
- El componente consume **sólo variables semánticas**: `var(--c-text)`,
  `var(--sp-4)`, `var(--r-md)`, `var(--e-2)`, `var(--fs-h2)`, `var(--z-nav)`,
  `var(--mo-fast)`, `var(--ea-standard)`.
- **Prohibido** en un componente: colores hex/rgb, píxeles sueltos,
  `@media (max-width: 720px)` y las funciones primitivas (`navy()`, `space()`).
- ¿Falta una variable? Créala en `_semantic.scss` (y su primitiva en
  `_tokens.scss` si hace falta). No la inventes en el componente.
- Breakpoints: `@include from('lg') { … }` / `@include until('sm') { … }`.
- Animaciones: siempre con su bloque `@include motion-reduce { … }`.
- Foco: usa `@include focus-ring`; no elimines outlines.

## Angular Material

- Al importar un `MatXModule` en un componente hay que añadir
  `@include mat.x-theme($elim-theme);` en `src/styles/_theme.scss`.
  Si se deja de usar, quitar la línea (CSS muerto = kB en la pantalla).
- Nunca `mat.all-component-themes`.
- Los overlays de Material se renderizan en `<body>`: sus retoques de marca
  van en `src/styles/_material-overrides.scss`, no en el componente.

## Escenario proyectable

- `stage.component.scss` es **global** (`ViewEncapsulation.None` en
  `StageComponent`) y estiliza también los bloques hijos → toda clase nueva
  necesita prefijo BEM propio (`.gallery__tile`, `.upcoming__item`).
  Nunca `.title`, `.item`, `.grid`.
- Los componentes de `features/stage/blocks/*` sólo llevan
  `:host { display: contents; }` para no romper el layout del `.slide` padre.
- En modo proyección el texto se lee desde lejos: los overrides de peso y
  contraste viven en el bloque `.stage.is-fullscreen` al final de la hoja.
  Si añades texto proyectable, súmalo allí.

## Resto

- Los componentes de `shared/` y `layout/` están encapsulados: nombres cortos
  permitidos.
- Prefiere `clamp()` a media queries nuevas: la misma hoja sirve de móvil a
  proyector 4K.
- Utilidades: sólo el conjunto cerrado `u-*` de `_utilities.scss`. Si necesitas
  otra, añádela allí; no crees utilidades ad-hoc en componentes.
- Ancho de lectura: en `_base.scss` sólo `p` lleva `max-width: var(--w-prose)`
  (los `li` no, porque casi todas las listas son rejillas de tarjetas). Para
  prosa dentro de una lista usa `.u-prose`. Toda caja con `max-width` que deba
  ir centrada necesita `margin-inline: auto`; nunca la parchees con
  `max-width: none` en el componente.
- Presupuesto: 36 kB warning / 48 kB error por hoja de componente;
  80/120 kB para el bundle `styles`.

Contexto ampliado: `docs/ai/45-design-system.md` (tokens y Material) y
`docs/ai/40-styling.md` (mapa de secciones del escenario).
