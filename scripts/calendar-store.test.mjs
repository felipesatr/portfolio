import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

// Resolve the app's bundler-style TS import when running the real store in Node.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === './calendar' && context.parentURL === new URL('../app/lib/calendar-store.ts', import.meta.url).href) return nextResolve('./calendar.ts', context);
  return nextResolve(specifier, context);
} });
const { createCalendarTaskStore } = await import('../app/lib/calendar-store.ts');
function fakeStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
test('reloads keep the visitor, dates, custom tasks, checkbox edits and deleted presets', () => {
  const storage = fakeStorage();
  const first = createCalendarTaskStore(storage, { createId: () => 'visitor-one', random: () => 0.3 });
  assert.equal(first.ensureMonth(2026, 9, new Date(2026, 9, 8, 12)), true);
  const snapshot = first.readTasks();
  assert.equal(first.readTasks(), snapshot);
  const custom = { id: 'custom', date: '2026-10-14', time: '15:00', text: 'My own task', done: false };
  first.writeTasks([...snapshot.filter(task => task.text !== "Friend's birthday").map(task => task.text === 'Buy groceries' ? { ...task, done: true } : task), custom]);
  const saved = first.readTasks();
  const reloaded = createCalendarTaskStore(storage, { createId: () => { throw new Error('Visitor ID must already be saved'); }, random: () => 0.9 });
  assert.equal(reloaded.ensureMonth(2026, 9, new Date(2026, 9, 8, 12)), false);
  assert.deepEqual(reloaded.readTasks(), saved);
  assert.equal(reloaded.ensureMonth(2026, 9, new Date(2026, 9, 11, 12)), true);
  assert.equal(reloaded.readTasks().find(task => task.text === 'Call mom').date, '2026-10-11');
  assert.equal(reloaded.readTasks().find(task => task.text === 'Buy groceries').date, '2026-10-08');
  assert.equal(reloaded.readTasks().find(task => task.text === 'Buy groceries').done, true);
  assert.ok(!reloaded.readTasks().some(task => task.text === "Friend's birthday"));
  assert.equal(reloaded.ensureMonth(2026, 10, new Date(2026, 10, 3, 12)), true);
  assert.equal(reloaded.readTasks().filter(task => task.id.startsWith('preset:2026-11:')).length, 5);
  assert.equal(reloaded.ensureMonth(2026, 10, new Date(2026, 10, 3, 12)), false);
});
test('legacy handwritten tasks migrate and account stores remain separate', () => {
  const storage = fakeStorage();
  const oldTask = { id: 'old', date: '2026-10-07', time: '10:00', text: 'Keep me', done: true };
  storage.setItem('portfolio:calendar:tasks:v1', JSON.stringify([oldTask]));
  const anonymous = createCalendarTaskStore(storage, { createId: () => 'anon' });
  assert.deepEqual(anonymous.readTasks(), [oldTask]);
  const account = createCalendarTaskStore(storage, { accountId: 'signed-in-account' });
  assert.deepEqual(account.readTasks(), []);
  account.ensureMonth(2026, 9, new Date(2026, 9, 8, 12));
  assert.deepEqual(anonymous.readTasks(), [oldTask]);
});
test('unavailable storage keeps a usable session and corrupt JSON can be repaired', () => {
  const session = createCalendarTaskStore(null, { createId: () => 'session' });
  session.ensureMonth(2026, 9, new Date(2026, 9, 8, 12));
  assert.equal(session.readTasks().length, 5);
  assert.equal(session.isMemoryOnly(), true);
  const storage = fakeStorage();
  storage.setItem('portfolio:calendar:visitor:v1', 'saved');
  storage.setItem('portfolio:calendar:user:saved:v2', 'broken json');
  const repaired = createCalendarTaskStore(storage);
  repaired.ensureMonth(2026, 9, new Date(2026, 9, 8, 12));
  assert.equal(repaired.isMemoryOnly(), false);
  assert.equal(repaired.readTasks().length, 5);
});

test('old saved preset hours migrate persistently without reseeding or altering user state', () => {
  const storage = fakeStorage();
  const first = createCalendarTaskStore(storage, { createId: () => 'existing-visitor', random: () => 0.3 });
  first.ensureMonth(2026, 9, new Date(2026, 9, 8, 12));
  first.writeTasks(first.readTasks().filter(task => task.text !== "Friend's birthday").map(task => ({ ...task, time: task.text === 'Buy groceries' ? '16:30' : task.text === 'Call mom' ? '18:00' : task.time, done: true })));
  const oldDates = first.readTasks().map(task => task.date);
  const reloaded = createCalendarTaskStore(storage);
  assert.equal(reloaded.ensureMonth(2026, 9, new Date(2026, 9, 8, 12)), true);
  assert.deepEqual(reloaded.readTasks().map(task => task.date), oldDates);
  assert.ok(reloaded.readTasks().every(task => task.done));
  assert.deepEqual(reloaded.readTasks().filter(task => ['Buy groceries', 'Call mom'].includes(task.text)).map(task => task.time), ['12:00', '12:00']);
  assert.ok(!reloaded.readTasks().some(task => task.text === "Friend's birthday"));
  const again = createCalendarTaskStore(storage);
  assert.equal(again.ensureMonth(2026, 9, new Date(2026, 9, 8, 12)), false);
  assert.deepEqual(again.readTasks(), reloaded.readTasks());
});
