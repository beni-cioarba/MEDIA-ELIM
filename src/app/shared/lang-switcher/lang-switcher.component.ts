import { ChangeDetectionStrategy, Component, inject, signal, HostListener, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AppLanguage, LanguageService } from '../../core/services/language.service';

interface LangOption {
  readonly code: AppLanguage;
  readonly label: string;
  readonly svgFlagRaw: string;
  svgFlag?: SafeHtml;
}

@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lang-dropdown" [class.is-open]="isOpen()">
      <button
        type="button"
        class="lang-dropdown__toggle"
        (click)="toggleDropdown()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-label]="'lang.label' | translate"
      >
        <span class="lang-flag" [innerHTML]="activeOption().svgFlag" aria-hidden="true"></span>
        <span class="lang-code">{{ activeOption().code.toUpperCase() }}</span>
        <svg class="lang-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <div class="lang-dropdown__menu" *ngIf="isOpen()">
        <button
          *ngFor="let opt of options"
          type="button"
          class="lang-dropdown__item"
          [class.lang-dropdown__item--active]="lang.current() === opt.code"
          (click)="selectLang(opt.code)"
          [title]="opt.label"
        >
          <span class="lang-flag" [innerHTML]="opt.svgFlag" aria-hidden="true"></span>
          <span class="lang-label">{{ opt.label }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }
      .lang-dropdown {
        position: relative;
      }
      .lang-dropdown__toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.8rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #f4f1ea;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: all 0.2s ease;
      }
      .lang-dropdown__toggle:hover, .lang-dropdown.is-open .lang-dropdown__toggle {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.25);
      }
      .lang-chevron {
        transition: transform 0.2s ease;
        opacity: 0.7;
      }
      .lang-dropdown.is-open .lang-chevron {
        transform: rotate(180deg);
      }
      .lang-dropdown__menu {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        min-width: 140px;
        background: rgba(10, 15, 30, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        padding: 0.4rem;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        z-index: 50;
        animation: drop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        transform-origin: top right;
      }
      @keyframes drop-in {
        from { opacity: 0; transform: scale(0.95) translateY(-5px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .lang-dropdown__item {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.6rem 0.8rem;
        border-radius: 8px;
        background: transparent;
        border: none;
        color: rgba(244, 241, 234, 0.8);
        cursor: pointer;
        text-align: left;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.2s ease;
        width: 100%;
      }
      .lang-dropdown__item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #f4f1ea;
      }
      .lang-dropdown__item--active {
        background: rgba(230, 179, 90, 0.15);
        color: #e6b35a;
        font-weight: 600;
      }
      .lang-flag {
        display: inline-flex;
        width: 20px;
        height: 14px;
        border-radius: 2px;
        overflow: hidden;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
        flex-shrink: 0;
      }
      .lang-flag :global(svg),
      .lang-flag svg { width: 100%; height: 100%; display: block; object-fit: cover; }
    `,
  ],
})
export class LangSwitcherComponent implements OnInit {
  protected readonly lang = inject(LanguageService);
  private readonly elementRef = inject(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);
  
  protected readonly isOpen = signal(false);

  protected readonly options: LangOption[] = [
    {
      code: 'ro',
      label: 'Română',
      svgFlagRaw:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="#002B7F"/><rect width="2" height="2" x="1" fill="#FCD116"/><rect width="1" height="2" x="2" fill="#CE1126"/></svg>',
    },
    {
      code: 'es',
      label: 'Español',
      svgFlagRaw:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="#c60b1e"/><rect width="3" height="1" y="0.5" fill="#ffc400"/></svg>',
    },
  ];

  ngOnInit() {
    this.options.forEach(opt => {
      opt.svgFlag = this.sanitizer.bypassSecurityTrustHtml(opt.svgFlagRaw);
    });
  }

  protected activeOption() {
    return this.options.find((o) => o.code === this.lang.current()) || this.options[0];
  }

  protected toggleDropdown() {
    this.isOpen.update((v) => !v);
  }

  protected selectLang(code: AppLanguage) {
    this.lang.use(code);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
