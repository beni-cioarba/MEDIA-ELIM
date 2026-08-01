---
applyTo: "src/app/core/church.config.ts"
description: "Reglas para el contenido estático de la iglesia."
---

# `church.config.ts` — contenido de la iglesia

Este fichero es la **única** fuente de datos no traducibles. Está pensado para
que alguien no desarrollador pueda actualizarlo.

- No pongas aquí textos de interfaz: van a `src/assets/i18n/*.json`.
- Todas las propiedades son `readonly`; mantén el tipado y no uses `any`.
- `upcomingEvents[].date` en formato **`YYYY-MM-DD`** (se parsea en hora local
  para evitar desfases de zona horaria). No hace falta borrar los pasados:
  `ScheduleService` los filtra y, cuando la lista queda vacía, el bloque
  «Próximos eventos» se excluye solo de la proyección.
- `weeklyProgram[].day` sigue la convención de `Date.getDay()` (0 = domingo).
- `mediaEvents[].image` / `.thumb` deben apuntar a los `.webp` generados por
  `node scripts/optimize-images.js` (1600 px y 480 px). Nunca a los originales.
- Cada `i18nKey` nuevo obliga a crear sus claves en `es.json` y `ro.json`
  (`socials.items.<key>.*`, `gallery.events.<key>.*`).
- `youtubeApiKey` está restringida por HTTP referrer: es el único "secreto"
  admisible aquí. No añadas ningún otro token.

Contexto ampliado: `docs/ai/20-content-i18n.md`.
