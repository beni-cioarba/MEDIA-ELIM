/**
 * Plazos para la prueba de humo: **nada espera sin límite**.
 *
 * El 25/11/2026 un despliegue se quedó 3 h 35 min «en curso»: Chrome dejó de
 * responder y `page.evaluate` (como `page.close` o `browser.close`) no tiene
 * plazo propio en Playwright. GitHub lo habría dejado correr 6 horas, con la
 * web sin actualizar y sin ningún aviso.
 */

/** Se ha agotado un plazo (no es un fallo de la página: es un bloqueo). */
export class DeadlineError extends Error {
  /** @param {string} label @param {number} ms */
  constructor(label, ms) {
    super(`${label}: sin respuesta en ${Math.round(ms / 100) / 10} s`);
    this.name = 'DeadlineError';
  }
}

/**
 * Espera `promise` como mucho `ms`. No cancela el trabajo de fondo (una
 * promesa no se puede cancelar): quien llama debe soltar lo que lo sostiene,
 * p. ej. matando el navegador.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} label
 * @returns {Promise<T>}
 */
export function withDeadline(promise, ms, label) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineError(label, ms)), ms);
  });
  // Si gana el plazo, la promesa original puede fallar después (el navegador
  // muere): que no tumbe el proceso como rechazo sin recoger.
  promise.catch(() => {});
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/**
 * Ejecuta las tareas con `workers` a la vez. Cada puesto toma la siguiente de
 * la cola cuando acaba la suya; `stop()` deja de repartir (presupuesto agotado).
 *
 * @template T
 * @param {readonly T[]} tasks
 * @param {number} workers
 * @param {(task: T, worker: number) => Promise<void>} run
 * @param {() => boolean} [stop]
 * @returns {Promise<T[]>} Las tareas que se han quedado sin empezar.
 */
export async function runPool(tasks, workers, run, stop = () => false) {
  const queue = [...tasks];
  const size = Math.max(1, Math.min(workers, queue.length));
  await Promise.all(
    Array.from({ length: size }, async (_, worker) => {
      while (queue.length > 0 && !stop()) await run(/** @type {T} */ (queue.shift()), worker);
    }),
  );
  return queue;
}
