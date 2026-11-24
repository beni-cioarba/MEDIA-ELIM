import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { AppLanguage, LanguageService } from '../../core/services/language.service';
import { LangSwitcherComponent } from './lang-switcher.component';

class FakeLanguage {
  readonly current = signal<AppLanguage>('ro');
  readonly supported: readonly AppLanguage[] = ['ro', 'es'];
  readonly used: AppLanguage[] = [];
  use(code: AppLanguage): Promise<void> {
    this.used.push(code);
    this.current.set(code);
    return Promise.resolve();
  }
}

async function render(variant: 'toggle' | 'segmented') {
  const language = new FakeLanguage();
  TestBed.configureTestingModule({
    imports: [LangSwitcherComponent],
    providers: [provideTranslateService(), { provide: LanguageService, useValue: language }],
  });
  const fixture = TestBed.createComponent(LangSwitcherComponent);
  fixture.componentRef.setInput('variant', variant);
  await fixture.whenStable();
  return { fixture, language, el: fixture.nativeElement as HTMLElement };
}

describe('LangSwitcherComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('en la cabecera ofrece sólo el otro idioma, con su nombre en su lengua', async () => {
    const { el } = await render('toggle');
    const buttons = el.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].getAttribute('aria-label')).toBe('Español');
    expect(buttons[0].getAttribute('lang')).toBe('es');
  });

  it('al pulsarlo cambia y el mismo botón (con el foco) pasa a ofrecer la vuelta', async () => {
    const { el, fixture, language } = await render('toggle');
    const button = el.querySelector('button')!;
    button.click();
    await fixture.whenStable();
    expect(language.used).toEqual(['es']);
    expect(el.querySelector('button')).toBe(button);
    expect(button.getAttribute('aria-label')).toBe('Română');
  });

  it('en el cajón enseña los dos y señala el activo; pulsar el activo no hace nada', async () => {
    const { el, fixture, language } = await render('segmented');
    const [ro, es] = [...el.querySelectorAll('button')];
    expect([ro, es].map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    ro.click();
    expect(language.used).toEqual([]);
    es.click();
    await fixture.whenStable();
    expect([ro, es].map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
  });
});
