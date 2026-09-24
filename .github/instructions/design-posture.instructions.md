---
applyTo: "**/*.scss,src/app/**/*.html,src/styles/**"
description: "Postura de diseño: actúa como diseñador de producto sénior en todo lo visual."
---

# Postura de diseño

Cuando toques algo visual, **actúa como diseñador de producto sénior** de una
app grande, escalable y dedicada a una iglesia. Antes de escribir CSS, decide
jerarquía, ritmo y densidad; el marcado y los estilos son la consecuencia.

Esto no repite `styles.instructions.md` ni `templates.instructions.md` (que
cubren el *cómo* técnico): aquí va el *criterio*.

## Criterio

1. **Un solo tema.** Azul institucional + dorado. El dorado es acento, no
   relleno: se reserva para lo que de verdad queremos que se pulse (CTA,
   filetes, títulos de sección). Si algo dorado no es accionable ni un remate,
   sobra.
2. **Compacto y legible.** Densidad alta sin agobio: preferimos una rejilla
   apretada y bien alineada a bloques enormes con aire muerto. Longitud de
   línea máxima ~60-70 caracteres (`--w-prose`, `max-width: NNch`).
3. **Jerarquía explícita.** En cada bloque debe verse de un vistazo qué es lo
   primero. Un único elemento primario por sección; el resto, secundario o
   terciario. Nunca dos CTA con el mismo peso visual.
4. **Reposo tranquilo, respuesta clara.** En reposo, superficie neutra; al
   `:hover` / `:focus-visible`, color y movimiento mínimos (1-2 px). Cuatro
   logos a todo color compitiendo en reposo es un error de jerarquía.
5. **Estados completos.** Ningún elemento interactivo se da por acabado sin
   `:hover`, `:focus-visible` (con `@include focus-ring`), `:active`,
   deshabilitado si aplica, y área táctil ≥44 px (`@include tap-target`).
6. **Degradación en pasos.** Los layouts no saltan de N columnas a 1: se
   reordenan por etapas. Cuando un bloque tiene contenido largo (direcciones,
   textos), que ocupe la fila entera antes que estrecharse.
   **Responsive al 100 % es invariante, no una fase**: de 320 px a 4K, en web,
   panel de control y proyección, sin scroll horizontal, solapes ni textos
   recortados. Fluido antes que breakpoint (`clamp`, `minmax`, `auto-fit`,
   `flex-wrap`); `nowrap` sólo con ellipsis; `min-width: 0` sólo en el hijo que
   debe encoger; las barras envuelven (`flex-wrap`) en vez de aplastar; los
   cortes son los de `$breakpoints`. Antes de dar por hecho un cambio de UI, pasa
   `scripts/responsive-audit.snippet.js` en 320 · 375 · 768 · 1024 · 1280
   (`docs/ai/40-styling.md` → «Responsive»).
7. **Sin CLS.** Todo lo diferido reserva altura. Toda imagen lleva `width`,
   `height`, `loading` y `decoding`.
8. **Contraste real.** Texto sobre superficie oscura: mínimo AA (4.5:1) para
   cuerpo, 3:1 para texto grande. El texto atenuado nunca baja del 55 % de
   opacidad sobre `--c-primary-deep`.
9. **Accesibilidad como diseño.** Cada sección con encabezado y
   `aria-labelledby`; los iconos decorativos, `aria-hidden`; el texto que
   sólo existe para lectores, con `.u-sr-only`.
10. **Reutiliza antes de crear.** Si un patrón aparece dos veces, sale a
    `shared/` o a un partial de `src/app/shared/styles/`. Nunca dos copias de
    la misma marca, botón o tarjeta.

## Lenguaje visual

**Antes de escribir CSS, abre `/stil`** (guía de estilos viva): si la pieza
existe como primitiva `ui-*`, se usa; si no existe y se va a repetir, se añade
al catálogo (`src/styles/_primitives.scss`) **y** a la guía en el mismo cambio.
Las decisiones y sus porqués están en `docs/ai/47-design-language.md`.

Lo esencial: radios contenidos (4–16 px), el filete separa y la sombra se
reserva a lo que flota, botones planos, densidad por tokens `--ui-*`
(`comfortable` en la web, `.ui-dense` en consolas), superficie oscura con
`.ui-dark` en el **host** del módulo, y el oro sólo para lo accionable.

## Marca

Tres piezas, cada una con un único uso (detalle en `docs/ai/45-design-system.md`
→ «Marca»):

- **La iglesia dentro de la UI** → `app-brand-logo` (`src/app/shared/brand-logo/`,
  hoja de marca en su `README.md`), siempre. Cabecera, pie, proyección y panel de
  control la consumen con distinto `size` y `tone` (claro: navy + oro profundo;
  oscuro: papel + oro; los oros no se cruzan). Forma completa nunca bajo 24 px
  (`showLocation="false"` por debajo). No reescribas el wordmark ni insertes una
  imagen de marca; «Elim» y «Arganda del Rey» no se traducen.
- **El icono de la app** (favicon, PWA, Apple) → el emblema sobre baldosa navy,
  generado con `npm run pwa:icons`. Nunca dentro de una página, nunca un PNG
  retocado a mano.
- **INEB** → `app-ineb-logo` (`src/app/shared/ineb-logo/`, con su hoja de marca en
  el `README.md`): `tone` según el fondo, `--ineb-size` en **px** y la forma
  completa nunca por debajo de 32 px. Colores intocables.
