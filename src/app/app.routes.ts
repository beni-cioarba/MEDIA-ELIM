import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { APP_PATHS } from './core/navigation/app-paths';
import { credoTranslationsResolver } from './features/credo/credo-translations.resolver';

/**
 * Mapa de rutas de la aplicación.
 *
 * Convenciones (ver `docs/ai/15-navigation.md`):
 *  1. Todas las páginas cuelgan de `MainLayoutComponent` (cabecera + pie),
 *     que es lo único eager: se necesita en el primer pintado.
 *  2. Cada página se carga con `loadComponent` → un chunk por módulo.
 *  3. La ruta declara sus claves SEO en `data.seo`; `AppTitleStrategy` las
 *     traduce y actualiza `<title>` y las metaetiquetas.
 *  4. Las rutas no se escriben como literales sueltos: salen de `APP_PATHS`.
 */
export const APP_ROUTES: Routes = [
  // ── Rutas del operador (sin shell) ─────────────────────────────────────
  // Van ANTES del layout: `media/:blockId` las capturaría como un bloque.
  {
    // Panel de control de la proyección: lista de diapositivas, transporte,
    // vista previa y ajustes. Abre la ventana de proyección.
    path: `${APP_PATHS.media}/${APP_PATHS.control}`,
    loadComponent: () =>
      import('./features/presenter/presenter.component').then((m) => m.PresenterComponent),
    data: {
      seo: { titleKey: 'seo.control.title', descriptionKey: 'seo.control.description' },
    },
  },
  {
    // Ventana de proyección: sólo el escenario, ya presentando. Con
    // `?rol=preview` es la vista previa incrustada en el panel.
    path: `${APP_PATHS.media}/${APP_PATHS.projection}`,
    loadComponent: () =>
      import('./features/projection/projection.component').then((m) => m.ProjectionComponent),
    data: {
      seo: { titleKey: 'seo.projection.title', descriptionKey: 'seo.projection.description' },
    },
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: APP_PATHS.home,
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/home/home.component').then((m) => m.HomeComponent),
        data: {
          seo: { titleKey: 'seo.home.title', descriptionKey: 'seo.home.description' },
        },
      },
      {
        path: APP_PATHS.about,
        loadComponent: () =>
          import('./features/about/about.component').then((m) => m.AboutComponent),
        data: {
          seo: { titleKey: 'seo.about.title', descriptionKey: 'seo.about.description' },
        },
      },
      {
        path: APP_PATHS.credo,
        loadComponent: () =>
          import('./features/credo/credo.component').then((m) => m.CredoComponent),
        // El texto de los 30 artículos viaja en su propio chunk.
        resolve: { i18n: credoTranslationsResolver },
        data: {
          seo: { titleKey: 'seo.credo.title', descriptionKey: 'seo.credo.description' },
        },
      },
      {
        path: APP_PATHS.leadership,
        loadComponent: () =>
          import('./features/leadership/leadership.component').then(
            (m) => m.LeadershipComponent,
          ),
        data: {
          seo: {
            titleKey: 'seo.leadership.title',
            descriptionKey: 'seo.leadership.description',
          },
        },
      },
      {
        // Escenario multimedia completo.
        path: APP_PATHS.media,
        loadComponent: () =>
          import('./features/stage/stage.component').then((m) => m.StageComponent),
        data: {
          seo: { titleKey: 'seo.media.title', descriptionKey: 'seo.media.description' },
        },
      },
      {
        // Los anuncios tienen página propia: `/media/anunturi` no es un bloque web.
        path: `${APP_PATHS.media}/${APP_PATHS.announcements}`,
        redirectTo: APP_PATHS.announcements,
      },
      {
        // Un bloque como página propia (`/media/galerie`, `/media/program`…).
        // Reutiliza el mismo componente: un único chunk y una única hoja de
        // estilos para los seis bloques.
        path: `${APP_PATHS.media}/:blockId`,
        loadComponent: () =>
          import('./features/stage/stage.component').then((m) => m.StageComponent),
        data: {
          seo: { titleKey: 'seo.media.title', descriptionKey: 'seo.media.description' },
        },
      },
      {
        // Anunțuri vigentes. `:id` abre uno solo (enlace para compartir);
        // mismo componente, mismo chunk.
        path: APP_PATHS.announcements,
        loadComponent: () =>
          import('./features/announcements/announcements.component').then(
            (m) => m.AnnouncementsComponent,
          ),
        data: {
          seo: {
            titleKey: 'seo.announcements.title',
            descriptionKey: 'seo.announcements.description',
          },
        },
      },
      {
        path: `${APP_PATHS.announcements}/:id`,
        loadComponent: () =>
          import('./features/announcements/announcements.component').then(
            (m) => m.AnnouncementsComponent,
          ),
        data: {
          seo: {
            titleKey: 'seo.announcements.title',
            descriptionKey: 'seo.announcements.description',
          },
        },
      },
      {
        path: APP_PATHS.contact,
        loadComponent: () =>
          import('./features/contact/contact.component').then(
            (m) => m.ContactComponent,
          ),
        data: {
          seo: {
            titleKey: 'seo.contact.title',
            descriptionKey: 'seo.contact.description',
          },
        },
      },
      {
        path: APP_PATHS.donate,
        loadComponent: () =>
          import('./features/donate/donate.component').then((m) => m.DonateComponent),
        data: {
          seo: {
            titleKey: 'seo.donate.title',
            descriptionKey: 'seo.donate.description',
          },
        },
      },
      // Cualquier ruta desconocida vuelve a la portada (GitHub Pages sirve
      // `404.html` = `index.html`, así que el deep-link acaba aquí).
      { path: '**', redirectTo: '' },
    ],
  },
];
