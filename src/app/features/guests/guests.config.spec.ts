import { Route } from '@angular/router';
import { APP_ROUTES } from '../../app.routes';
import { DEPARTMENTS } from '../../core/departments.config';
import { GUEST_DEPARTMENTS, GUEST_FAQ, GUEST_HOSTS, GUEST_SECTIONS, GUEST_STEPS } from '../../core/guests.config';
import { PEOPLE_INDEX } from '../../core/leadership.config';
import { APP_PATHS } from '../../core/navigation/app-paths';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { NavItem } from '../../core/navigation/nav.model';
import es from '../../../assets/i18n/guests.es.json';
import ro from '../../../assets/i18n/guests.ro.json';
import mainEs from '../../../assets/i18n/es.json';
import mainRo from '../../../assets/i18n/ro.json';

/** Valor de una clave con puntos en un diccionario anidado (`undefined` si falta). */
function lookup(dictionary: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    dictionary,
  );
}

/** Todas las rutas del menú, a cualquier profundidad. */
function navPaths(items: readonly NavItem[]): string[] {
  return items.flatMap((item) => [item.path ?? '', ...navPaths(item.children ?? [])]);
}

describe('Invitați · ruta oculta', () => {
  const layout = APP_ROUTES.find((route) => route.path === '' && route.children);
  const page = layout?.children?.find((route) => route.path === APP_PATHS.guests);
  const qr = APP_ROUTES.find((route) => route.path === `${APP_PATHS.guests}/${APP_PATHS.guestsQr}`);
  const seoOf = (route: Route | undefined) => route?.data?.['seo'] as { noindex?: boolean; titleKey?: string } | undefined;

  it('/invitati cuelga del shell, fuera de los buscadores y con su paquete de textos', () => {
    expect(page).toBeDefined();
    expect(seoOf(page)?.noindex).toBe(true);
    expect(page?.resolve?.['i18n']).toBeDefined();
  });

  it('/invitati/qr va antes del shell (sin cabecera ni pie), también noindex', () => {
    expect(qr).toBeDefined();
    expect(APP_ROUTES.indexOf(qr!)).toBeLessThan(APP_ROUTES.indexOf(layout!));
    expect(seoOf(qr)?.noindex).toBe(true);
  });

  it('no tiene entrada en el menú, a ninguna profundidad', () => {
    expect(navPaths(MAIN_NAV).some((path) => path.includes(APP_PATHS.guests))).toBe(false);
  });

  it('su título SEO existe en los dos idiomas', () => {
    for (const dictionary of [mainRo, mainEs]) {
      expect(lookup(dictionary, seoOf(page)!.titleKey!)).toBeTruthy();
      expect(lookup(dictionary, seoOf(qr)!.titleKey!)).toBeTruthy();
    }
  });
});

describe('Invitați · datos', () => {
  it('cada anfitrión existe en el organigrama y su rótulo está traducido', () => {
    for (const host of GUEST_HOSTS) {
      expect(PEOPLE_INDEX.has(host.person)).toBe(true);
      expect(lookup(mainRo, host.roleKey)).toBeTruthy();
      expect(lookup(mainEs, host.roleKey)).toBeTruthy();
    }
  });

  it('cada departamento existe y tiene nombre y lema en los dos idiomas', () => {
    for (const id of GUEST_DEPARTMENTS) {
      expect(DEPARTMENTS.some((department) => department.id === id)).toBe(true);
      for (const dictionary of [mainRo, mainEs]) {
        expect(lookup(dictionary, `departments.${id}.name`)).toBeTruthy();
        expect(lookup(dictionary, `departments.${id}.tagline`)).toBeTruthy();
      }
    }
  });

  it('cada pregunta frecuente tiene pregunta y respuesta en los dos idiomas', () => {
    for (const id of GUEST_FAQ) {
      for (const pack of [ro, es]) {
        expect(lookup(pack, `guests.faq.${id}.q`)).toBeTruthy();
        expect(lookup(pack, `guests.faq.${id}.a`)).toBeTruthy();
      }
    }
  });

  it('cada sección del índice tiene su rótulo y cada paso su texto', () => {
    for (const section of GUEST_SECTIONS) {
      expect(lookup(ro, `guests.sections.${section.id}.chip`)).toBeTruthy();
      expect(lookup(es, `guests.sections.${section.id}.chip`)).toBeTruthy();
    }
    for (const step of GUEST_STEPS) {
      expect(lookup(mainRo, `about.visit.items.${step.id}.body`)).toBeTruthy();
      expect(lookup(mainEs, `about.visit.items.${step.id}.body`)).toBeTruthy();
    }
  });
});
