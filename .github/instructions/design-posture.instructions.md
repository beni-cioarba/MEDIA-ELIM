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

## Marca

`app-brand-logo` (`src/app/shared/brand-logo/`) es **la única** representación
de la marca. Cabecera, pie y proyección la consumen con distinto `size` y
`tone`. No vuelvas a escribir el wordmark ni a insertar `logo-elim.*` en un
componente nuevo.
