import { CUSTOM_ELEMENTS_SCHEMA, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiStore } from '../../core/state/ui.store';
import { SwipeTabsDirective } from './swipe-tabs.directive';
import { TabDirection, TabNavService, TabPeek } from './tab-nav.service';

/** Pestañas y navegación de mentira: lo que leen la directiva y el test. */
class FakeTabNav {
  readonly tabs = ['/', '/biserica', '/program', '/departamente', '/multimedia', '/contact'].map((path, i) => ({
    id: `t${i}`,
    path,
    labelKey: path,
  }));
  readonly activeIndex = signal(1);
  readonly peek = signal<TabPeek | null>(null);
  readonly go = vi.fn((d: TabDirection) => {
    this.activeIndex.update((i) => i + (d === 'next' ? 1 : -1));
    return Promise.resolve(true);
  });
  neighbor(d: TabDirection) {
    return this.tabs[this.activeIndex() + (d === 'next' ? 1 : -1)] ?? null;
  }
}

@Component({
  imports: [SwipeTabsDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div appSwipeTabs>
      <main>
        <p class="texto">contenido</p>
        <app-hero-carousel><p class="hero">portada</p></app-hero-carousel>
      </main>
      <app-swipe-peek>
        @for (i of [0, 1, 2, 3, 4, 5]; track i) {
          <div class="peek__slot"></div>
        }
      </app-swipe-peek>
      <app-tab-bar><span class="tabs__indicator"></span></app-tab-bar>
    </div>
  `,
})
class Host {}

const W = 1000;
let reloj = 0;

/** Un evento táctil de un dedo (jsdom no tiene `Touch`). */
function tocar(target: Element, type: string, x: number, y: number, dedos = 1): void {
  const e = new Event(type, { bubbles: true });
  const touch = { clientX: x, clientY: y };
  const lista = type === 'touchend' || type === 'touchcancel' ? [] : Array.from({ length: dedos }, () => touch);
  Object.defineProperty(e, 'touches', { value: lista });
  Object.defineProperty(e, 'timeStamp', { value: reloj });
  target.dispatchEvent(e);
}

describe('SwipeTabsDirective', () => {
  const originalMatchMedia = window.matchMedia;
  let tabs: FakeTabNav;
  let reducido: boolean;
  let root: HTMLElement;
  let texto: HTMLElement;

  /** Arrastre horizontal de `dx` px en `pasos` movimientos de `ms` cada uno. */
  async function arrastrar(target: Element, dx: number, { pasos = 6, ms = 20, soltar = true, y = 300 } = {}) {
    const x0 = dx < 0 ? W - 100 : 100;
    tocar(target, 'touchstart', x0, y);
    for (let i = 1; i <= pasos; i++) {
      reloj += ms;
      await vi.advanceTimersByTimeAsync(ms);
      tocar(target, 'touchmove', x0 + (dx * i) / pasos, y);
    }
    if (soltar) tocar(target, 'touchend', x0 + dx, y);
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    reloj = 0;
    reducido = false;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduced-motion') ? reducido : true,
      media: query,
    })) as never;
    Object.defineProperty(window, 'innerWidth', { value: W, configurable: true });
    document.elementFromPoint = () => texto;
    window.scrollTo = vi.fn() as never;
    tabs = new FakeTabNav();
    TestBed.configureTestingModule({
      providers: [
        { provide: TabNavService, useValue: tabs },
        { provide: UiStore, useValue: { drawerOpen: () => false } },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    root = document.documentElement;
    texto = fixture.nativeElement.querySelector('.texto');
    document.body.appendChild(fixture.nativeElement);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
    root.className = '';
  });

  it('cambia de pestaña al pasar del 40 % y deja todo limpio', async () => {
    await arrastrar(texto, -500);
    expect(root.classList).toContain('is-swiping');
    expect(document.querySelector('.peek__slot[data-shown="next"]')).toBe(document.querySelectorAll('.peek__slot')[2]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(tabs.go).toHaveBeenCalledWith('next');
    expect(tabs.activeIndex()).toBe(2);
    expect(root.className).toBe('');
    expect(document.querySelector('[data-shown]')).toBeNull();
    expect(tabs.peek()).toBeNull();
  });

  it('un arrastre corto y lento vuelve a su sitio sin navegar', async () => {
    await arrastrar(texto, -150, { pasos: 6, ms: 80 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(tabs.go).not.toHaveBeenCalled();
    expect(root.className).toBe('');
  });

  it('un gesto vertical es scroll, no cambio de pestaña', async () => {
    tocar(texto, 'touchstart', 500, 300);
    reloj += 20;
    tocar(texto, 'touchmove', 505, 360);
    tocar(texto, 'touchmove', 300, 380);
    tocar(texto, 'touchend', 300, 380);
    await vi.advanceTimersByTimeAsync(1000);
    expect(tabs.go).not.toHaveBeenCalled();
    expect(root.classList).not.toContain('is-swiping');
  });

  it('sobre el carrusel de la portada no cambia de pestaña (tiene su propio deslizar)', async () => {
    await arrastrar(document.querySelector('.hero')!, -600);
    await vi.advanceTimersByTimeAsync(1000);
    expect(tabs.go).not.toHaveBeenCalled();
  });

  it('en la última pestaña cede con resistencia y no navega', async () => {
    tabs.activeIndex.set(5);
    await arrastrar(texto, -600);
    expect(document.querySelector('[data-shown]')).toBeNull();
    await vi.advanceTimersByTimeAsync(1000);
    expect(tabs.go).not.toHaveBeenCalled();
  });

  it('ráfaga: cada deslizamiento rápido cuenta, ninguno se pierde', async () => {
    for (let i = 0; i < 3; i++) {
      // El objetivo real de un toque a mitad de cambio es el escudo.
      const objetivo = document.querySelector<HTMLElement>('.swipe-shield[style*="auto"]') ?? texto;
      await arrastrar(objetivo, -300, { pasos: 4, ms: 15 });
      await vi.advanceTimersByTimeAsync(30);
    }
    await vi.advanceTimersByTimeAsync(3000);
    expect(tabs.go).toHaveBeenCalledTimes(3);
    expect(tabs.activeIndex()).toBe(4);
    expect(root.className).toBe('');
  });

  it('el escudo recibe los toques mientras la página se mueve y se retira después', async () => {
    await arrastrar(texto, -500);
    const escudo = document.querySelector<HTMLElement>('.swipe-shield');
    expect(escudo?.style.pointerEvents).toBe('auto');
    await vi.advanceTimersByTimeAsync(1000);
    expect(escudo?.style.pointerEvents).toBe('none');
    TestBed.resetTestingModule();
    expect(document.querySelector('.swipe-shield')).toBeNull();
  });

  it('un dedo apoyado durante el cambio sigue el gesto sobre la página nueva', async () => {
    await arrastrar(texto, -500);
    const escudo = document.querySelector<HTMLElement>('.swipe-shield')!;
    tocar(escudo, 'touchstart', 800, 300);
    reloj += 20;
    tocar(escudo, 'touchmove', 760, 300);
    tocar(escudo, 'touchmove', 700, 300);
    await vi.advanceTimersByTimeAsync(1000);
    expect(tabs.activeIndex()).toBe(2);
    expect(root.classList).toContain('is-swiping');
    expect(document.querySelector('[data-shown="next"]')).toBe(document.querySelectorAll('.peek__slot')[3]);
    // El dedo se queda quieto un segundo y se levanta: no es un «flick».
    reloj += 1000;
    tocar(escudo, 'touchend', 790, 300);
    await vi.advanceTimersByTimeAsync(1000);
    expect(tabs.activeIndex()).toBe(2);
    expect(root.className).toBe('');
  });

  it('si se pierde el final de un toque, el siguiente no se bloquea', async () => {
    await arrastrar(texto, -300, { soltar: false });
    expect(root.classList).toContain('is-swiping');
    await arrastrar(texto, -500);
    await vi.advanceTimersByTimeAsync(1000);
    expect(tabs.go).toHaveBeenCalledTimes(1);
    expect(root.className).toBe('');
  });

  it('una selección de texto lejos del dedo no impide deslizar', async () => {
    const rect = { left: 0, right: 200, top: 0, bottom: 20 };
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => ({ getClientRects: () => [rect] }),
    } as never);
    await arrastrar(texto, -500);
    await vi.advanceTimersByTimeAsync(1000);
    expect(tabs.go).toHaveBeenCalledTimes(1);
  });

  it('con movimiento reducido cambia sin animar', async () => {
    reducido = true;
    await arrastrar(texto, -500);
    await vi.advanceTimersByTimeAsync(400);
    expect(tabs.activeIndex()).toBe(2);
    expect(root.className).toBe('');
  });
});
