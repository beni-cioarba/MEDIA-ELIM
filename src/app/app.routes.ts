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
