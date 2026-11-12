import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { DayKind } from '../../../core/impreuna/impreuna-plan';
import { parseReading } from '../../../core/bible/bible-refs';
import { ClockService } from '../../../core/services/clock.service';
import { PwaInstallService } from '../../../core/services/pwa-install.service';
import { InstallPlatform } from '../../../core/util/install-platform';
import { DayReadComponent } from './day-read.component';

/** Jueves 12/11/2026 (día 316). */
class FixedClock {
  readonly now = signal(new Date(2026, 10, 12, 10).getTime());
  readonly pageVisible = signal(true);
}

interface Options {
  readonly reading?: string;
  readonly kind?: DayKind;
  readonly platform?: InstallPlatform;
  readonly query?: Record<string, string>;
}

function render(options: Options = {}): {
  fixture: ComponentFixture<DayReadComponent>;
  el: HTMLElement;
  navigate: ReturnType<typeof vi.fn>;
} {
  const navigate = vi.fn(async () => true);
  TestBed.configureTestingModule({
    imports: [DayReadComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTranslateService(),
      { provide: ClockService, useClass: FixedClock },
      {
        provide: PwaInstallService,
        useValue: { env: { platform: options.platform ?? 'desktop-chromium', device: 'phone', safariVersion: null } },
      },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(options.query ?? {}) } } },
      { provide: Router, useValue: { navigate } },
    ],
  });
  const fixture = TestBed.createComponent(DayReadComponent);
  fixture.componentRef.setInput('refs', parseReading(options.reading ?? 'JAS.2'));
  fixture.componentRef.setInput('day', 316);
  fixture.componentRef.setInput('youversionDay', 317);
  fixture.componentRef.setInput('kind', options.kind ?? 'nt');
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, navigate };
}

const rows = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.bp__item')];
const openLink = (el: HTMLElement, i = 0) => rows(el)[i].querySelector<HTMLAnchorElement>('.bp__open')!;
const versionButtons = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('.bo__version')];

describe('DayReadComponent (citirea zilei: filas, opciones y pie juntos)', () => {
  beforeEach(() => {
    localStorage.removeItem('elim.bible.app');
    localStorage.removeItem('elim.bible.version');
  });
  afterEach(() => TestBed.resetTestingModule());

  it('un texto: leer (con versículos y minutos) y escuchar; en el ordenador, bible.com en otra pestaña', () => {
    const { el } = render();
    expect(rows(el).length).toBe(1);
    expect(el.querySelector('.bp__head')).toBeNull();
    const open = openLink(el);
    expect(open.textContent).toContain('bible_app.read');
    expect(open.querySelector('.bp__meta')!.textContent).toContain('bible_app.verses_other'); // 26 → «de versete»
    expect(open.querySelector('.bp__meta')!.textContent).toContain('≈ 3 min');
    expect(open.getAttribute('href')).toBe('https://www.bible.com/bible/191/JAS.2.VDC');
    expect(open.getAttribute('target')).toBe('_blank');
    expect(rows(el)[0].querySelector('.bp__listen')!.getAttribute('href')).toBe(
      'https://www.bible.com/audio-bible/191/JAS.2.VDC',
    );
    expect(el.querySelector('.rd__chip, .bo__chip')!.getAttribute('href')).toBe('https://www.bible.com/reading-plans/43657/day/317');
    expect(el.querySelector('.bo__chip--install')).toBeNull();
  });

  it('varios textos: total arriba y una fila por texto, en oro los de Psalmi y Proverbe', () => {
    const { el } = render({ reading: 'PSA.126;PSA.127;PRO.26.22-28', kind: 'wisdom' });
    expect(el.querySelector('app-bible-passages')!.classList).toContain('is-wisdom');
    expect(el.querySelector('.bp__head')!.textContent).toContain('impreuna.read.today_multi');
    expect(rows(el).length).toBe(3);
    expect(openLink(el, 0).textContent).toContain('Psalmul 126');
    expect(openLink(el, 0).querySelector('.bp__meta')!.textContent).toContain('bible_app.verses_few'); // 6 versete
    expect(openLink(el, 2).getAttribute('href')).toBe('https://www.bible.com/bible/191/PRO.26.22-28.VDC');
  });

  it('la versión se cambia en el pie y cambia todos los enlaces', () => {
    const { fixture, el } = render();
    const [ro, es] = versionButtons(el);
    expect(ro.getAttribute('aria-pressed')).toBe('true');
    es.click();
    fixture.detectChanges();
    expect(es.getAttribute('aria-pressed')).toBe('true');
    expect(openLink(el).getAttribute('href')).toBe('https://www.bible.com/bible/149/JAS.2.RVR1960');
    expect(rows(el)[0].querySelector('.bp__listen')!.getAttribute('href')).toContain('/audio-bible/149/');
  });

  it('Android: intent a la app, en la misma pestaña y con la vuelta a esta página', () => {
    const { el } = render({ platform: 'android-chromium' });
    const href = openLink(el).getAttribute('href')!;
    expect(href).toMatch(/^intent:\/\/www\.bible\.com\/bible\/191\/JAS\.2\.VDC#Intent;/);
    expect(decodeURIComponent(href)).toContain('/impreuna/ziua/316?biblia=lipsa&text=JAS.2');
    expect(openLink(el).hasAttribute('target')).toBe(false);
  });

  it('Android sin la app: aviso con Google Play o leer ya, dirección limpia y «Am instalat-o»', async () => {
    const { fixture, el, navigate } = render({ platform: 'android-chromium', query: { biblia: 'lipsa', text: 'JAS.2' } });
    const alert = el.querySelector('.bp__alert')!;
    expect(alert.textContent).toContain('bible_app.missing_title');
    const [store, web] = [...alert.querySelectorAll('a')];
    expect(store.getAttribute('href')).toBe('https://play.google.com/store/apps/details?id=com.sirma.mobile.bible.android');
    expect(web.getAttribute('href')).toBe('https://www.bible.com/bible/191/JAS.2.VDC');
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { biblia: null, text: null }, replaceUrl: true }),
    );
    // Ya se sabe: el texto se abre en el navegador y el pie ofrece instalarla.
    expect(openLink(el).getAttribute('href')).toBe('https://www.bible.com/bible/191/JAS.2.VDC');
    expect(el.querySelector('.bo__chip--install')).not.toBeNull();

    el.querySelector<HTMLButtonElement>('.bo__reset')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.bo__chip--install')).toBeNull();
    expect(openLink(el).getAttribute('href')).toMatch(/^intent:/);

    el.querySelector<HTMLButtonElement>('.bp__close')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.bp__alert')).toBeNull();
  });

  it('un ?text= raro no se cuela: el aviso usa el primer texto del día', () => {
    const { el } = render({ platform: 'android-chromium', query: { biblia: 'lipsa', text: 'javascript:alert(1)' } });
    const web = el.querySelectorAll('.bp__alert a')[1];
    expect(web.getAttribute('href')).toBe('https://www.bible.com/bible/191/JAS.2.VDC');
  });

  it('iPhone: no se puede saber si está la app; la App Store queda discreta en el pie', () => {
    const { el } = render({ platform: 'ios-safari' });
    const chip = [...el.querySelectorAll('.rd__chip, .bo__chip')].find((a) => a.getAttribute('href')?.includes('apps.apple.com'));
    expect(chip).toBeTruthy();
    expect(chip!.classList).not.toContain('bo__chip--install');
  });
});
