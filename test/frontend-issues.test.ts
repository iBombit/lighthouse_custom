import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chdirToTemp } from './helpers.ts';

chdirToTemp();
const issuesModule = await import('lh-pptr-framework/reporting/frontendIssues.js');
const { enrichFlowResult, buildWebVitalsAudit } = await import('lh-pptr-framework/reporting/deepDive.js');
const { collectFrontendIssues, issuesMarkdown, issuesJson, issuesJiraCsv } = issuesModule;

const APP = 'https://x.com/static/app.js';
const VENDOR = 'https://vendor.example/v.js';

const metric = (id: string, value: number, score: number, scoring?: { p10: number; median: number }, unit = 'millisecond') =>
  ({ id, title: id, description: '', score, scoreDisplayMode: 'numeric', numericValue: value, numericUnit: unit, displayValue: String(value), ...(scoring ? { scoringOptions: scoring } : {}) });

const scriptsSection = (rows: Array<Record<string, unknown>>) => ({
  type: 'list',
  items: [{ type: 'list-section', title: 'TBT contribution by script', value: { type: 'table', headings: [], items: rows } }],
});

function flowResult() {
  const navigation = {
    gatherMode: 'navigation',
    finalDisplayedUrl: 'https://x.com/',
    configSettings: { formFactor: 'desktop' },
    audits: {
      'largest-contentful-paint': metric('largest-contentful-paint', 3100, 0.32, { p10: 1200, median: 2400 }),
      'total-blocking-time': metric('total-blocking-time', 420, 0.3, { p10: 150, median: 350 }),
      'first-contentful-paint': metric('first-contentful-paint', 800, 0.95, { p10: 934, median: 1600 }),
      'cumulative-layout-shift': metric('cumulative-layout-shift', 0.01, 1, { p10: 0.1, median: 0.25 }, 'unitless'),
      'render-blocking-insight': {
        id: 'render-blocking-insight', title: 'Render blocking requests', score: 0, scoreDisplayMode: 'metricSavings',
        metricSavings: { FCP: 400, LCP: 400 }, displayValue: 'Est savings of 400 ms',
        description: 'Requests are blocking the initial render. [Learn more](https://developer.chrome.com/docs/performance/insights/render-blocking).',
        details: { type: 'table', headings: [], items: [{ url: 'https://x.com/app.css', wastedMs: 400, totalBytes: 20480 }] },
      },
      'unused-javascript': {
        id: 'unused-javascript', title: 'Reduce unused JavaScript', score: 0.5, scoreDisplayMode: 'metricSavings', metricSavings: { LCP: 0 },
        displayValue: 'Est savings of 300 KiB', description: 'Remove unused JavaScript.',
        details: { type: 'opportunity', headings: [], overallSavingsBytes: 300 * 1024, items: [{ url: APP, wastedBytes: 300 * 1024 }] },
      },
      'tbt-breakdown': {
        id: 'tbt-breakdown', title: 'Total Blocking Time breakdown', score: 0.3, scoreDisplayMode: 'numeric', details: scriptsSection([
          { url: APP, entity: 'x.com', party: '1st party', tbtImpact: 300, longTasks: 2, blockingTime: 320, selfTime: 600 },
          { url: VENDOR, entity: 'Vendor', party: '3rd party', tbtImpact: 120, longTasks: 1, blockingTime: 120, selfTime: 200 },
          { url: 'Unattributable', entity: 'Unattributable', party: 'Browser / unattributed', tbtImpact: 10, longTasks: 1, blockingTime: 10, selfTime: 40 },
        ]),
      },
      'js-hotspots': {
        id: 'js-hotspots', title: 'JavaScript hot spots', score: null, scoreDisplayMode: 'informative', details: {
          type: 'list', items: [{ type: 'list-section', title: 'Functions', value: { type: 'table', headings: [], items: [
            { functionName: 'renderGrid', url: APP, position: '120:5', selfInLongTasks: 180 },
          ] } }],
        },
      },
    },
    categories: {
      performance: { id: 'performance', score: 0.4, auditRefs: [
        { id: 'largest-contentful-paint', weight: 25, group: 'metrics' },
        { id: 'render-blocking-insight', weight: 0, group: 'insights' },
        { id: 'unused-javascript', weight: 0, group: 'diagnostics' },
      ] },
      'custom-metrics': { id: 'custom-metrics', title: 'Custom Metrics', score: 0.8, auditRefs: [{ id: 'tbt-breakdown', weight: 0, group: 'custom-main-thread' }] },
    },
  };
  const timespan = {
    gatherMode: 'timespan',
    finalDisplayedUrl: 'https://x.com/grid',
    configSettings: { formFactor: 'desktop' },
    audits: {
      'total-blocking-time': metric('total-blocking-time', 90, 0.95, { p10: 150, median: 350 }),
      'tbt-breakdown': { id: 'tbt-breakdown', title: 't', score: 1, scoreDisplayMode: 'numeric', details: scriptsSection([
        { url: APP, entity: 'x.com', party: '1st party', tbtImpact: 80, longTasks: 1, blockingTime: 80, selfTime: 150 },
      ]) },
    },
    categories: {
      performance: { id: 'performance', score: 1, auditRefs: [] },
      'custom-metrics': { id: 'custom-metrics', title: 'Custom Metrics', score: 1, auditRefs: [{ id: 'tbt-breakdown', weight: 0 }] },
    },
  };
  const snapshot = { gatherMode: 'snapshot', finalDisplayedUrl: 'https://x.com/', audits: {}, categories: {} };
  return { name: 'flow', steps: [{ name: '[N]_Home', lhr: navigation }, { name: '[T]_Open_grid', lhr: timespan }, { name: 'snap', lhr: snapshot }] } as never;
}

test('issues are prioritized, ordered by impact and de-duplicated across steps', () => {
  const issues = collectFrontendIssues(flowResult());
  assert.deepEqual(issues.map(i => [i.priority, i.key]), [
    ['P1', 'metric:LCP'],                           // poor; 1900 ms over the target
    ['P1', `tbt-script:${APP}`],                    // 300 ms of TBT
    ['P1', 'metric:TBT'],                           // poor; 270 ms over the target
    ['P2', 'lighthouse:render-blocking-insight'],   // 400 ms savings
    ['P2', `tbt-script:${VENDOR}`],                 // 120 ms of TBT
    ['P2', 'lighthouse:unused-javascript'],         // 300 KiB savings
  ]);
  const app = issues.find(i => i.key === `tbt-script:${APP}`)!;
  assert.equal(app.title, 'Reduce main-thread blocking by app.js (x.com)');
  assert.deepEqual(app.occurrences.map(o => [o.step, o.impact]), [['[N]_Home', '300 ms of TBT (71% of 420 ms)'], ['[T]_Open_grid', '80 ms of TBT (89% of 90 ms)']]);
  assert.ok(app.occurrences[0]!.evidence.includes('Hot function: renderGrid (line 120:5) — 180 ms self time in long tasks'));
  const vendor = issues.find(i => i.key === `tbt-script:${VENDOR}`)!;
  assert.equal(vendor.owner, 'third-party');
  assert.ok(vendor.title.includes('third-party Vendor'));
  const lcp = issues.find(i => i.key === 'metric:LCP')!;
  assert.ok(lcp.occurrences[0]!.evidence.some(e => e.startsWith('Related failing audits: Render blocking requests (Est savings of 400 ms)')));
  const renderBlocking = issues.find(i => i.key === 'lighthouse:render-blocking-insight')!;
  assert.deepEqual(renderBlocking.metrics, ['FCP', 'LCP']);
  assert.deepEqual(renderBlocking.references, ['https://developer.chrome.com/docs/performance/insights/render-blocking']);
  assert.ok(renderBlocking.occurrences[0]!.evidence.includes('https://x.com/app.css — 400 ms, 20 KiB'));
  // Stable ids
  assert.match(app.id, /^PERF-[0-9A-Z]{6}$/);
  assert.deepEqual(collectFrontendIssues(flowResult()).map(i => i.id), issues.map(i => i.id));
});

test('issues are written as Markdown, JSON and Jira CSV', () => {
  const issues = collectFrontendIssues(flowResult());
  const md = issuesMarkdown(issues, flowResult(), new Date('2026-01-02T03:04:05Z'));
  assert.ok(md.startsWith('# Performance issues for frontend developers'));
  assert.ok(md.includes('6 issues — 3 P1, 3 P2, 0 P3'));
  assert.ok(md.includes(`| ${issues[0]!.id} | P1 | Improve Largest Contentful Paint (LCP) | LCP | frontend | 1 | up to 1900 ms |`));
  assert.ok(md.includes('## [P1]') && md.includes('**How to fix**') && md.includes('**Where it happens**'));

  const json = JSON.parse(issuesJson(issues, flowResult(), new Date('2026-01-02T03:04:05Z')));
  assert.equal(json.issues.length, 6);
  assert.deepEqual(json.steps.map((s: { gatherMode: string }) => s.gatherMode), ['navigation', 'timespan', 'snapshot']);

  const csv = issuesJiraCsv(issues).split('\r\n');
  assert.ok(csv[0]!.startsWith('"Summary","Issue Type","Priority","Labels"'));
  assert.ok(csv[0]!.endsWith('"Description"'));
  assert.ok(csv[1]!.startsWith(`"${issues[0]!.id}: Improve Largest Contentful Paint (LCP)","Task","High"`));
});

test('steps get the Web Vitals and issues audits at the top of Custom Metrics', () => {
  const result = flowResult() as unknown as { steps: Array<{ lhr: { audits: Record<string, any>; categories: Record<string, any> } }> };
  const issues = collectFrontendIssues(result as never);
  enrichFlowResult(result as never, issues, { markdown: 'frontend-issues.md', json: 'frontend-issues.json', jiraCsv: 'frontend-issues.jira.csv' });
  const [nav, span, snap] = result.steps.map(s => s.lhr);
  assert.deepEqual(nav!.categories['custom-metrics'].auditRefs.map((r: { id: string }) => r.id), ['frontend-issues', 'web-vitals-overview', 'tbt-breakdown']);
  assert.equal(nav!.audits['frontend-issues'].displayValue, '6 issues: 3 P1 · 3 P2 · 0 P3');
  assert.equal(span!.audits['frontend-issues'].details.items.length, 1);
  assert.ok(nav!.audits['frontend-issues'].description.includes('frontend-issues.jira.csv'));
  assert.deepEqual(span!.audits['web-vitals-overview'].details.items[1].value.items.map((r: { metric: string; status: string }) => [r.metric, r.status]),
    [['Total Blocking Time (TBT)', 'Good']]);
  assert.equal(snap!.audits['frontend-issues'], undefined);
});

test('the Web Vitals audit uses each metric\'s scoring thresholds', () => {
  const audit = buildWebVitalsAudit((flowResult() as unknown as { steps: Array<{ lhr: never }> }).steps[0]!.lhr) as unknown as { details: any; displayValue: string };
  assert.deepEqual(audit.details.items[1].value.items, [
    { metric: 'Largest Contentful Paint (LCP)', value: '3.1 s', status: 'Poor', good: '1.2 s', poor: '2.4 s' },
    { metric: 'Total Blocking Time (TBT)', value: '420 ms', status: 'Poor', good: '150 ms', poor: '350 ms' },
    { metric: 'Cumulative Layout Shift (CLS)', value: '0.01', status: 'Good', good: '0.10', poor: '0.25' },
    { metric: 'First Contentful Paint (FCP)', value: '800 ms', status: 'Good', good: '934 ms', poor: '1.6 s' },
  ]);
  assert.equal(audit.displayValue, '2 good · 0 need improvement · 2 poor');
  assert.ok(audit.details.items[0].value.items[0].chart.startsWith('data:image/svg+xml;base64,'));
});
