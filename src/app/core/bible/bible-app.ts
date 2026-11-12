/**
 * La **app Biblia** (YouVersion, Life.Church), donde vive el plan que sigue el
 * proyecto. Comprobado el 12/11/2026: paquete de Android (Google Play), id de
 * la App Store, y bible.com cede **todos** sus enlaces a la app
 * (`/.well-known/assetlinks.json` y `apple-app-site-association`): un enlace a
 * bible.com abre la app si está instalada.
 */
export const BIBLE_APP = {
  androidPackage: 'com.sirma.mobile.bible.android',
  play: 'https://play.google.com/store/apps/details?id=com.sirma.mobile.bible.android',
  appStore: 'https://apps.apple.com/app/id282935706',
} as const;
