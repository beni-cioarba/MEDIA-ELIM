import { APP_PATHS, STAGE_BLOCK_SLUGS } from '../navigation/app-paths';

/**
 * Qué se dice en un recordatorio: lo que la app le da a quien está **en esta
 * página**. Fuera de las que tienen mensaje propio, alternan los generales.
 */
export type InviteTopic = 'citire' | 'citire_ios' | 'direct' | 'anunturi' | 'program' | 'rapid' | 'acces';

const block = (slug: string): string => `/${APP_PATHS.media}/${slug}`;

const BY_PATH: readonly (readonly [topic: InviteTopic, paths: readonly string[]])[] = [
  ['citire', [`/${APP_PATHS.impreuna}`, block(STAGE_BLOCK_SLUGS.bible)]],
  ['direct', [block(STAGE_BLOCK_SLUGS.streams)]],
  ['anunturi', [`/${APP_PATHS.announcements}`, block(STAGE_BLOCK_SLUGS.upcoming)]],
  ['program', [`/${APP_PATHS.programHub}`, block(STAGE_BLOCK_SLUGS.weekly)]],
];

const GENERAL: readonly InviteTopic[] = ['rapid', 'acces'];

const isUnder = (path: string, base: string): boolean => path === base || path.startsWith(`${base}/`);

/** @param turn Avisos ya enseñados: los generales se van turnando. */
export function inviteTopic(path: string, turn: number, ios: boolean): InviteTopic {
  const topic = BY_PATH.find(([, bases]) => bases.some((base) => isUnder(path, base)))?.[0];
  // En iPhone y iPad el aviso de las 8:00 **sólo** existe en la app instalada.
  if (topic === 'citire' && ios) return 'citire_ios';
  return topic ?? GENERAL[turn % GENERAL.length];
}
