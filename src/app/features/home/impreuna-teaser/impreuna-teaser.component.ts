import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IMPREUNA_YOUTUBE } from '../../../core/impreuna/impreuna.config';
import { isFastingDay, localDateOfDay } from '../../../core/impreuna/impreuna-plan';
import { ImpreunaService } from '../../../core/impreuna/impreuna.service';
import { APP_PATHS } from '../../../core/navigation/app-paths';
import { ClockService } from '../../../core/services/clock.service';
import { LanguageService } from '../../../core/services/language.service';
import { BiblePassagesComponent } from '../../../shared/bible/bible-passages.component';
import { IconComponent } from '../../../shared/icon/icon.component';

/**
 * **Proiectul Împreună en la portada** — una franja que presenta el proyecto
 * y trae **lo de hoy**: el texto (abrir en la app Biblia si está, escuchar,
 * versículos y minutos: las mismas filas que en el módulo), la meditación en
 * vídeo y el ayuno del primer jueves; y lleva al módulo.
 *
 *  · Sólo con la edición en marcha (del 1 de enero al 31 de diciembre).
 *  · En la portada va con `@defer (on viewport)`: el servicio, los vídeos y
 *    los versículos no pesan en la carga inicial.
 *  · Si en Android falta la app, Chrome vuelve a la página del día del
 *    módulo (no aquí): allí está el aviso con Google Play.
 *
 * Docs: 32-impreuna.md → «En la portada».
 */
@Component({
  selector: 'app-impreuna-teaser',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent, BiblePassagesComponent],
  templateUrl: './impreuna-teaser.component.html',
  styleUrl: './impreuna-teaser.component.scss',
})
export class ImpreunaTeaserComponent {
  private readonly impreuna = inject(ImpreunaService);
  private readonly language = inject(LanguageService);
  private readonly clock = inject(ClockService);

  protected readonly path = ['/', APP_PATHS.impreuna];
  protected readonly year = this.impreuna.edition.year;
  protected readonly total = this.impreuna.edition.total;

  /** Hoy en la edición, listo para pintar; `null` fuera de ella (la franja no sale). */
  protected readonly today = computed(() => {
    const { status, day } = this.impreuna.today();
    if (status !== 'running') return null;
    const view = this.impreuna.view(day);
    if (!view) return null;
    const locale = this.language.current() === 'ro' ? 'ro-RO' : 'es-ES';
    const video = view.media?.video ?? null;
    return {
      view,
      date: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
        localDateOfDay(this.year, day),
      ),
      percent: Math.round((day / this.total) * 100),
      fast: isFastingDay(this.year, day)
        ? 'today'
        : day < this.total && isFastingDay(this.year, day + 1)
          ? 'tomorrow'
          : null,
      // `mqdefault` (320 × 180) existe siempre y basta para la miniatura.
      thumb: video ? IMPREUNA_YOUTUBE.thumbs(video)[1] : null,
      returnPath: `${APP_PATHS.impreuna}/${APP_PATHS.impreunaDay}/${day}`,
      tomorrow: day < this.total ? { day: day + 1, reading: this.impreuna.view(day + 1)?.reading ?? '' } : null,
    };
  });

  /** Lo suyo, si ya marca lo que lee en el módulo: la racha o lo leído (nada si aún no). */
  protected readonly mine = computed(() => {
    const streak = this.impreuna.streak();
    if (streak > 1) return { key: 'home.impreuna.streak', count: streak };
    if (streak === 1) return { key: 'home.impreuna.streak_one', count: 1 };
    const read = this.impreuna.readCount();
    return read > 0 ? { key: 'home.impreuna.read_count', count: read } : null;
  });

  protected dayPath(day: number): readonly (string | number)[] {
    return ['/', APP_PATHS.impreuna, APP_PATHS.impreunaDay, day];
  }

  constructor() {
    // Como en el módulo: si a hoy le falta el vídeo (lo suben a las 23:15),
    // se pregunta a YouTube, como mucho cada 30 minutos.
    effect(() => {
      this.clock.now();
      untracked(() => this.impreuna.refresh());
    });
  }
}
