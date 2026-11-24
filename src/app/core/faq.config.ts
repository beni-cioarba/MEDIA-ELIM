import { APP_PATHS, blockPath, departmentPath } from './navigation/app-paths';
import type { IconName } from './ui/icon-name';

/**
 * ÎNTREBĂRI FRECVENTE — qué preguntas hay, en qué orden y adónde llevan
 * =====================================================================
 *
 * **Única fuente** de las preguntas de toda la web: la página
 * (`/intrebari-frecvente`), la franja de la portada, la sección de
 * `/invitati` y el buscador. Aquí sólo está la estructura; los textos viven
 * en `assets/i18n/faq.{ro,es}.json` (`faq.items.<id>.{q,a,k}`).
 *
 * Nada se inventa: una pregunta sólo se publica si su respuesta la ha dado la
 * iglesia o ya está publicada en otra página (y entonces enlaza a ella).
 * Pendientes y receta: `docs/ai/80-faq.md`.
 */

/** Acción bajo una respuesta. El rótulo es `faq.actions.<label>`. */
export type FaqAction =
  | { readonly kind: 'route'; readonly label: string; readonly path: string }
  | { readonly kind: 'external'; readonly label: string; readonly to: 'youtube' | 'maps' }
  | { readonly kind: 'call' }
  | { readonly kind: 'whatsapp'; readonly message: 'general' | 'prayer' };

export interface FaqItem {
  /** Sub-clave de textos y ancla de la URL (`/intrebari-frecvente#parking`). */
  readonly id: string;
  readonly actions?: readonly FaqAction[];
}

export interface FaqGroup {
  /** `faq.groups.<id>`; el ancla del grupo es `g-<id>`. */
  readonly id: string;
  readonly icon: IconName;
  readonly items: readonly FaqItem[];
}

/** Enlace a una página de la web. */
function route(label: string, path: string): FaqAction {
  return { kind: 'route', label, path };
}

const GROUPS = [
  {
    id: 'visit',
    icon: 'hand-heart',
    items: [
      { id: 'language' },
      { id: 'announce', actions: [route('guests', `/${APP_PATHS.guests}`)] },
      { id: 'children' },
      { id: 'dress' },
      { id: 'duration' },
      { id: 'parking' },
      { id: 'access' },
    ],
  },
  {
    id: 'program',
    icon: 'calendar',
    items: [
      { id: 'schedule', actions: [route('weekly', blockPath('weekly'))] },
      {
        id: 'directions',
        actions: [{ kind: 'external', label: 'maps', to: 'maps' }, route('location', blockPath('location'))],
      },
      { id: 'communion' },
      { id: 'online', actions: [{ kind: 'external', label: 'youtube', to: 'youtube' }] },
      {
        id: 'updates',
        actions: [route('announcements', `/${APP_PATHS.announcements}`), route('upcoming', blockPath('upcoming'))],
      },
    ],
  },
  {
    id: 'faith',
    icon: 'book',
    items: [
      { id: 'beliefs', actions: [route('credo', `/${APP_PATHS.credo}`)] },
      { id: 'baptism', actions: [route('baptisms', `/${APP_PATHS.baptisms}`)] },
      { id: 'history', actions: [route('about', `/${APP_PATHS.about}`)] },
      { id: 'leaders', actions: [route('leadership', `/${APP_PATHS.leadership}`)] },
    ],
  },
  {
    id: 'life',
    icon: 'users',
    items: [
      { id: 'reading', actions: [route('bible', blockPath('bible')), route('impreuna', `/${APP_PATHS.impreuna}`)] },
      { id: 'prayer', actions: [{ kind: 'whatsapp', message: 'prayer' }, { kind: 'call' }] },
      { id: 'youth', actions: [route('youth', departmentPath('youth'))] },
      { id: 'serve', actions: [route('departments', `/${APP_PATHS.departments}`)] },
    ],
  },
  {
    id: 'practical',
    icon: 'info',
    items: [
      { id: 'donate', actions: [route('donate', `/${APP_PATHS.donate}`)] },
      { id: 'app' },
      { id: 'site_language' },
      { id: 'photos', actions: [route('legal', `/${APP_PATHS.legal}`)] },
      { id: 'talk', actions: [{ kind: 'call' }, { kind: 'whatsapp', message: 'general' }] },
    ],
  },
] as const satisfies readonly FaqGroup[];

export type FaqId = (typeof GROUPS)[number]['items'][number]['id'];

export const FAQ_GROUPS: readonly FaqGroup[] = GROUPS;

/** Todas las preguntas, por id y en el orden de la página. */
export const FAQ_INDEX: ReadonlyMap<string, FaqItem> = new Map(
  FAQ_GROUPS.flatMap((group) => group.items.map((item): [string, FaqItem] => [item.id, item])),
);

/**
 * Las de la portada: sólo las de quien aún no ha venido y no contesta ninguna
 * otra sección de la página. Seis, a propósito: dos columnas de tres en
 * escritorio y, en el teléfono, las cuatro primeras (`faq-teaser`).
 */
export const HOME_FAQ: readonly FaqId[] = ['language', 'announce', 'children', 'duration', 'parking', 'dress'];
