import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { CHURCH_CONFIG, DEFAULT_CHURCH_CONFIG } from '../../../core/church.config';
import { ImpreunaService } from '../../../core/impreuna/impreuna.service';
import { PUSH_PROVIDER } from '../../../core/push/push-client';
import {
  FakePushProvider,
  fakeNotification,
  flushPromises,
  stubPushBrowser,
  unstubPushBrowser,
} from '../../../core/push/push.testing';
import { ClockService } from '../../../core/services/clock.service';
import { ImpreunaReminderComponent } from './impreuna-reminder.component';

/** Jueves 12/11/2026 a media mañana: el próximo aviso es el del viernes 13 (día 317). */
class FixedClock {
  readonly now = signal(new Date(2026, 10, 12, 10).getTime());
  readonly pageVisible = signal(true);
}

const STORAGE_KEY = 'elim.push.topics';

interface Options {
  readonly appId?: string;
  /** El navegador tiene web push (por defecto, sí). */
  readonly capable?: boolean;
  readonly permission?: NotificationPermission;
  readonly stored?: string;
}

function render(options: Options = {}): {
  fixture: ComponentFixture<ImpreunaReminderComponent>;
  el: HTMLElement;
  provider: FakePushProvider;
} {
  if (options.capable !== false) stubPushBrowser();
  if (options.permission) fakeNotification.permission = options.permission;
  if (options.stored) localStorage.setItem(STORAGE_KEY, options.stored);
  const provider = new FakePushProvider();
  TestBed.configureTestingModule({
    imports: [ImpreunaReminderComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTranslateService(),
      { provide: ClockService, useClass: FixedClock },
      { provide: CHURCH_CONFIG, useValue: { ...DEFAULT_CHURCH_CONFIG, oneSignalAppId: options.appId ?? 'app-test' } },
      { provide: PUSH_PROVIDER, useValue: provider },
    ],
  });
  const fixture = TestBed.createComponent(ImpreunaReminderComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, provider };
}

const toggle = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('[role="switch"]');
const text = (el: HTMLElement) => el.querySelector('#rem-text')?.textContent ?? '';

async function click(fixture: ComponentFixture<ImpreunaReminderComponent>): Promise<void> {
  toggle(fixture.nativeElement)!.click();
  await flushPromises();
  fixture.detectChanges();
}

describe('ImpreunaReminderComponent (amintire zilnică)', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => {
    unstubPushBrowser();
    TestBed.resetTestingModule();
  });

  it('sin App ID de OneSignal no se pinta ni ocupa hueco', () => {
    const { el } = render({ appId: '' });
    expect(el.querySelector('.rem')).toBeNull();
    expect(el.classList).toContain('is-hidden');
  });

  it('apagado: explica qué llega y con quién; toda la tarjeta es un interruptor', () => {
    const { el } = render();
    const button = toggle(el)!;
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(button.getAttribute('aria-labelledby')).toBe('rem-title');
    expect(el.querySelector('#rem-title')?.tagName).toBe('H2');
    expect(text(el)).toContain('impreuna.reminder.lead');
    expect(el.querySelector('.rem__note')?.textContent).toContain('impreuna.reminder.privacy');
  });

  it('al activarlo: alta con aviso de bienvenida y la próxima lectura a la vista', async () => {
    const { fixture, el, provider } = render();
    await click(fixture);

    expect(toggle(el)!.getAttribute('aria-checked')).toBe('true');
    expect(text(el)).toContain('impreuna.reminder.done');
    const tomorrow = TestBed.inject(ImpreunaService).view(317)!.reading;
    expect(el.querySelector('.rem__next')?.textContent).toContain(tomorrow);
    expect(el.querySelector('.rem__next')?.textContent).toContain('impreuna.reminder.tomorrow');
    expect(el.querySelector('[role="status"]')?.textContent).toContain('impreuna.reminder.done');
    expect(provider.connects[0].welcome).toEqual({
      title: 'impreuna.push.welcome_title',
      message: 'impreuna.push.welcome',
      url: 'https://elimarganda.com/impreuna',
    });
    expect(el.querySelector('.rem')?.classList).toContain('is-on');
  });

  it('activo al abrir la página (sin red) y se puede apagar', async () => {
    const { fixture, el, provider } = render({ permission: 'granted', stored: '{"impreuna":"ro"}' });
    expect(toggle(el)!.getAttribute('aria-checked')).toBe('true');
    expect(text(el)).toContain('impreuna.reminder.on');

    await click(fixture);
    expect(toggle(el)!.getAttribute('aria-checked')).toBe('false');
    expect(text(el)).toContain('impreuna.reminder.stopped');
    expect(provider.client.opted).toBe(false);
  });

  it('si se cierra el permiso sin aceptar, lo dice y sigue apagado', async () => {
    const { fixture, el } = render();
    fakeNotification.answer = 'default';
    await click(fixture);
    expect(toggle(el)!.getAttribute('aria-checked')).toBe('false');
    expect(text(el)).toContain('impreuna.reminder.dismissed');
  });

  it('permiso bloqueado: sin interruptor, con cómo desbloquearlo', () => {
    const { el } = render({ permission: 'denied' });
    expect(toggle(el)).toBeNull();
    expect(text(el)).toContain('impreuna.reminder.blocked');
    expect(el.querySelector('.rem')?.classList).toContain('is-blocked');
  });

  it('navegador sin web push: lo explica en vez de un control que no funcionaría', () => {
    const { el } = render({ capable: false });
    expect(toggle(el)).toBeNull();
    expect(text(el)).toContain('impreuna.reminder.unsupported');
  });
});
