import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { dateKey, fromDateKey, monthWeeks, validTasks, timeParts, timeFromParts, displayTime, canAddTask, seedCalendarMonth } from '../app/lib/calendar.ts';

test('a day/hour slot accepts at most four tasks, irrespective of minute or completion', () => {
  const tasks = Array.from({ length: 4 }, (_, i) => ({ id: String(i), date: '2026-10-08', time: `14:0${i}`, text: 'Task', done: i % 2 === 0 }));
  assert.equal(canAddTask(tasks, '2026-10-08', '14:59'), false);
  assert.equal(canAddTask(tasks.slice(1), '2026-10-08', '14:59'), true);
  assert.equal(canAddTask(tasks, '2026-10-08', '15:00'), true);
  assert.equal(canAddTask(tasks, '2026-10-09', '14:00'), true);
});

test('month grids have complete Sunday-first weeks, including leap day', () => {
  for (let year = 2000; year <= 2040; year++) for (let month = 0; month < 12; month++) {
    const weeks = monthWeeks(year, month);
    assert.ok(weeks.length >= 4 && weeks.length <= 6);
    for (const week of weeks) { assert.equal(week.length, 7); assert.equal(week[0].getDay(), 0); assert.equal(week[6].getDay(), 6); }
    const inMonth = weeks.flat().filter(day => day.getMonth() === month && day.getFullYear() === year);
    assert.equal(inMonth.length, new Date(year, month + 1, 0).getDate());
    assert.equal(new Set(inMonth.map(dateKey)).size, inMonth.length);
  }
  assert.ok(monthWeeks(2028, 1).flat().some(day => dateKey(day) === '2028-02-29'));
});
test('time wheels round trip every minute, including midnight and noon', () => {
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) {
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const parts = timeParts(time);
    assert.equal(timeFromParts(parts.hour, parts.minute, parts.period), time);
  }
  assert.equal(displayTime('00:00'), '12:00 AM');
  assert.equal(displayTime('12:00'), '12:00 PM');
});
test('local date keys round trip through DST and year boundaries', () => {
  for (const key of ['2026-03-08', '2026-11-01', '2026-12-31', '2027-01-01', '2028-02-29']) assert.equal(dateKey(fromDateKey(key)), key);
});
test('persisted tasks reject corrupt records, invalid dates and invalid times', () => {
  const valid = { id: 'test', date: '2026-10-07', time: '17:10', text: 'Task', done: false };
  assert.deepEqual(validTasks([valid, { ...valid, date: '2026-02-30' }, { ...valid, time: '24:00' }, { ...valid, text: '' }, null]), [valid]);
  assert.deepEqual(validTasks({}), []);
});

function randomSource(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}
test('presets have four distinct dates, local completion defaults and valid meeting placement throughout ordinary and leap years', () => {
  for (const year of [2026, 2028]) for (let month = 0; month < 12; month++) {
    const days = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const today = new Date(year, month, day, 12);
      const state = seedCalendarMonth({ tasks: [], seededMonths: [] }, year, month, today, randomSource(year * 10000 + month * 100 + day));
      assert.equal(state.tasks.length, 5);
      assert.equal(new Set(state.tasks.map(task => task.date)).size, 4);
      assert.deepEqual(state.tasks.filter(task => task.date === dateKey(today)).map(task => task.text), ['Call mom', 'Buy groceries']);
      assert.equal(validTasks(state.tasks).length, 5);
      assert.deepEqual(Object.fromEntries(state.tasks.map(task => [task.text, task.time])), {
        'Call mom': '12:00', 'Buy groceries': '12:00', "Friend's birthday": '18:00',
        'Doc appointment': '10:00', 'Team meeting': '11:00',
      });
      for (const task of state.tasks) {
        assert.equal(fromDateKey(task.date).getMonth(), month);
        assert.equal(task.done, task.date < dateKey(today));
      }
      const meeting = fromDateKey(state.tasks.find(task => task.text === 'Team meeting').date).getDate();
      const weekStart = day - today.getDay();
      const weekCandidates = Array.from({ length: days }, (_, i) => i + 1).filter(candidate => candidate !== day && candidate >= weekStart && candidate < weekStart + 14);
      const distantCandidates = weekCandidates.filter(candidate => Math.abs(candidate - day) >= 3);
      if (distantCandidates.length) assert.ok(distantCandidates.includes(meeting));
      else if (weekCandidates.length) assert.ok(weekCandidates.includes(meeting));
      else assert.ok(Math.abs(meeting - day) >= 3);
      const otherDays = state.tasks.filter(task => ["Friend's birthday", 'Doc appointment'].includes(task.text)).map(task => fromDateKey(task.date).getDate());
      assert.ok(Math.abs(otherDays[0] - otherDays[1]) >= 3);
      for (const other of otherDays) { assert.ok(Math.abs(other - day) >= 3); assert.ok(Math.abs(other - meeting) >= 3); }
    }
  }
});

test('saved presets adopt the requested hours without changing dates, checkboxes, custom tasks or deletions', () => {
  const original = seedCalendarMonth({ tasks: [], seededMonths: [] }, 2026, 9, new Date(2026, 9, 8, 12), randomSource(10));
  const legacyHours = { 'Call mom': '18:00', 'Buy groceries': '16:30', "Friend's birthday": '19:00' };
  const custom = { id: 'custom', text: 'Call mom', time: '09:00', date: '2026-10-08', done: true };
  const saved = { ...original, tasks: [...original.tasks.filter(task => task.text !== 'Doc appointment').map(task => ({ ...task, time: legacyHours[task.text] ?? task.time, done: true })), custom] };
  const adjusted = seedCalendarMonth(saved, 2026, 9, new Date(2026, 9, 8, 12));
  assert.deepEqual(adjusted.tasks.map(task => ({ id: task.id, date: task.date, done: task.done })), saved.tasks.map(task => ({ id: task.id, date: task.date, done: task.done })));
  assert.equal(adjusted.tasks.find(task => task.id.endsWith(':call-mom')).time, '12:00');
  assert.equal(adjusted.tasks.find(task => task.id.endsWith(':buy-groceries')).time, '12:00');
  assert.equal(adjusted.tasks.find(task => task.id.endsWith(':birthday')).time, '18:00');
  assert.deepEqual(adjusted.tasks.find(task => task.id === 'custom'), custom);
  assert.ok(!adjusted.tasks.some(task => task.id.endsWith(':appointment')));
  assert.equal(seedCalendarMonth(adjusted, 2026, 9, new Date(2026, 9, 8, 12)), adjusted);
});
test('different visitors receive varied schedules with the same spacing constraints', () => {
  const schedules = new Set(Array.from({ length: 20 }, (_, seed) => seedCalendarMonth({ tasks: [], seededMonths: [] }, 2026, 9, new Date(2026, 9, 8, 12), randomSource(seed)).tasks.map(task => task.date).join(',')));
  assert.ok(schedules.size > 10);
});
test('only Call mom follows today; groceries, other preset dates and user changes remain saved', () => {
  const original = seedCalendarMonth({ tasks: [], seededMonths: [] }, 2026, 9, new Date(2026, 9, 8, 12), randomSource(10));
  const edited = { ...original, tasks: original.tasks.map(task => ({ ...task, done: true })) };
  const later = seedCalendarMonth(edited, 2026, 9, new Date(2026, 9, 10, 12), randomSource(20));
  assert.deepEqual(later.tasks.filter(task => task.text !== 'Call mom'), edited.tasks.filter(task => task.text !== 'Call mom'));
  const call = later.tasks.find(task => task.text === 'Call mom');
  assert.equal(call.date, '2026-10-10'); assert.equal(call.done, false);
  assert.equal(seedCalendarMonth(later, 2026, 9, new Date(2026, 9, 10, 12)), later);
  const removed = { ...later, tasks: later.tasks.filter(task => task.text !== 'Call mom') };
  assert.equal(seedCalendarMonth(removed, 2026, 9, new Date(2026, 9, 11, 12)), removed);
});
