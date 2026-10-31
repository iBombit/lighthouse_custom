import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chdirToTemp } from './helpers.ts';

chdirToTemp();
const analysis = await import('lh-pptr-framework/settings/audits/main-thread-analysis.js');
type Task = Parameters<typeof analysis.summarizeTask>[0];
type Group = Task['group']['id'];

const APP = 'https://x.com/static/app.js';
const VENDOR = 'https://vendor.example/v.js';

function task(start: number, end: number, group: Group, extra: Partial<Task> = {}): Task {
  return { startTime: start, endTime: end, duration: end - start, selfTime: end - start, group: { id: group }, children: [], attributableURLs: [], event: {}, ...extra };
}

/** Links children to a parent and fixes the parent's self time. */
function nest(parent: Task, ...children: Task[]): Task {
  parent.children = children;
  for (const child of children) child.parent = parent;
  parent.selfTime = parent.duration - children.reduce((sum, c) => sum + c.duration, 0);
  return parent;
}

/** RunTask 0–100 ms → script (app.js) 10–80 ms → style & layout 30–50 ms. */
function longTask() {
  const style = task(30, 50, 'styleLayout', { attributableURLs: [APP], selfTbtImpact: 10, selfBlockingTime: 10 });
  const script = nest(task(10, 80, 'scriptEvaluation', { attributableURLs: [APP], selfTbtImpact: 30, selfBlockingTime: 35 }), style);
  const top = nest(task(0, 100, 'other', { tbtImpact: 40, selfTbtImpact: 0, selfBlockingTime: 5 }), script);
  return { top, script, style };
}
const urlOf = (t: Task) => t.attributableURLs[0] ?? 'Unattributable';

test('self intervals exclude the time of children, recursively', () => {
  const intervals: Array<[number, number, string]> = [];
  analysis.forEachSelfInterval(longTask().top, (start, end, group) => intervals.push([start, end, group]));
  assert.deepEqual(intervals, [[0, 10, 'other'], [10, 30, 'scriptEvaluation'], [30, 50, 'styleLayout'], [50, 80, 'scriptEvaluation'], [80, 100, 'other']]);
});

test('activity bins split busy time per category without losing any', () => {
  const { binMs, bins } = analysis.activityBins([longTask().top], 100, 10);
  assert.equal(binMs, 10);
  assert.deepEqual(bins.map(b => Object.keys(b)[0]), ['other', 'scriptEvaluation', 'scriptEvaluation', 'styleLayout', 'styleLayout',
    'scriptEvaluation', 'scriptEvaluation', 'scriptEvaluation', 'other', 'other']);
  // Bins that don't line up with the intervals: totals are still exact.
  const uneven = analysis.activityBins([longTask().top], 100, 3).bins;
  const sum = (group: string) => uneven.reduce((s, b) => s + ((b as Record<string, number>)[group] ?? 0), 0);
  assert.ok(Math.abs(sum('scriptEvaluation') - 50) < 1e-9 && Math.abs(sum('styleLayout') - 20) < 1e-9 && Math.abs(sum('other') - 30) < 1e-9);
});

test('activity bins terminate when intervals start on a rounded bin boundary', { timeout: 5000 }, () => {
  // Regression: with endMs 1234.5678 / 240 bins, 101 * binMs floors to bin 100 and the old loop never advanced.
  const endMs = 1234.5678, binCount = 240, binMs = endMs / binCount;
  const tasks = [
    ...[99, 100, 101].map(k => task(k * binMs, (k + 1) * binMs, 'scriptEvaluation')),
    task(238 * binMs, 241 * binMs, 'scriptEvaluation'),
  ];
  const { bins } = analysis.activityBins(tasks, endMs, binCount);
  const total = bins.reduce((s, b) => s + (b.scriptEvaluation ?? 0), 0);
  // The last task is clipped at endMs: 1 + 1 + 1 + 2 bins of busy time.
  assert.ok(Math.abs(total - 5 * binMs) < 1e-6, `total ${total}`);
  assert.ok(bins.every(b => (b.scriptEvaluation ?? 0) <= binMs + 1e-9));
});

test('activity bins are empty for a non-finite or empty time range', () => {
  for (const endMs of [Infinity, NaN, 0, -5]) {
    const { binMs, bins } = analysis.activityBins([longTask().top], endMs, 4);
    assert.equal(binMs, 0);
    assert.deepEqual(bins, [{}, {}, {}, {}]);
  }
});

test('a long task summary has its blocking time, main activity and scripts', () => {
  const summary = analysis.summarizeTask(longTask().top, urlOf);
  assert.deepEqual(summary, {
    startTime: 0, duration: 100, blockingTime: 50, tbtImpact: 40, mainGroup: 'scriptEvaluation',
    groups: [{ group: 'scriptEvaluation', ms: 50 }, { group: 'other', ms: 30 }, { group: 'styleLayout', ms: 20 }],
    urls: [{ url: APP, ms: 70 }, { url: 'Unattributable', ms: 30 }],
  });
});

test('blocking time is attributed per script and adds up to the TBT', () => {
  const { top, script, style } = longTask();
  const vendorTask = task(200, 260, 'scriptEvaluation', { attributableURLs: [VENDOR], tbtImpact: 10, selfTbtImpact: 10, selfBlockingTime: 10 });
  const rows = analysis.blockingByUrl([top, script, style, vendorTask], urlOf);
  assert.deepEqual(rows, [
    { url: APP, tbtImpact: 40, blockingTime: 45, selfTime: 70, longTasks: 1 },
    { url: VENDOR, tbtImpact: 10, blockingTime: 10, selfTime: 60, longTasks: 1 },
    { url: 'Unattributable', tbtImpact: 0, blockingTime: 5, selfTime: 30, longTasks: 0 },
  ]);
  assert.equal(rows.reduce((s, r) => s + r.tbtImpact, 0), (top.tbtImpact ?? 0) + (vendorTask.tbtImpact ?? 0));
});

test('activity totals separate time inside long tasks', () => {
  const short = task(150, 170, 'paintCompositeRender');
  assert.deepEqual(analysis.activityTotals([longTask().top, short]), [
    { group: 'scriptEvaluation', total: 50, inLongTasks: 50 },
    { group: 'other', total: 30, inLongTasks: 30 },
    { group: 'styleLayout', total: 20, inLongTasks: 20 },
    { group: 'paintCompositeRender', total: 20, inLongTasks: 0 },
  ]);
});

test('script names are short and readable', () => {
  assert.equal(analysis.shortScriptName('https://cdn.example.com/static/app.min.js?v=1'), 'app.min.js (cdn.example.com)');
  assert.equal(analysis.shortScriptName('https://example.com/'), '/ (example.com)');
  assert.equal(analysis.shortScriptName('Unattributable'), 'Unattributable');
});
