---
applyTo: "src/app/**/*.ts,scripts/**/*.js,scripts/**/*.mjs"
description: "Postura de ingeniería: analiza antes de escribir y elige la solución más eficiente y escalable."
---

# Postura de ingeniería

Cuando generes o modifiques código, **actúa como programador sénior** de una
app profesional y escalable. `angular-code.instructions.md` cubre las reglas
del framework; aquí va el método.

## Antes de escribir

1. Lee el shard de `docs/ai/` que corresponda y el código realmente afectado.
   No supongas una API: compruébala.
2. Busca si ya existe: un servicio, un token, un partial, una utilidad. La
   mejor línea de código es la que no se escribe.
3. Decide **dónde vive** el cambio antes de cómo se implementa:
   - dato no traducible → `core/church.config.ts`
   - texto → `assets/i18n/*.json` (las dos lenguas)
   - ruta/segmento → `core/navigation/`
   - estado compartido → servicio con signals o SignalStore
   - patrón visual repetido → `shared/`

## Al escribir

4. **Deriva, no dupliques.** Si una lista ya existe (p. ej. `MAIN_NAV`),
   la nueva vista la transforma; no se copia. Duplicar es garantizar que se
   desincroniza.
5. **Coste inicial cero para lo que no se ve.** Todo lo que quede fuera del
   primer pintado va con `@defer` y `@placeholder` con altura reservada.
   Vigila el presupuesto del bundle en cada cambio.
6. **Tipos que impidan el error.** Uniones literales y `readonly` en la
   configuración; nada de `string` genérico donde hay un conjunto cerrado.
   Sin `any` ni `!` sin comentario que lo justifique.
7. **Comenta el porqué, nunca el qué.** Un comentario útil explica la
   decisión, la alternativa descartada y el efecto secundario que evita.
8. **No introduzcas dependencias** si el CDK, la plataforma o 20 líneas
   propias lo resuelven.

## Al terminar

9. `npm run i18n:check` si tocaste textos y
   `npx ng build --configuration production` siempre.
10. Actualiza el shard de `docs/ai/` afectado en el mismo cambio.

## Trampas conocidas de este repo

- **Nunca uses comillas invertidas dentro de comentarios** de una plantilla o
  de unos estilos *inline*: rompen el literal de plantilla y el error que
  produce el compilador no señala la causa.
- `position: fixed` queda confinado por cualquier ancestro con `transform`,
  `filter`, `backdrop-filter`, `contain` o `will-change`. Para capas por
  encima de todo: `<dialog>` + `showModal()` o CDK Overlay.
- `StageComponent` usa `ViewEncapsulation.None`: sus selectores son globales.
  Prefija sus clases (`stage-*`) para no pisar componentes compartidos.
- El *watcher* de `ng serve` se queda obsoleto y repite errores ya corregidos:
  reinicia el terminal antes de investigar un error fantasma.
