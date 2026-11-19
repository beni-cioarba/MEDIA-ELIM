import { APP_PATHS } from '../../core/navigation/app-paths';
import { definePages } from '../../core/modules/module.model';

/** Invitați: bienvenida fuera del menú (QR + enlace del pie), noindex. Datos puros: los lee también `scripts/generate-route-pages.mjs`. */
const GUESTS_SEO = { titleKey: 'seo.guests.title', descriptionKey: 'seo.guests.description', noindex: true };

export const GUESTS_PAGES = definePages({
  ro: {
    path: APP_PATHS.guests,
    seo: GUESTS_SEO,
    staticPage: {
      image: { path: 'assets/pwa/og-invitati.jpg', alt: 'Bine ai venit acasă — Biserica Elim, duminica la 10:00 și 18:00' },
    },
  },
  // La misma **en español**: el idioma va en la ruta para que tenga su propia
  // página estática (la tarjeta de WhatsApp sale en español). Es la URL del QR.
  es: {
    path: `${APP_PATHS.guests}/es`,
    seo: GUESTS_SEO,
    staticPage: {
      lang: 'es',
      image: { path: 'assets/pwa/og-invitati-es.jpg', alt: 'Bienvenido a casa — Iglesia Elim, los domingos a las 10:00 y 18:00' },
    },
  },
  // Hoja imprimible del QR (afiche A4 / tarjetas A6): sin maqueta.
  qr: {
    path: `${APP_PATHS.guests}/${APP_PATHS.guestsQr}`,
    seo: { titleKey: 'seo.guests_qr.title', descriptionKey: 'seo.guests_qr.description', noindex: true },
    tool: true,
  },
});
