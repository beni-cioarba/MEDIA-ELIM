import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeModule } from 'angularx-qrcode';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CHURCH_CONFIG } from '../../core/church.config';
import { PresentationService } from '../../core/presentation.service';
import { SocialLink } from '../../core/social-link.model';
import { YouTubeService } from '../../core/youtube.service';
import { SocialIconComponent } from '../../shared/social-icon/social-icon.component';
import { LangSwitcherComponent } from '../../shared/lang-switcher/lang-switcher.component';

/**
 * Pantalla principal de la web — pensada como una "diapositiva" estática
 * para proyectar en la iglesia: marca, redes sociales, QR y logo.
 *
 * Características clave:
 *  - i18n completo (ES/RO) vía `@ngx-translate/core`.
 *  - QR generado con la URL pública actual (configurable en `church.config.ts`).
 *  - Modo presentación a pantalla completa (Fullscreen API) con tecla `F`.
 *  - Resaltado rotatorio sutil entre redes para que la pantalla "viva".
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    QRCodeModule,
    TranslateModule,
    SocialIconComponent,
    LangSwitcherComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  protected readonly config = inject(CHURCH_CONFIG);
  protected readonly presentation = inject(PresentationService);
  protected readonly youtube = inject(YouTubeService);
  private readonly translate = inject(TranslateService);

  /** Reacciona ante cambios de idioma para recomputar etiquetas i18n. */
  private readonly langChange = toSignal(this.translate.onLangChange, { initialValue: null });

  /** Índice de la tarjeta resaltada actualmente (rota cada 4s). */
  protected readonly highlightedIndex = signal<number>(0);

  /** URL final que se codifica en el QR. */
  protected readonly qrData = computed<string>(() => this.resolveQrUrl());

  protected readonly fullscreen = this.presentation.isFullscreen;

  /** Aria-label pre-traducido para cada red social (recomputa al cambiar idioma). */
  protected readonly socialAria = computed<Record<string, string>>(() => {
    this.langChange();
    const out: Record<string, string> = {};
    for (const s of this.config.socials) {
      const name = this.translate.instant(`socials.items.${s.i18nKey}.name`);
      out[s.id] = this.translate.instant('socials.open_aria', { name });
    }
    return out;
  });

  ngOnInit(): void {
    this.youtube.start();
    setInterval(() => {
      const total = this.config.socials.length;
      this.highlightedIndex.update((i) => (i + 1) % total);
    }, 4_000);
  }

  /**
   * Atajos de teclado pensados para el portátil que controla la presentación:
   *  - F: alterna pantalla completa.
   *  - Esc: el navegador la cierra automáticamente.
   */
  @HostListener('window:keydown', ['$event'])
  handleKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.presentation.isSimulated()) {
      event.preventDefault();
      this.presentation.exitSimulatedIfActive();
      return;
    }
    if (event.key === 'f' || event.key === 'F') {
      // Evita interceptar combinaciones del navegador (Ctrl+F, etc.).
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      void this.presentation.toggle();
    }
  }

  protected toggleFullscreen(): void {
    void this.presentation.toggle();
  }

  protected trackBySocial(_: number, item: SocialLink): string {
    return item.id;
  }

  protected trackByVideo(_: number, item: { id: string }): string {
    return item.id;
  }

  protected gradient(link: SocialLink): string {
    const [from, to] = link.gradient;
    return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
  }

  /**
   * Resuelve la URL a codificar en el QR.
   * Ahora está forzado a usar la URL public din `church.config.ts` pentru a
   * garanta mereu redirecționarea la producție, chiar dacă e rulat pe localhost.
   */
  private resolveQrUrl(): string {
    return this.config.publicUrl;
  }
}
