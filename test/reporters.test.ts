import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { chdirToTemp, makeStep } from './helpers.ts';

chdirToTemp();
const { sendMetricsToDD } = await import('lh-pptr-framework/reporting/reporters/datadog.js');
const { sendMetricsToSlack } = await import('lh-pptr-framework/reporting/reporters/slackWebhook.js');
const { sendMetricsToTeams } = await import('lh-pptr-framework/reporting/reporters/teamsWebhook.js');
const { sendMetricsToTeamsWorkflow } = await import('lh-pptr-framework/reporting/reporters/teamsWorkflow.js');
const { sendMetricsToInfluxV1 } = await import('lh-pptr-framework/reporting/reporters/influx_v1.js');
const { sendMetricsToInfluxV2 } = await import('lh-pptr-framework/reporting/reporters/influx_v2.js');
const { generateCSVReport } = await import('lh-pptr-framework/reporting/reporters/csv.js');
const { default: CreateReport, saveHTMLSource } = await import('lh-pptr-framework/reporting/createReport.js');

interface SentRequest { module: 'http' | 'https'; options: Record<string, any>; body: string }
let sent: SentRequest[] = [];
for (const [name, mod] of [['http', http], ['https', https]] as const) {
  // Capture requests instead of sending them.
  (mod as { request: unknown }).request = (options: Record<string, any>) => {
    const call: SentRequest = { module: name, options, body: '' };
    sent.push(call);
    return Object.assign(new EventEmitter(), { write: (chunk: string) => { call.body += chunk; return true; }, end: () => {} });
  };
}
beforeEach(() => { sent = []; });

const flowResult = {
  name: 'flow',
  steps: [
    makeStep('[N]_Home', 0.876, { 'first-contentful-paint': 1234.56, 'cumulative-layout-shift': 0.04567, 'network-requests': 2500.4, 'total-byte-weight': 2048000, 'speed-index': undefined }),
    makeStep('[S]_Snapshot, weird', 0, { 'first-contentful-paint': 10 }, { gatherMode: 'snapshot' }),
  ],
} as never;

test('Datadog: one gauge per numeric audit plus the score (only the first "-" of an id becomes "_")', async () => {
  await sendMetricsToDD('api.datadoghq.eu', 'KEY', flowResult);
  assert.equal(sent.length, 1);
  const [call] = sent;
  assert.equal(call!.module, 'https');
  assert.deepEqual(call!.options, { hostname: 'api.datadoghq.eu', path: '/api/v1/series', method: 'POST', headers: { 'Content-Type': 'application/json', 'DD-API-KEY': 'KEY' } });
  const series: Array<{ metric: string; points: number[][]; tags: string[] }> = JSON.parse(call!.body).series;
  assert.deepEqual(series.slice(0, 5).map(s => s.metric), ['website.performance.score', 'website.performance.first_contentful-paint', 'website.performance.cumulative_layout-shift', 'website.performance.network_requests', 'website.performance.total_byte-weight']);
  assert.ok(Math.abs(series[0]!.points[0]![1]! - 87.6) < 1e-9);
  assert.deepEqual(series[0]!.tags, ['step_name:[N]_Home', 'application_name:shop', 'environment:test']);
});

test('Slack: table of steps with a non-zero score', async () => {
  await sendMetricsToSlack('https://hooks.slack.com/services/A/B/C', flowResult);
  const { options, body } = sent[0]!;
  assert.equal(options.hostname, 'hooks.slack.com');
  assert.equal(options.path, '/services/A/B/C');
  const text: string = JSON.parse(body).text;
  assert.ok(text.startsWith('*UI Performance test notification*\n\n```'));
  assert.ok(text.endsWith('```'));
  const lines = text.slice(text.indexOf('```') + 3, -3).split('\n');
  const cells = (line: string) => line.split(' | ').map(c => c.trim());
  assert.deepEqual(cells(lines[0]!), ['Step', 'Score', 'FCP', 'SI', 'TTI', 'INP', 'TBT', 'LCP', 'CLS', 'JS time', 'API time', 'Slowest API', 'Slowest 1st party API']);
  assert.match(lines[1]!, /^-+(-\|-+)+$/);
  assert.deepEqual(cells(lines[2]!), ['[N]_Home', '88', '1235', '-', '-', '-', '-', '-', '0.05', '-', '2500', '-', '-']);
  assert.equal(lines.length, 3, 'steps scoring 0 are left out');
  // Column widths are computed over all steps, including the ones left out.
  assert.equal(lines[0]!.indexOf('| Score'), '[S]_Snapshot, weird'.length + 1);
});

test('Teams webhook and Teams Workflow post the same MessageCard', async () => {
  await sendMetricsToTeams('https://outlook.office.com/webhook/abc?ignored=1', flowResult);
  await sendMetricsToTeamsWorkflow('https://flow.example.com/workflows/1/invoke?api-version=1&sig=S', flowResult);
  assert.equal(sent[0]!.options.path, '/webhook/abc');
  assert.equal(sent[1]!.options.path, '/workflows/1/invoke?api-version=1&sig=S');
  assert.equal(sent[0]!.body, sent[1]!.body);
  const card = JSON.parse(sent[0]!.body);
  assert.equal(card['@type'], 'MessageCard');
  assert.equal(card.summary, 'Performance Metrics');
  assert.ok(card.text.includes('| Step | Score | FCP | SI | TTI | INP | TBT | LCP | CLS | JS time | API time |'));
  assert.ok(card.text.includes('| [N]_Home | 88 | 1235 | - | - | - | - | - | 0.05 | - | 2500 |'));
  assert.ok(!card.text.includes('Snapshot'));
});

test('InfluxDB v1 and v2: line protocol with escaped tags', async () => {
  await sendMetricsToInfluxV1('http://localhost:8086/', 'user', 'pass', 'perf db', flowResult);
  await sendMetricsToInfluxV2('https://influx.example.com:9999', 'TOKEN', 'my org', 'bucket', flowResult);
  const [v1, v2] = sent;
  assert.equal(v1!.module, 'http');
  assert.equal(v1!.options.path, '/write?db=perf db&precision=ms');
  assert.equal(v1!.options.headers.Authorization, 'Basic ' + Buffer.from('user:pass').toString('base64'));
  assert.match(v1!.body.split('\n')[0]!, /^performance,step=\[N\]_Home,database=perf\\ db score=88 \d+$/);
  assert.match(v1!.body, /\nperformance,step=\[S\]_Snapshot\\,\\ weird,database=perf\\ db first-contentful-paint=10 \d+$/);
  assert.equal(v2!.module, 'https');
  assert.equal(v2!.options.port, '9999');
  assert.equal(v2!.options.path, '/api/v2/write?org=my org&bucket=bucket&precision=ms');
  assert.equal(v2!.options.headers.Authorization, 'Token TOKEN');
});

test('CSV: navigation/timespan steps only, with thresholds and priorities', async () => {
  fs.mkdirSync('reports', { recursive: true });
  const file = await generateCSVReport(flowResult);
  assert.equal(file.replace(/\\/g, '/'), 'reports/performance-analysis.csv');
  const rows = fs.readFileSync(file, 'utf8').split('\n').map(r => r.split(','));
  assert.deepEqual(rows[0], ['Timestamp', 'Step Name', 'Step Type', 'URL', 'Application', 'Device Type', 'Metric Name', 'Metric Value', 'Metric Unit', 'Metric Category', 'Good Threshold', 'Poor Threshold', 'Threshold Status', 'Improvement Needed', 'Priority Level']);
  const byMetric = Object.fromEntries(rows.slice(1).map(r => [r[6], r.slice(1)]));
  assert.equal(rows.length, 1 + 5);
  assert.deepEqual(byMetric['Performance Score'], ['[N]_Home', 'Navigation', 'https://shop.example.com/cart', 'shop', 'desktop', 'Performance Score', '88', 'score', 'Core Web Vitals', '90', '50', 'NEEDS IMPROVEMENT', 'Increase by 2 score', 'MEDIUM']);
  assert.deepEqual(byMetric['Title of total-byte-weight']!.slice(6, 14), ['2000', 'KB', 'Network', '1600', '3000', 'NEEDS IMPROVEMENT', 'Reduce by 400 KB', 'LOW']);
  assert.deepEqual(byMetric['Title of cumulative-layout-shift']!.slice(6, 14), ['0.0457', 'score', 'Core Web Vitals', '0.1', '0.25', 'GOOD', '-', '-']);
});

test('CreateReport writes the HTML (with the chart scripts and links panel), JSON and issue files, then runs enabled reporters only', async () => {
  const report = new CreateReport();
  assert.deepEqual(report.reporters.map(r => r.condition()), [false, false, false, false, false, false, false]);
  const flow = { generateReport: async () => '<html><head></head><body></body></html>', createFlowResult: async () => flowResult };
  await report.createReports(flow as never);
  const html = fs.readFileSync('reports/user-flow.report.html', 'utf8');
  assert.ok(html.includes('[id="network-waterfall"] .lh-thumbnail'));
  assert.ok(html.includes('observe(document.documentElement, { childList: true, subtree: true })'));
  assert.ok(html.indexOf('</style>') < html.indexOf('</head>'));
  assert.ok(html.includes('[id="tbt-breakdown"] .lh-thumbnail'));
  assert.ok(html.includes('<div id="lh-fw-panel"') && html.includes('href="frontend-issues.md"'));
  assert.ok(html.lastIndexOf('lh-fw-panel') < html.lastIndexOf('</body>'));
  // Steps without the Custom Metrics category (like these minimal ones) are not enriched.
  assert.deepEqual(JSON.parse(fs.readFileSync('reports/user-flow.report.json', 'utf8')), JSON.parse(JSON.stringify(flowResult)));
  for (const file of ['frontend-issues.md', 'frontend-issues.json', 'frontend-issues.jira.csv']) assert.ok(fs.existsSync(`reports/${file}`), file);
  assert.equal(sent.length, 0);

  const saved = await saveHTMLSource({ content: async () => '<p>failed</p>' }, 'my failed step');
  assert.match(saved.replace(/\\/g, '/'), /^reports\/errors\/my_failed_step_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.html$/);
  assert.equal(fs.readFileSync(saved, 'utf8'), '<p>failed</p>');
});
