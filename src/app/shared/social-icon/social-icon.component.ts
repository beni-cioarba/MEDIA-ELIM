import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocialIcon } from '../../core/social-link.model';

/**
 * Iconos SVG inline (Simple Icons) para evitar depender de una fuente
 * externa: la app debe verse igual aunque no haya conexión en la sala.
 */
@Component({
  selector: 'app-social-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container [ngSwitch]="name">
      <svg *ngSwitchCase="'instagram'" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2.2c3.2 0 3.6 0 4.8.07 1.2.05 1.9.25 2.3.41.6.22 1 .5 1.5 1s.78.9 1 1.5c.16.4.36 1.1.41 2.3.06 1.2.07 1.6.07 4.8s0 3.6-.07 4.8c-.05 1.2-.25 1.9-.41 2.3-.22.6-.5 1-1 1.5s-.9.78-1.5 1c-.4.16-1.1.36-2.3.41-1.2.06-1.6.07-4.8.07s-3.6 0-4.8-.07c-1.2-.05-1.9-.25-2.3-.41a4.1 4.1 0 0 1-1.5-1c-.5-.5-.78-.9-1-1.5-.16-.4-.36-1.1-.41-2.3C2.21 15.6 2.2 15.2 2.2 12s0-3.6.07-4.8c.05-1.2.25-1.9.41-2.3.22-.6.5-1 1-1.5s.9-.78 1.5-1c.4-.16 1.1-.36 2.3-.41C8.4 2.21 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.5 0-4.7.07-1 .05-1.6.22-1.95.36a3 3 0 0 0-1.1.7 3 3 0 0 0-.7 1.1c-.14.35-.31.95-.36 1.95C3.13 9.5 3.13 9.85 3.13 13s0 3.5.07 4.7c.05 1 .22 1.6.36 1.95a3 3 0 0 0 .7 1.1 3 3 0 0 0 1.1.7c.35.14.95.31 1.95.36 1.2.07 1.55.07 4.7.07s3.5 0 4.7-.07c1-.05 1.6-.22 1.95-.36a3 3 0 0 0 1.1-.7 3 3 0 0 0 .7-1.1c.14-.35.31-.95.36-1.95.07-1.2.07-1.55.07-4.7s0-3.5-.07-4.7c-.05-1-.22-1.6-.36-1.95a3 3 0 0 0-.7-1.1 3 3 0 0 0-1.1-.7c-.35-.14-.95-.31-1.95-.36C15.5 4 15.15 4 12 4z"
          transform="translate(0 -1)"
        />
        <path
          d="M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM18.5 7.2a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z"
        />
      </svg>

      <svg *ngSwitchCase="'facebook'" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M22 12a10 10 0 1 0-11.56 9.88V14.9H7.9V12h2.54V9.8c0-2.5 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.9h-2.34v6.98A10 10 0 0 0 22 12z"
        />
      </svg>

      <svg *ngSwitchCase="'youtube'" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z"
        />
      </svg>

      <svg *ngSwitchDefault viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm7.93 9h-3.95a15.5 15.5 0 0 0-1.4-5.8A8 8 0 0 1 19.93 11zM12 4a13.5 13.5 0 0 1 1.92 7H10.08A13.5 13.5 0 0 1 12 4zM4.07 13H8a15.5 15.5 0 0 0 1.4 5.8A8 8 0 0 1 4.07 13zM8 11H4.07a8 8 0 0 1 5.33-5.8A15.5 15.5 0 0 0 8 11zm2.08 2h3.84A13.5 13.5 0 0 1 12 20a13.5 13.5 0 0 1-1.92-7zm4.5 5.8A15.5 15.5 0 0 0 16 13h3.93a8 8 0 0 1-5.35 5.8z"
        />
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
export class SocialIconComponent {
  /** Nombre del icono a renderizar. */
  @Input({ required: true }) name!: SocialIcon;
}
