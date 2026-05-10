# Iglesia Elim · Redes sociales

Aplicación Angular pensada como **diapositiva proyectable** para mostrar en la
iglesia los enlaces a redes sociales junto a un código QR que redirige a la
propia web — cualquier persona en la sala puede escanearlo con el móvil.

## Características

- Tarjetas de Instagram (cuenta principal y de jóvenes), Facebook y YouTube
  con marca visual de cada red.
- **i18n** completo en **Español** (por defecto) y **Rumano** vía
  `@ngx-translate/core`. Traducciones en `src/assets/i18n/{es,ro}.json`.
  Detecta automáticamente el idioma del navegador y persiste la elección
  del usuario en `localStorage`.
- **QR dinámico**: codifica la URL real desde la que se sirve la web (no hay
  que reconfigurar nada al desplegar).
- **Bloque de últimas transmisiones** de YouTube con miniaturas oficiales
  (sin claves de API ni `iframe` pesado) + CTA al canal `@ElimArganda/streams`.
- **Modo presentación** a pantalla completa: botón en la barra inferior o
  tecla `F`. `Esc` para salir.
- Resaltado rotatorio sutil entre las redes para evitar una pantalla
  completamente estática.
- Accesible: `aria-label` en todos los enlaces, foco visible, respeta
  `prefers-reduced-motion`.
- Enlaces externos con `rel="noopener noreferrer"`.
- Diseño responsive con `clamp()`: se ve bien desde móvil hasta TV 4K.

## Personalizar el contenido

Toda la configuración (URLs, redes, IDs de vídeos…) está centralizada
en `src/app/core/church.config.ts`. Edita `DEFAULT_CHURCH_CONFIG` y listo —
no hace falta tocar plantillas.

Los textos visibles están en `src/assets/i18n/es.json` y `ro.json`.

> Actualiza `publicUrl` con el dominio real desplegado. El QR usa
> `window.location.href` en runtime, por lo que en producción apuntará solo
> si la web se sirve desde una URL pública (HTTPS recomendado).

### Añadir nuevas transmisiones de YouTube

1. Abre la transmisión en YouTube (`/watch?v=ABC123` o `/live/ABC123`).
2. Copia el ID (la parte tras `v=` o `/live/`).
3. En `latestStreams` añade al **principio** del array:
   ```ts
   { videoId: 'ABC123', title: 'Culto del domingo', date: '5 may 2026' }
   ```
4. Mantén entre 3 y 6 entradas para que la rejilla quede equilibrada.
5. Marca con `isLive: true` la que esté en directo (mostrará la insignia roja).

Mientras `latestStreams` esté vacío, el bloque solo muestra el CTA hacia
`@ElimArganda/streams` y el mensaje "Pronto añadiremos nuevas transmisiones."

## Cómo se ejecuta

```b
├── assets/
│   ├── logo-elim.png
│   └── i18n/
│       ├── es.json            # Traducciones en español
│       └── ro.json            # Traducciones en rumano
└── app/
    ├── core/
    │   ├── church.config.ts   # Datos editables (URLs, IDs YouTube)
    │   ├── i18n/              # Loader de @ngx-translate
    │   ├── presentation.service.ts
    │   ├── services/
    │   │   └── language.service.ts
    │   └── social-link.model.ts
    ├── features/
    │   ├── home/              # Pantalla principal (diapositiva)
    │   └── streams/           # Bloque de últimas transmisiones
    └── shared/
        ├── lang-switcher/     # Conmutador ES / RO con banderas
        └── social-icon/       # Iconos SVG inline (offline-friendly)
```

## Stack

- Angular 17 (componentes standalone, OnPush, signals).
- `@ngx-translate/core` + `@ngx-translate/http-loader` para i18n

## Estructura de carpetas

```
src/app/
├── core/                       # Modelos, configuración y servicios singletons
│   ├── church.config.ts        # Datos editables de la iglesia
│   ├── presentation.service.ts # Wrapper de la Fullscreen API
│   └── social-link.model.ts
├── features/home/              # Pantalla principal (diapositiva)
└── shared/social-icon/         # Iconos SVG inline (sin dependencias externas)
```

## Stack

- Angular 17 (componentes standalone, OnPush, signals).
- `angularx-qrcode` para la generación del QR.
- SCSS con tokens de diseño centralizados.
