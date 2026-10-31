import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chdirToTemp } from './helpers.ts';

chdirToTemp();
const { functionHotspots } = await import('lh-pptr-framework/settings/audits/cpu-profile-analysis.js');

const APP = 'https://x.com/app.js';
const LIB = 'https://x.com/lib.js';
const TIME_ORIGIN = 1_000_000; // µs

// (root) → main → heavy → recurse → recurse;  (root) → (idle)
const profile = {
  startTime: TIME_ORIGIN,
  nodes: [
    { id: 1, callFrame: { functionName: '(root)', url: '' } },
    { id: 2, parent: 1, callFrame: { functionName: 'main', url: APP, lineNumber: 9, columnNumber: 0 } },
    { id: 3, parent: 2, callFrame: { functionName: 'heavy', url: APP, lineNumber: 19, columnNumber: 4 } },
    { id: 4, parent: 1, callFrame: { functionName: '(idle)', url: '' } },
    { id: 5, parent: 3, callFrame: { functionName: 'recurse', url: LIB, lineNumber: 3, columnNumber: 2 } },
    { id: 6, parent: 5, callFrame: { functionName: 'recurse', url: LIB, lineNumber: 3, columnNumber: 2 } },
  ],
  // Sample times (ms): 0, 1, 2, 3, 4, 5, 70, 71 — the 65 ms gap after 5 ms is capped at 10 ms.
  samples: [3, 3, 6, 6, 4, 2, 3, 2],
  timeDeltas: [0, 1000, 1000, 1000, 1000, 1000, 65000, 1000],
};

test('self and total time per function inside long tasks (Bottom-Up)', () => {
  const hotspots = functionHotspots([profile], TIME_ORIGIN, [[0, 60]]);
  const pick = (name: string) => {
    const h = hotspots.find(x => x.functionName === name)!;
    return [h.selfInLongTasks, h.totalInLongTasks, h.selfTime];
  };
  assert.deepEqual(hotspots.map(h => h.functionName), ['main', 'heavy', 'recurse']);
  assert.deepEqual(pick('main'), [10, 14, 10]);    // capped gap; total includes the callees
  assert.deepEqual(pick('heavy'), [2, 4, 3]);      // 1 ms more self time outside the long task
  assert.deepEqual(pick('recurse'), [2, 2, 2]);    // recursion counted once in the total
  const heavy = hotspots.find(h => h.functionName === 'heavy')!;
  assert.deepEqual([heavy.url, heavy.lineNumber, heavy.columnNumber], [APP, 19, 4]);
});

test('samples outside long tasks only count as overall self time; idle and root are ignored', () => {
  const hotspots = functionHotspots([profile], TIME_ORIGIN, []);
  assert.ok(hotspots.every(h => h.selfInLongTasks === 0 && h.totalInLongTasks === 0));
  assert.equal(hotspots.find(h => h.functionName === 'main')!.selfTime, 10);
  assert.ok(!hotspots.some(h => h.functionName === '(idle)' || h.functionName === '(root)'));
});
