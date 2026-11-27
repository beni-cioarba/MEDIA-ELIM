import type { UpcomingEvent } from '../church.config';

/**
 * Evenimente: los actos puntuales (botezuri, conferințe, conciertos).
 *
 * Los pasados no hace falta borrarlos: `ScheduleService` los filtra y
 * pasan al histórico. Cada cartel lleva su miniatura (`npm run posters`).
 *
 * Fichero de **contenido**: lo edita quien publica. Los tipos están en
 * `core/church.config.ts`, que reúne todos los ficheros de `core/content/`
 * en `DEFAULT_CHURCH_CONFIG` (la app lo lee por el token `CHURCH_CONFIG`).
 */

export const UPCOMING_EVENTS: readonly UpcomingEvent[] = [
  {
    id: 'ancorat_2026_09_26',
    departments: ['youth'],
    poster: 'assets/posters/conferinta-ancorat-2026.webp',
    date: '2026-09-26',
    time: '18:00',
    title: 'Conferință de tineret "ANCORAT"',
    description:
      'Organizată de Departamentul de tineret. După mesaj, întrebări și răspunsuri.',
    verse: '',
    preacher: 'Daniel Popa (Timișoara)',
    worshipLead: '',
  },
  {
    id: 'evanghelizare_2026_09_27',
    departments: ['evangelism'],
    poster: 'assets/posters/conferinta-ancorat-2026.webp',
    date: '2026-09-27',
    time: '10:00 & 18:00',
    title: 'Evanghelizare',
    description: 'Fratele Daniel Popa slujește la ambele programe ale zilei.',
    verse: '',
    preacher: 'Daniel Popa (Timișoara)',
    worshipLead: '',
  },
  {
    id: 'evanghelizare_apc_2026_11_08',
    departments: ['evangelism'],
    poster: 'assets/posters/evanghelizare-apc-2026.webp',
    date: '2026-11-08',
    time: '18:00',
    title: 'Evanghelizare cu Asociația Polițiștilor Creștini din România',
    description:
      'Program de evanghelizare cu frații din Asociația Polițiștilor Creștini din România (APC).',
    verse:
      'Semănați potrivit cu neprihănirea, și veți secera potrivit cu îndurarea. Desțeleniți-vă un ogor nou! Este vremea să căutați pe Domnul, ca să vină și să vă plouă mântuire. (Osea 10:12)',
    preacher: '',
    worshipLead: '',
  },
  {
    id: 'binecuvantare_copii_2026_11_08',
    // Portada 16:9 (miniatura del directo), no cartel 4:5.
    poster: 'assets/posters/binecuvantare-copii-2026-11-08.webp',
    date: '2026-11-08',
    time: '10:00',
    title: 'Binecuvântare de copii',
    description: '',
    verse: '',
    preacher: 'Radu Mariș',
    worshipLead: '',
  },
  {
    // Abre la Conferință de familie (programa del 20 al 22). Cartel propio.
    id: 'tineret_inainte_sa_spui_da_2026_11_20',
    departments: ['youth'],
    poster: 'assets/posters/inainte-sa-spui-da-2026.webp',
    date: '2026-11-20',
    time: '20:00',
    title: 'Seară de tineret: „Înainte să spui DA”',
    description: 'Deschiderea Conferinței de familie, la seara de tineret.',
    verse: '',
    preacher: 'Marian Condrat',
    worshipLead: '',
  },
  {
    // Programa de la conferencia: sesiones I y II con pausa entre medias.
    id: 'conferinta_familie_2026_11_21',
    // Cartel propio de la tarde del sábado (sesiones I y II).
    poster: 'assets/posters/conferinta-familie-2026-11-21.webp',
    date: '2026-11-21',
    time: '18:00',
    title: 'Conferință de familie: "Familia dincolo de aparențe”',
    description:
      'Sesiunea I (18:00): „Problemele care ne fac probleme”. Pauză cu cafea și prăjitură (19:15). Sesiunea II (19:45): „Cum să dezvoltăm relația în familie”.',
    verse: '',
    preacher: 'Marian Condrat',
    worshipLead: '',
  },
  {
    id: 'botez_2026_11_22',
    poster: 'assets/posters/botez-2026-11-22.webp',
    date: '2026-11-22',
    time: '10:00',
    title: 'Botez nou-testamental',
    description: 'Mesaj: "De ce să fii sigur de mântuirea ta?"',
    verse: '',
    preacher: 'Marian Condrat',
    worshipLead: '',
  },
  {
    id: 'conferinta_familie_2026_11_22',
    poster: 'assets/posters/conferinta-familie-2026.webp',
    date: '2026-11-22',
    time: '18:00',
    title: 'Conferință de familie: "Ce poate face Dumnezeu cu familia ta?"',
    description: 'Sesiunea III, încheierea conferinței.',
    verse: '',
    preacher: 'Marian Condrat',
    worshipLead: '',
  },
  {
    // Sin hora confirmada.
    id: 'fanfara_castellon_2026_11_29',
    departments: ['brass'],
    // Foto apaisada 16:9 de la fanfara (la dio el usuario), no cartel 4:5.
    poster: 'assets/posters/fanfara-castellon-2026-11-29.webp',
    date: '2026-11-29',
    time: '',
    title: 'Fanfara de la Castellón',
    description: '',
    verse: '',
    preacher: '',
    worshipLead: '',
  },
  {
    id: 'aniversare_25_2026_10_18',
    poster: 'assets/posters/aniversare-25-ani-2026.webp',
    date: '2026-10-18',
    time: '10:00',
    title: 'Aniversare: 25 de ani de la înființarea Bisericii Elim',
    description:
      'Sărbătoare în biserică, apoi masă festivă la restaurantul Oma Bodas din Arganda del Rey (cu înscriere).',
    verse: '',
    preacher: 'Simion Bumbar',
    worshipLead: '',
  },
  /* {
    id: 'botez_2026_05_31',
    date: '2026-05-31',
    time: '10:00',
    title: 'Botez Nou Testamental',
    description: '',
    verse:
      'Romani 6:4: „Noi deci, prin botezul în moartea Lui, am fost îngropaţi împreună cu El, pentru ca, după cum Hristos a înviat din morţi, prin slava Tatălui, tot aşa şi noi să trăim o viaţă nouă.”',
    preacher: '',
    worshipLead: '',
  }, */
  /* 
  {
    id: 'botez_2026_05_31',
    date: '2026-05-31',
    time: '10:00',
    title: 'Botez Nou Testamental',
    description: 'Luptele creștinilor în timpurile de azi',
    verse:
      'Faptele Apostolilor 2:38: „Pocăiți-vă, le-a zis Petru, și fiecare din voi să fie botezat în Numele lui Isus Hristos, spre iertarea păcatelor voastre; apoi veți primi darul Sfântului Duh.”',
    preacher: 'Ioan Szaz',
    worshipLead: 'Beni Cioarba',
  },
  {
    id: 'evanghelizare_2026_06_07',
    departments: ['evangelism'],
    date: '2026-06-07',
    time: '18:00',
    title: 'Evanghelizare',
    description:
      'Cine ești tu omule — Prin botezul în moartea Lui, am fost îngropați împreună cu El, pentru ca, după cum Hristos a înviat din morți, prin slava Tatălui, tot așa și noi să trăim o viață nouă.',
    verse: '',
    preacher: 'Beni Cioarba',
    worshipLead: 'Beni Cioarba',
  }, 
  */
];
