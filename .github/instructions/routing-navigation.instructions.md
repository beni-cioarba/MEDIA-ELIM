---
applyTo: "src/app/app.routes.ts,src/app/core/navigation/**,src/app/core/modules/**,src/app/layout/**,src/app/features/**/*.component.ts,src/app/features/**/*.pages.ts,src/app/features/**/*.routes.ts"
description: "Reglas de rutas, menú y layout para que la app escale por módulos."
---

# Rutas, navegación y layout

- Las rutas son **de cada módulo**: `features/<x>/<x>.pages.ts` (ruta y SEO,
  datos puros) + `<x>.routes.ts` (`pageRoute(página, { loadComponent, … })`).
  `app.routes.ts` sólo tiene una línea por módulo. Módulo nuevo:
  `node scripts/new-module.mjs <id>`. Receta: `docs/ai/10-architecture.md`.
- Dentro de la maqueta (`shell`) salvo herramientas sin cabecera ni pie
  (`bare`). Nada renderiza su propia cabecera, pie o dock flotante.
- Una feature no importa el interior de otra: sólo su `public/`
  (`npm run check:boundaries`).
- El segmento de URL se declara en `core/navigation/app-paths.ts`.
  Prohibido escribir rutas literales en plantillas o servicios: usa
  `APP_PATHS.*` y `blockPath(id)`.
- El menú se define **sólo** en `core/navigation/navigation.config.ts`
  (`MAIN_NAV`). Un módulo = una entrada; máximo 2 niveles; máximo ~7 entradas
  de primer nivel; una sola con `highlight: true`.
- Cada `NavItem` necesita `labelKey` (bajo `nav.*`) en **es.json y ro.json**;
  los hijos de un grupo, además, `descriptionKey`.
- Escritorio: `mat-menu` para los grupos (accesibilidad ya resuelta).
  Móvil: `MobileNavComponent`, diferido con `@defer (when ui.drawerOpen())`.
- El estado de menús/drawer/scroll vive en `UiStore` (`core/state/ui.store.ts`),
  no en los componentes de navegación.
- El layout es **eager**: no le añadas dependencias pesadas. Lo que no se ve en
  el primer pintado va con `@defer` y un `@placeholder` que reserve altura.

Receta completa: `docs/ai/15-navigation.md`.
