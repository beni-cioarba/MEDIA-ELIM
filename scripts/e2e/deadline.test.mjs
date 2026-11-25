import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DeadlineError, runPool, withDeadline } from './deadline.mjs';

test('withDeadline: devuelve el resultado si llega a tiempo', async () => {
  assert.equal(await withDeadline(Promise.resolve(7), 50, 'x'), 7);
});

test('withDeadline: una promesa que no termina nunca falla al cumplirse el plazo', async () => {
  await assert.rejects(withDeadline(new Promise(() => {}), 20, '/contact/'), (error) => {
    assert.ok(error instanceof DeadlineError);
    assert.match(error.message, /\/contact\/: sin respuesta en/);
    return true;
  });
});

test('withDeadline: el error propio de la tarea se conserva', async () => {
  await assert.rejects(withDeadline(Promise.reject(new Error('propio')), 50, 'x'), /propio/);
});

test('withDeadline: si la tarea falla después del plazo no tumba el proceso', async () => {
  const late = new Promise((_, reject) => setTimeout(() => reject(new Error('tarde')), 30));
  await assert.rejects(withDeadline(late, 5, 'x'), DeadlineError);
  await new Promise((done) => setTimeout(done, 50));
});

test('runPool: hace todas las tareas sin pasar del máximo a la vez', async () => {
  let active = 0;
  let peak = 0;
  const done = [];
  const pending = await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
    peak = Math.max(peak, ++active);
    await new Promise((ok) => setTimeout(ok, 5));
    active--;
    done.push(n);
  });
  assert.deepEqual(done.sort(), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(pending, []);
  assert.equal(peak, 3);
});

test('runPool: al agotarse el presupuesto deja de repartir y dice qué falta', async () => {
  let runs = 0;
  const pending = await runPool([1, 2, 3, 4], 1, async () => void runs++, () => runs >= 2);
  assert.equal(runs, 2);
  assert.deepEqual(pending, [3, 4]);
});

test('runPool: sin tareas no se queda esperando', async () => {
  assert.deepEqual(await runPool([], 4, async () => {}), []);
});
