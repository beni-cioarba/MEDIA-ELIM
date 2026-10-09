import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { TranslationObject } from '@ngx-translate/core';
import {
  TranslationPackLoader,
  TranslationPackService,
} from '../../core/i18n/translation-pack.service';

/**
 * Textos largos de Departamente (quiénes somos, pilares, actividades, la
 * masa de tineret, la reunión mensual, las crónicas): ~18 kB por idioma que
 * sólo usan `/departamente` y sus páginas. Viajan en su propio chunk.
 *
 * En el diccionario principal quedan sólo nombre y entradilla de cada
 * departamento (los usan el menú, el cajón y el panel de la cabecera).
 */
const loadDepartments: TranslationPackLoader = async (lang) => {
  const pack =
    lang === 'es'
      ? await import('../../../assets/i18n/departments.es.json')
      : await import('../../../assets/i18n/departments.ro.json');

  return pack.default as unknown as TranslationObject;
};

/** Espera al paquete antes de activar la ruta: nunca se pintan claves sueltas. */
export const departmentsTranslationsResolver: ResolveFn<boolean> = async () => {
  await inject(TranslationPackService).load('departments', loadDepartments);
  return true;
};
