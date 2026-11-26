import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { StoryVideo } from '../../../core/departments.config';
import { IconComponent } from '../../../shared/icon/icon.component';

/**
 * Vídeo destacado de una crónica (`DepartmentStory.video`), dentro de la página.
 *
 *  - ▶ / ❚❚ reproduce **ahí mismo**, sin salir de la página.
 *  - Pantalla completa o clic en la imagen → `expand` con el segundo actual:
 *    la crónica abre la **galería de su grupo** en este vídeo y desde ahí.
 *
 * Controles propios en vez de los nativos: la pantalla completa del
 * reproductor del navegador no hacía nada dentro de la tarjeta y, además,
 * sacaba el vídeo de su grupo (sin ‹ ›, miniaturas ni autorreproducción).
 * `start` recorta un arranque defectuoso: no se ve nunca lo anterior.
 */
@Component({
  selector: 'app-reel-player',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <video
      #player
      class="rp__video"
      [src]="video().start ? video().src + '#t=' + video().start : video().src"
      [poster]="video().poster"
      [attr.width]="video().width"
      [attr.height]="video().height"
      [attr.aria-label]="label()"
      preload="none"
      playsinline
      (click)="openGallery()"
      (play)="playing.set(true)"
      (pause)="playing.set(false)"
      (seeking)="clampStart()"
      (timeupdate)="onTime()"
      (ended)="progress.set(0)"
    ></video>

    <div class="rp__bar">
      <button
        type="button"
        class="rp__btn"
        [attr.aria-label]="(playing() ? 'departments.video_pause' : 'departments.video_play') | translate"
        [title]="(playing() ? 'departments.video_pause' : 'departments.video_play') | translate"
        (click)="toggle()"
      >
        <app-icon [name]="playing() ? 'pause' : 'play'" />
      </button>
      <span class="rp__track" aria-hidden="true">
        <span class="rp__fill" [style.transform]="'scaleX(' + progress() + ')'"></span>
      </span>
      <button
        type="button"
        class="rp__btn"
        [attr.aria-label]="'departments.video_expand' | translate"
        [title]="'departments.video_expand' | translate"
        (click)="openGallery()"
      >
        <app-icon name="fullscreen" />
      </button>
    </div>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      aspect-ratio: 9 / 16;
      overflow: hidden;
      background: var(--c-primary-darkest);
    }

    .rp__video {
      position: absolute;
      inset: 0;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: zoom-in;
    }

    /* Barra sobre un degradado: legible sobre cualquier fotograma. */
    .rp__bar {
      position: absolute;
      inset: auto 0 0;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 1.75rem 0.45rem 0.45rem;
      background: linear-gradient(transparent, rgb(6 18 40 / 0.72));
      pointer-events: none;
    }

    .rp__btn {
      display: grid;
      flex: none;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: rgb(6 18 40 / 0.62);
      color: #fff;
      font-size: 1rem;
      cursor: pointer;
      pointer-events: auto;
      transition: transform var(--mo-base) var(--ea-standard), background var(--mo-base) var(--ea-standard);

      &:hover {
        background: rgb(6 18 40 / 0.85);
        transform: scale(1.08);
      }

      &:focus-visible {
        outline: 2px solid var(--c-gold);
        outline-offset: 2px;
      }
    }

    .rp__track {
      position: relative;
      flex: 1;
      height: 3px;
      overflow: hidden;
      border-radius: 2px;
      background: rgb(255 255 255 / 0.3);
    }

    .rp__fill {
      position: absolute;
      inset: 0;
      background: var(--c-gold);
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 250ms linear;
    }

    @media (prefers-reduced-motion: reduce) {
      .rp__btn,
      .rp__fill {
        transition: none;
      }
    }
  `,
})
export class ReelPlayerComponent {
  readonly video = input.required<StoryVideo>();
  /** Nombre accesible del vídeo (pie de la crónica). */
  readonly label = input('');
  /** Abrir la galería en este vídeo, desde el segundo dado. */
  readonly expand = output<number>();

  private readonly element = viewChild.required<ElementRef<HTMLVideoElement>>('player');

  protected readonly playing = signal(false);
  protected readonly progress = signal(0);

  protected toggle(): void {
    const el = this.element().nativeElement;
    if (el.paused) void el.play().catch(() => this.playing.set(false));
    else el.pause();
  }

  protected openGallery(): void {
    const el = this.element().nativeElement;
    el.pause();
    this.expand.emit(el.ended ? 0 : el.currentTime);
  }

  protected clampStart(): void {
    const el = this.element().nativeElement;
    const start = this.video().start;
    if (start && el.currentTime < start - 0.05) el.currentTime = start;
  }

  protected onTime(): void {
    this.clampStart();
    const el = this.element().nativeElement;
    this.progress.set(el.duration > 0 ? el.currentTime / el.duration : 0);
  }
}
