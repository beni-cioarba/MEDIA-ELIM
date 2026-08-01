---
applyTo: "src/app/app.routes.ts,src/app/core/navigation/**,src/app/layout/**,src/app/features/**/*.component.ts"
description: "Reglas de rutas, menú y layout para que la app escale por módulos."
---

# Rutas, navegación y layout

- Toda ruta cuelga del padre `MainLayoutComponent` en `app.routes.ts`.
  Nada renderiza su propia cabecera, pie o dock flotante.
- Todos los hijos usan `loadComponent` (lazy) y llevan
  `data: { seo: { title: 'seo.x.title', description: 'seo.x.description' } }`.
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
