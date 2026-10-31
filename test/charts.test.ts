import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chdirToTemp } from './helpers.ts';

chdirToTemp();
const { buildLongTasksChart } = await import('lh-pptr-framework/reporting/charts/longTasksChart.js');
const { buildActivityChart } = await import('lh-pptr-framework/reporting/charts/activityChart.js');
const { buildBarChart } = await import('lh-pptr-framework/reporting/charts/barChart.js');
const { buildVitalsChart } = await import('lh-pptr-framework/reporting/charts/vitalsChart.js');
const { svgToDataUri } = await import('lh-pptr-framework/reporting/charts/svg.js');

const count = (s: string, needle: string) => s.split(needle).length - 1;
const balanced = (svg: string) => count(svg, '<g') === count(svg, '</g>') && svg.startsWith('<svg ') && svg.trimEnd().endsWith('</svg>');

test('TBT chart: hatched blocking part for long tasks, TBT window, markers and script bars', () => {
  const svg = buildLongTasksChart({
    title: 'TBT <check>', subtitle: 'sub',
    endMs: 2000,
    tasks: [
      { start: 100, duration: 30, tbtImpact: 0, group: 'scriptEvaluation' },
      { start: 500, duration: 250, tbtImpact: 200, group: 'scriptEvaluation', label: 'app.js' },
    ],
    window: { start: 300, end: 1200, label: 'TBT window (FCP → TTI)' },
    markers: [{ t: 300, label: 'FCP', color: '#1a73e8' }, { t: 1200, label: 'TTI', color: '#f5a623' }],
    scripts: [{ label: 'app.js (x.com)', tooltip: 'https://x.com/app.js', value: 200, party: 'first' }],
    totalTbt: 200,
  });
  assert.ok(balanced(svg));
  assert.ok(svg.includes('TBT &lt;check&gt;'), 'text is escaped');
  assert.equal(count(svg, 'fill="url(#blocking)"'), 2, 'one long task + legend');
  assert.ok(svg.includes('TBT window (FCP → TTI)'));
  assert.ok(svg.includes('>FCP 300ms<') && svg.includes('>TTI 1.20s<'));
  assert.ok(svg.includes('>250ms<'), 'duration label of the long task');
  assert.ok(svg.includes('200ms · 100%'));
  assert.ok(buildLongTasksChart({ title: 't', subtitle: 's', endMs: 100, tasks: [], markers: [], scripts: [], totalTbt: 0 })
    .includes('No blocking time in this step'));
});

test('activity chart: stacked CPU columns, task lane and summary', () => {
  const svg = buildActivityChart({
    title: 'Main-thread activity', subtitle: 's', endMs: 100, binMs: 50,
    bins: [{ scriptEvaluation: 25, styleLayout: 25 }, { parseHTML: 10 }],
    tasks: [{ start: 0, duration: 60, tbtImpact: 10, group: 'scriptEvaluation' }],
    markers: [{ t: 20, label: 'FCP', color: '#1a73e8' }],
    totals: [{ group: 'scriptEvaluation', ms: 25 }, { group: 'styleLayout', ms: 25 }, { group: 'parseHTML', ms: 10 }],
  });
  assert.ok(balanced(svg));
  assert.equal(count(svg, 'height="55.0" fill="#f4b400"'), 1, 'script evaluation fills half of the first column');
  assert.ok(svg.includes('Script evaluation: <tspan class="val">25ms</tspan> (42%)'));
  assert.ok(svg.includes('fill="url(#blocking)"'), 'long task in the lane');
});

test('timeline charts stay finite when the time range is unknown', { timeout: 5000 }, () => {
  for (const endMs of [Infinity, NaN, 0]) {
    const tasks = [{ start: 0, duration: 80, tbtImpact: 30, group: 'scriptEvaluation' as const }];
    const tbt = buildLongTasksChart({ title: 't', subtitle: 's', endMs, tasks, markers: [], scripts: [], totalTbt: 0 });
    const activity = buildActivityChart({ title: 't', subtitle: 's', endMs, binMs: 0, bins: [], tasks, markers: [], totals: [] });
    for (const svg of [tbt, activity]) {
      assert.ok(balanced(svg));
      assert.ok(!/NaN|Infinity/.test(svg), `no NaN/Infinity coordinates for endMs=${endMs}`);
    }
  }
});

test('bar chart and Web Vitals chart', () => {
  const bars = buildBarChart({
    title: 'Hot spots', subtitle: 's',
    rows: [{ label: 'renderGrid', sublabel: 'app.js:120:5', tooltip: 't', value: 180, color: '#1a73e8', valueLabel: '180ms' }],
    legend: [{ label: '1st party', fill: '#1a73e8' }],
  });
  assert.ok(balanced(bars) && bars.includes('renderGrid') && bars.includes('app.js:120:5') && bars.includes('180ms'));

  const vitals = buildVitalsChart('Web Vitals', 's', [
    { label: 'Largest Contentful Paint (LCP)', value: 3100, display: '3.1 s', good: 1200, poor: 2400, unit: 'ms', status: 'poor' },
    { label: 'Cumulative Layout Shift (CLS)', value: 0.02, display: '0.02', good: 0.1, poor: 0.25, unit: 'unitless', status: 'good' },
  ]);
  assert.ok(balanced(vitals));
  assert.equal(count(vitals, 'fill="#ffe1de"'), 2, 'poor zone per metric');
  assert.ok(vitals.includes('>Poor<') && vitals.includes('>Good<') && vitals.includes('>1.2 s<') && vitals.includes('>0.25<'));
});

test('charts are embedded as base64 SVG data URIs', () => {
  const uri = svgToDataUri('<svg xmlns="http://www.w3.org/2000/svg">→</svg>');
  assert.ok(uri.startsWith('data:image/svg+xml;base64,'));
  assert.equal(Buffer.from(uri.split(',')[1]!, 'base64').toString('utf8'), '<svg xmlns="http://www.w3.org/2000/svg">→</svg>');
});
