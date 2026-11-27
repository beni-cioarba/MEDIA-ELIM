import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'iglesia-redes.stories.view';

/**
 * Cómo se leen las crónicas de un departamento («Din viața…»):
 *
 * - `timeline`: todas desplegadas, de la más reciente a la más antigua
 *   (**por defecto**).
 * - `series`: agrupadas por campaña (`DepartmentStory.series`): una edición a
 *   la vista y un selector de año; las sueltas, en su sitio.
 * - `compact`: una lista plegada (fecha, título, tipo); se abre la que se
 *   quiera leer.
 */
export type StoriesView = 'timeline' | 'series' | 'compact';

export const STORIES_VIEWS: readonly StoriesView[] = ['timeline', 'series', 'compact'];

const isView = (value: string | null): value is StoriesView =>
  value !== null && (STORIES_VIEWS as readonly string[]).includes(value);

/**
 * La elección del visitante, recordada en este navegador (`localStorage`):
 * vale para todas las páginas de departamento y para la próxima visita.
 */
@Injectable({ providedIn: 'root' })
export class StoriesViewService {
  private readonly _view = signal<StoriesView>(this.read());

  readonly view = this._view.asReadonly();

  set(view: StoriesView): void {
    this._view.set(view);
    try {
      if (typeof localStorage === 'undefined') return;
      // El valor por defecto no se guarda: quien no ha elegido no deja rastro.
      if (view === 'timeline') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, view);
    } catch {
      /* almacenamiento bloqueado: vale para esta visita */
    }
  }

  private read(): StoriesView {
    try {
      if (typeof localStorage === 'undefined') return 'timeline';
      const stored = localStorage.getItem(STORAGE_KEY);
      return isView(stored) ? stored : 'timeline';
    } catch {
      return 'timeline';
    }
  }
}
