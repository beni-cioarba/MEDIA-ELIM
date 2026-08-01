import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MAIN_NAV } from '../../core/navigation/navigation.config';
import { isExternalNavItem, isNavGroup } from '../../core/navigation/nav.model';
import { NavActiveService } from '../../core/navigation/nav-active.service';
import { UiStore } from '../../core/state/ui.store';
import { IconComponent } from '../../shared/icon/icon.component';
import { LangSwitcherComponent } from '../../shared/lang-switcher/lang-switcher.component';
import { ShareButtonComponent } from '../../shared/share-button/share-button.component';

/**
 * Panel de navegación móvil (drawer).
 *
 * ── Por qué es un componente aparte y diferido ────────────────────────
 * `MatSidenav`/`MatList` pesan lo suyo y **sólo hacen falta cuando alguien
 * pulsa la hamburguesa**, algo que no ocurre nunca en la pantalla del
 * templo. `MainLayoutComponent` lo monta con `@defer (when …)`, así que su
 * código viaja en un chunk propio que no entra en el arranque.
 *
 * Accesibilidad: `cdkTrapFocus` (CDK) confina el tabulador dentro del panel
 * mientras está abierto y devuelve el foco al botón que lo abrió al cerrar;
 * `role="dialog"` + `aria-modal` lo anuncian correctamente.
 */
@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslateModule,
    A11yModule,
    MatListModule,
    MatDividerModule,
    MatButtonModule,
    IconComponent,
    LangSwitcherComponent,
    ShareButtonComponent,
  ],
  template: `
    <div class="scrim" (click)="ui.closeDrawer()" aria-hidden="true"></div>

    <aside
      id="mobile-nav"
      class="drawer"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'nav.primary' | translate"
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="true"
    >
      <header class="drawer__head">
        <span class="drawer__title">{{ 'nav.primary' | translate }}</span>
        <button
          type="button"
          mat-icon-button
          [attr.aria-label]="'nav.close_menu' | translate"
          (click)="ui.closeDrawer()"
        >
          <app-icon name="close" />
        </button>
      </header>

      <nav class="drawer__body">
        @for (item of items; track item.id) {
          @if (isGroup(item)) {
            <p class="drawer__group">{{ item.labelKey | translate }}</p>
            <mat-nav-list>
              @for (child of item.children; track child.id) {
                <a
                  mat-list-item
                  [routerLink]="child.path"
                  [class.is-active]="activeIds().has(child.id)"
                  [attr.aria-current]="activeIds().has(child.id) ? 'page' : null"
                  (click)="ui.closeDrawer()"
                >
                  @if (child.icon) {
                    <app-icon matListItemIcon [name]="child.icon" />
                  }
                  <span matListItemTitle>{{ child.labelKey | translate }}</span>
                  @if (child.descriptionKey) {
                    <span matListItemLine>{{ child.descriptionKey | translate }}</span>
                  }
                </a>
              }
            </mat-nav-list>
            <mat-divider />
          } @else {
            <mat-nav-list>
              @if (isExternal(item)) {
                <a
                  mat-list-item
                  [href]="item.externalUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @if (item.icon) {
                    <app-icon matListItemIcon [name]="item.icon" />
                  }
                  <span matListItemTitle>{{ item.labelKey | translate }}</span>
                </a>
              } @else {
                <a
                  mat-list-item
                  [routerLink]="item.path"
                  [class.is-active]="activeIds().has(item.id)"
                  [attr.aria-current]="activeIds().has(item.id) ? 'page' : null"
                  (click)="ui.closeDrawer()"
                >
                  @if (item.icon) {
                    <app-icon matListItemIcon [name]="item.icon" />
                  }
                  <span matListItemTitle>{{ item.labelKey | translate }}</span>
                </a>
              }
            </mat-nav-list>
          }
        }
      </nav>

      <footer class="drawer__foot">
        <app-share-button />
        <app-lang-switcher />
      </footer>
    </aside>
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: var(--z-drawer);
        display: block;
      }

      .scrim {
        position: absolute;
        inset: 0;
        background: rgba(13, 31, 53, 0.45);
        animation: scrim-in var(--mo-fast) var(--ea-decelerate);
      }

      .drawer {
        position: absolute;
        inset-block: 0;
        inset-inline-end: 0;
        width: min(20rem, 86vw);
        display: flex;
        flex-direction: column;
        background: var(--c-surface);
        border-inline-start: 1px solid var(--c-hairline);
        box-shadow: var(--e-4);
        overflow-y: auto;
        overscroll-behavior: contain;
        animation: drawer-in var(--mo-base) var(--ea-decelerate);
      }

      .drawer__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sp-2);
        padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-5);
        border-bottom: 1px solid var(--c-hairline);
      }

      .drawer__title {
        font-family: var(--font-serif);
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--c-primary);
      }

      .drawer__body {
        flex: 1 1 auto;
        padding-bottom: var(--sp-4);
      }

      .drawer__group {
        margin: var(--sp-4) var(--sp-5) var(--sp-1);
        font-size: var(--fs-xs);
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--c-gold-deep);
      }

      .drawer__foot {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--sp-3);
        padding: var(--sp-4);
        border-top: 1px solid var(--c-hairline);
      }

      app-icon {
        font-size: 1.35rem;
        color: var(--c-primary-soft);
      }

      .is-active {
        background: var(--c-gold-tint);
        box-shadow: inset 3px 0 0 var(--c-gold-deep);
      }

      @keyframes scrim-in {
        from {
          opacity: 0;
        }
      }

      @keyframes drawer-in {
        from {
          transform: translateX(100%);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .scrim,
        .drawer {
          animation: none;
        }
      }
    `,
  ],
})
export class MobileNavComponent {
  protected readonly ui = inject(UiStore);
  protected readonly items = MAIN_NAV;
  protected readonly activeIds = inject(NavActiveService).activeIds;

  protected readonly isGroup = isNavGroup;
  protected readonly isExternal = isExternalNavItem;

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.ui.closeDrawer();
  }
}
