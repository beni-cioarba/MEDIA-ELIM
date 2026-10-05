import { Injectable, signal } from '@angular/core';

/**
 * Último eslabón de la migaja de pan que la ruta no conoce.
 *
 * El rastro sale de `MAIN_NAV` (`NavActiveService.trail`), que sólo sabe de
 * secciones. Una página de detalle (`/conducere/<id>`) pone aquí su nombre ya
 * resuelto («Pavel Negrușier») y la migaja lo añade al final, con la sección
 * convertida en enlace. La página lo quita al destruirse.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbTailService {
  private readonly _label = signal<string | null>(null);
  readonly label = this._label.asReadonly();

  set(label: string | null): void {
    this._label.set(label);
  }
}
