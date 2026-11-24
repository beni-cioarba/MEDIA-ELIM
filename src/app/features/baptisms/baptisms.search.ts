import { inject } from '@angular/core';
import { routePackLoader } from '../../core/i18n/route-packs';
import type { SearchEntry, SearchProvider } from '../../core/search/search.model';
import { BaptismsService } from '../../core/services/baptisms.service';

/**
 * Botezuri: **cada botez, ningún candidato**.
 *
 * Muchos candidatos eran menores el día de su botez. Sus fichas se comparten
 * por enlace (`noindex`) y la web no debe ofrecer «escribe un nombre y mira si
 * sale»: ni nombres, ni padres, ni testimonios, ni —nunca— edad o
 * procedencia. Tampoco se filtra por edad: que unos salieran y otros no
 * revelaría justo ese dato. Lo comprueba `app.search.spec.ts`; la decisión
 * está en `docs/ai/78-search.md` → «Privacidad».
 */
export const BAPTISMS_SEARCH: SearchProvider = async (ctx) => {
  const service = inject(BaptismsService);
  const baptisms = service.newestFirst();
  await ctx.pack('baptisms', routePackLoader('baptisms'));
  return baptisms.map(
    (baptism): SearchEntry => ({
      id: baptism.date,
      kind: baptism.status === 'past' ? 'media' : 'event',
      title: `${ctx.t('search.ctx.baptism')} · ${service.formatDate(baptism.date)}`,
      altTitle: ctx.alt('search.ctx.baptism'),
      context: `${ctx.t('nav.baptisms')} · ${ctx.t('baptisms.ordinal', { n: baptism.ordinal })}`,
      // La ruta abre el registro; el ancla lo coloca también si ya se está en él.
      path: baptism.link,
      fragment: `botez-${baptism.date}`,
      icon: 'droplet',
      keywords: ctx.alt('nav.baptisms'),
      // Quien predicó, del título público del directo.
      body: (baptism.ministers ?? []).join(', '),
      boost: 0.85,
    }),
  );
};
