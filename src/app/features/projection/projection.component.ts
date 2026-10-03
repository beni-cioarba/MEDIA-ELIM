
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  DOCUMENT
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { PresentationService } from '../../core/presentation.service';
import {
  FullscreenResultMessage,
  PROJECTION_MESSAGE,
  WINDOW_NAME_PREFIX,
} from '../../core/services/projection-window.service';
import { StageComponent } from '../stage/stage.component';

/** Parámetro de consulta que marca la vista previa incrustada en el panel. */
export const PROJECTION_PREVIEW_PARAM = 'rol';
export const PROJECTION_PREVIEW_VALUE = 'preview';
/** Vista de prueba de una diapositiva fija (`?rol=solo&anunt=<id>`). */
export const PROJECTION_SOLO_VALUE = 'solo';

/**
 * Ventana de **proyección** (`/media/ecran`): el escenario, y nada más.
 *
 * Nace ya presentando (`PresentationService.enterProjectionRoute`), sin
 * cabecera, pie ni dock: es la ventana que el panel de control abre y que se
 * lleva a la pantalla del templo. Dentro, los controles del carrusel siguen
 * apareciendo al acercar el ratón (como en una presentación de PowerPoint) y
 * las teclas funcionan igual; `F` pide la pantalla completa del navegador.
 * El panel también puede pedirla a distancia: llega por `postMessage` con el
 * gesto del operador delegado (ver `PROJECTION_MESSAGE`) y se contesta con el
 * resultado, para que el panel sepa si tiene que pedir un `F` manual.
 *
 * Con `?rol=preview` es la **vista previa** que el panel de control incrusta
 * en un `<iframe>`: mismo componente, misma diapositiva (la sincroniza el
 * canal), pero sin controles ni pantalla completa. Tener la vista previa como
 * una instancia real del escenario garantiza que lo que ve el operador es,
 * píxel a píxel, lo que se proyecta.
 *
 * Con `?rol=solo&anunt=<id>` es una **vista de prueba**: una diapositiva fija
 * (p. ej. un anuncio que aún no se publica), sin sincronizarse con nadie. El
 * panel la usa para ver y probar un anuncio programado antes del día.
 *
 * Pueden abrirse **varias ventanas** a la vez (una por pantalla): todas
 * reflejan lo mismo. Una pestaña abierta a mano sin nombre recibe uno propio
 * para que el panel la distinga en la lista de pantallas.
 */
@Component({
    selector: 'app-projection',
    imports: [StageComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-stage />`,
    styles: [
        `
      :host {
        display: block;
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        overflow: hidden;
      }
    `,
    ]
})
export class ProjectionComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly presentation = inject(PresentationService);
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  ngOnInit(): void {
    const rol = this.route.snapshot.queryParamMap.get(PROJECTION_PREVIEW_PARAM);
    const role =
      rol === PROJECTION_PREVIEW_VALUE ? 'preview' : rol === PROJECTION_SOLO_VALUE ? 'solo' : 'window';
    if (role === 'window' && !window.name) {
      window.name = `${WINDOW_NAME_PREFIX}t${Math.random().toString(36).slice(2, 6)}`;
    }
    this.presentation.enterProjectionRoute(role);
    // Título propio: es la ventana que el operador ve en la barra de tareas.
    this.document.title = this.translate.instant('presenter.window_title');
  }

  ngOnDestroy(): void {
    this.presentation.leaveProjectionRoute();
  }

  /**
   * Orden de pantalla completa desde el panel de control. Sólo del mismo origen
   * y sólo en la ventana (la vista previa nunca ocupa la pantalla). La petición
   * se hace **dentro** del manejador: la capacidad delegada sólo vale mientras
   * se despacha el mensaje.
   */
  @HostListener('window:message', ['$event'])
  async onMessage(event: MessageEvent<{ readonly type?: string } | null>): Promise<void> {
    if (event.origin !== this.document.location.origin) return;
    if (event.data?.type !== PROJECTION_MESSAGE.fullscreen) return;
    if (this.presentation.role() !== 'window') return;

    const ok = await this.presentation.toggleNative();
    const reply: FullscreenResultMessage = { type: PROJECTION_MESSAGE.fullscreenResult, ok };
    (event.source as Window | null)?.postMessage(reply, event.origin);
  }
}
