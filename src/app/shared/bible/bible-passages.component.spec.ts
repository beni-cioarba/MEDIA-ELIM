import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { parseRomanianPassage } from '../../core/bible/bible-refs';
import { PwaInstallService } from '../../core/services/pwa-install.service';
import { InstallPlatform } from '../../core/util/install-platform';
import { BiblePassagesComponent, pluralKey } from './bible-passages.component';

function render(
  text: string,
  options: { heading?: string | null; returnPath?: string; platform?: InstallPlatform } = {},
): { fixture: ComponentFixture<BiblePassagesComponent>; el: HTMLElement } {
  TestBed.configureTestingModule({
    imports: [BiblePassagesComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTranslateService(),
      {
        provide: PwaInstallService,
        useValue: { env: { platform: options.platform ?? 'desktop-chromium', device: 'phone', safariVersion: null } },
      },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      { provide: Router, useValue: { navigate: vi.fn(async () => true) } },
    ],
  });
  const fixture = TestBed.createComponent(BiblePassagesComponent);
  fixture.componentRef.setInput('refs', parseRomanianPassage(text));
  fixture.componentRef.setInput('returnPath', options.returnPath ?? 'media/citirea-bibliei');
  fixture.componentRef.setInput('heading', options.heading ?? null);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

const labels = (el: HTMLElement) => [...el.querySelectorAll('.bp__label')].map((l) => l.textContent!.trim());

describe('BiblePassagesComponent (filas de lectura compartidas)', () => {
  beforeEach(() => localStorage.removeItem('elim.bible.app'));
  afterEach(() => TestBed.resetTestingModule());

  it('un tramo del plan de la iglesia: un capítulo por fila, con su nombre bajo el rótulo y el total', () => {
    const { el } = render('Isaia 43-44', { heading: 'Azi · Isaia 43–44' });
    expect(labels(el)).toEqual(['Isaia 43', 'Isaia 44']);
    const head = el.querySelector('.bp__head')!.textContent!;
    expect(head).toContain('Azi · Isaia 43–44');
    expect(head).toContain('bible_app.verses_other'); // 28 + 24 = 52 → «de versete»
    expect(head).toMatch(/≈ \d+ min/);
    expect(el.querySelector('.bp__open')!.getAttribute('href')).toBe('https://www.bible.com/bible/191/ISA.43.VDC');
  });

  it('una sola fila sin rótulo dice «Citește …» y no pinta cabecera', () => {
    const { el } = render('Ezechiel 1');
    expect(el.querySelector('.bp__head')).toBeNull();
    expect(labels(el)[0]).toContain('bible_app.read');
  });

  it('en Android vuelve a la página que la pintó (returnPath), con el texto pedido', () => {
    const { el } = render('Daniel 3', { platform: 'android-chromium', returnPath: 'media/citirea-bibliei' });
    const href = decodeURIComponent(el.querySelector('.bp__open')!.getAttribute('href')!);
    expect(href).toMatch(/^intent:\/\/www\.bible\.com\/bible\/191\/DAN\.3\.VDC#Intent;/);
    expect(href).toContain('/media/citirea-bibliei?biblia=lipsa&text=DAN.3');
  });

  it('plurales: rumano 1 · 2–19 · 20+ («de versete»), español 1 · resto', () => {
    const ro = new Intl.PluralRules('ro');
    const es = new Intl.PluralRules('es');
    expect([1, 6, 19, 20, 26, 101, 120].map((n) => pluralKey(ro, n))).toEqual([
      'one',
      'few',
      'few',
      'other',
      'other',
      'few',
      'other',
    ]);
    expect([1, 6, 26].map((n) => pluralKey(es, n))).toEqual(['one', 'other', 'other']);
  });
});
