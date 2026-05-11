import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type MediaIconName =
  | 'baptism'
  | 'concert'
  | 'evangelism'
  | 'celebration'
  | 'youth'
  | 'gift'
  | 'star'
  | 'gallery';

/**
 * Iconos SVG inline para los eventos de la galería del departamento de
 * media. Inline para garantizar funcionamiento offline en la sala.
 */
@Component({
  selector: 'app-media-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container [ngSwitch]="name">
      <!-- Baptism: paloma + ondas de agua -->
      <svg *ngSwitchCase="'baptism'" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 17c2 1 3 1 5 0s3-1 5 0 3 1 5 0 3-1 3-1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M3 20c2 1 3 1 5 0s3-1 5 0 3 1 5 0 3-1 3-1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M12 4c-2 0-3.5 1.5-3.5 3.5C8.5 10 12 13 12 13s3.5-3 3.5-5.5C15.5 5.5 14 4 12 4z" fill="currentColor"/>
      </svg>

      <!-- Concert: micrófono -->
      <svg *ngSwitchCase="'concert'" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor"/>
        <path d="M5 11a7 7 0 0 0 14 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M12 18v4M8 22h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>

      <!-- Evangelism: Biblia abierta + rayos -->
      <svg *ngSwitchCase="'evangelism'" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 5a2 2 0 0 1 2-2h6v16H5a2 2 0 0 0-2 2V5zM21 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2V5z" fill="currentColor"/>
        <path d="M11 8v6M13 8v6" stroke="rgba(255,255,255,.85)" stroke-width="1" stroke-linecap="round"/>
      </svg>

      <!-- Celebration: fuegos artificiales / chispas -->
      <svg *ngSwitchCase="'celebration'" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>

      <!-- Youth: dos siluetas -->
      <svg *ngSwitchCase="'youth'" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="8" cy="7" r="3" fill="currentColor"/>
        <circle cx="16" cy="7" r="3" fill="currentColor"/>
        <path d="M2 21c0-3 3-5 6-5s6 2 6 5M12 21c0-3 3-5 6-5s4 2 4 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>

      <!-- Gift: caja con lazo -->
      <svg *ngSwitchCase="'gift'" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="9" width="18" height="12" rx="1.5" fill="currentColor"/>
        <path d="M3 13h18M12 9v12" stroke="rgba(255,255,255,.85)" stroke-width="1.5"/>
        <path d="M12 9c-2-3-6-3-6 0 0 1.5 2 2 4 2M12 9c2-3 6-3 6 0 0 1.5-2 2-4 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>

      <!-- Star: estrella -->
      <svg *ngSwitchCase="'star'" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.5L6 22l1.5-7.2L2 10l7.1-1.1L12 2z" fill="currentColor"/>
      </svg>

      <!-- Gallery (default): cuadro con montañas + sol -->
      <svg *ngSwitchDefault viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
        <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor"/>
        <path d="M3 17l5-5 4 4 3-3 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    </ng-container>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 100%;
        height: 100%;
      }
      svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
      }
    `,
  ],
})
export class MediaIconComponent {
  @Input({ required: true }) name!: MediaIconName;
}
