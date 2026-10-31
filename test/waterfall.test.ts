import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chdirToTemp } from './helpers.ts';

chdirToTemp();
const { buildWaterfallSVG, generateWaterfalls } = await import('lh-pptr-framework/reporting/waterfall.js');
type Request = Parameters<typeof buildWaterfallSVG>[0][number];

const req = (url: string, start: number, duration: number, entity: string, mimeType = 'application/javascript', extra: Partial<Request> = {}): Request =>
  ({ url, start, duration, transferSize: 2048, resourceSize: 4096, statusCode: 200, mimeType, entity, ...extra });
const count = (s: string, needle: string) => s.split(needle).length - 1;

test('renders requests in start order with type colors, an entity summary and escaped labels', () => {
  const requests = [
    req('https://shop.example.com/', 0, 300, 'shop.example.com', 'text/html'),
    req('https://cdn.other.com/font.woff2', 400, 20, 'Other <CDN>', 'font/woff2'),
    req('https://shop.example.com/app.js', 320, 1500, 'shop.example.com'),
  ];
  const groups = [
    { name: 'shop.example.com', startIndex: 0, count: 2, totalDuration: 1800, totalTransfer: 4096 },
    { name: 'Other <CDN>', startIndex: 2, count: 1, totalDuration: 20, totalTransfer: 2048 },
  ];
  const svg = buildWaterfallSVG(requests, groups, [], 'Step "1" & <home>');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(svg.endsWith('</svg>'));
  assert.equal(count(svg, '<g'), count(svg, '</g>'));
  assert.ok(svg.includes('Step &quot;1&quot; &amp; &lt;home&gt;'));
  assert.ok(svg.includes('3 requests · 6 KB transferred · last response at 1.82s'));
  assert.equal(count(svg, '<g class="row">'), 3);
  // Start order: the document, app.js (320 ms), then the font (400 ms).
  const order = [...svg.matchAll(/<title>#(\d+) (\S+)/g)].map(m => m[2]);
  assert.deepEqual(order, ['https://shop.example.com/', 'https://shop.example.com/app.js', 'https://cdn.other.com/font.woff2']);
  assert.equal(count(svg, 'class="file-1p"'), 2, 'requests of the first entity are first party');
  assert.ok(svg.includes('fill="#7b61ff"'), 'HTML color');
  assert.ok(svg.includes('fill="#e86c8d"'), 'font color');
  assert.ok(svg.includes('Other &lt;CDN&gt;') && svg.includes('shop.example.com (1st party)'), 'entity summary');
  assert.ok(svg.includes('2 req · 4 KB · 1.80s'));
});

test('timing markers are sorted, staggered when close, and skipped far beyond the chart', () => {
  const markers: Parameters<typeof buildWaterfallSVG>[2] = [
    { t: 1010, label: 'LCP', color: '#0cce6b' },
    { t: 1000, label: 'FCP', color: '#1a73e8' },
    { t: 1020, label: 'DCL', color: '#4a90d9' },
    { t: 99999, label: 'Load', color: '#e86c8d' },
  ];
  const svg = buildWaterfallSVG([req('https://a.com/', 0, 2000, 'a.com')], [{ name: 'a.com', startIndex: 0, count: 1, totalDuration: 2000, totalTransfer: 2048 }], markers, 'step');
  assert.deepEqual(markers.map(m => [m.label, m._tier]), [['FCP', 0], ['LCP', 1], ['DCL', 2], ['Load', 0]]);
  assert.ok(svg.includes('>FCP 1.00s</text>') && svg.includes('>LCP 1.01s</text>') && svg.includes('>DCL 1.02s</text>'));
  assert.equal(count(svg, 'class="tm-line"'), 3, 'Load is far beyond the last request and is not drawn');
});

test('timing phases, render-blocking / LCP flags, the main-thread lane and the row limit', () => {
  const css = req('https://a.com/style.css', 10, 290, 'a.com', 'text/css', {
    resourceType: 'Stylesheet', renderBlocking: true, priority: 'VeryHigh',
    phases: [
      { name: 'queue', start: 10, end: 20 }, { name: 'dns', start: 20, end: 50 }, { name: 'connect', start: 50, end: 80 },
      { name: 'ssl', start: 60, end: 80 }, { name: 'wait', start: 80, end: 250 }, { name: 'download', start: 250, end: 300 },
    ],
  });
  const hero = req('https://a.com/hero.jpg', 320, 400, 'a.com', 'image/jpeg', { resourceType: 'Image', lcp: true, cache: 'disk cache' });
  const failed = req('https://api.a.com/items', 400, 100, 'a.com', 'application/json', { resourceType: 'Fetch', statusCode: 500 });
  const svg = buildWaterfallSVG([css, hero, failed], [], [], 'step', {
    tasks: [{ start: 100, duration: 30 }, { start: 400, duration: 120 }],
  });
  assert.ok(svg.includes('fill="#1b9aaa"') && svg.includes('fill="#f28e2b"') && svg.includes('fill="#a35bd6"'), 'DNS / connect / SSL');
  assert.ok(svg.includes('fill="#b9d4f2"') && svg.includes('fill="#4a90d9"'), 'CSS waiting tint and download color');
  assert.ok(svg.includes('fill="#fdecea"') && svg.includes('class="tag-rb">render-blocking'), 'render-blocking row');
  assert.ok(svg.includes('class="tag-lcp">LCP') && svg.includes('fill="#e6f4ea"'), 'LCP row');
  assert.ok(svg.includes('class="tag">disk cache'));
  assert.ok(svg.includes('class="err">500'), 'status of a failed request instead of its size');
  const canceled = buildWaterfallSVG([req('https://ads.example/beacon', 0, 50, 'ads', 'text/plain', { failed: true, failReason: 'net::ERR_ABORTED' })], [], [], 'step');
  assert.ok(canceled.includes('class="err">canceled') && canceled.includes('canceled (net::ERR_ABORTED)') && canceled.includes('1 failed or canceled'),
    'a request Chrome canceled shows as "canceled" (like DevTools), not with its 200 status');
  assert.ok(svg.includes('1 render-blocking · LCP resource: hero.jpg'));
  assert.ok(svg.includes('Highest priority') && svg.includes('Waiting (TTFB) 170ms'), 'tooltip details');
  assert.ok(svg.includes('>Main thread<') && svg.includes('Long task 120ms at 400ms'), 'CPU lane with the long task');

  const limited = buildWaterfallSVG([css, hero, failed], [], [], 'step', { maxRows: 2 });
  assert.equal(count(limited, '<g class="row">'), 2);
  assert.ok(limited.includes('… 1 more request(s) not drawn'));
});

test('generateWaterfalls writes one SVG per step with requests, preferring the network-waterfall chart', async () => {
  const groupedItems = [{ url: 'a.com', entity: 'a.com', duration: 10, transferSize: 5, subItems: { items: [{ url: 'https://a.com/x', networkRequestTime: 0, duration: 10, transferSize: 5, mimeType: 'text/html' }] } }];
  const chart = '<svg xmlns="http://www.w3.org/2000/svg"><text>audit chart →</text></svg>';
  const waterfallDetails = { type: 'list', items: [{ type: 'list-section', value: { type: 'table', items: [{ chart: `data:image/svg+xml;base64,${Buffer.from(chart).toString('base64')}` }] } }] };
  const flowResult = {
    name: 'flow',
    steps: [
      { name: '[N]_Home page', lhr: { audits: { 'network-requests': { details: { items: groupedItems } }, metrics: { details: { items: [{ observedFirstContentfulPaint: 5 }] } } } } },
      { name: 'snapshot', lhr: { audits: {} } },
      { name: '[N]_Shop', lhr: { audits: { 'network-requests': { details: { items: groupedItems } }, 'network-waterfall': { details: waterfallDetails } } } },
    ],
  };
  const dir = path.resolve('waterfalls');
  await generateWaterfalls(flowResult as never, dir);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['waterfall__N__Home_page.svg', 'waterfall__N__Shop.svg']);
  assert.ok(fs.readFileSync(path.join(dir, 'waterfall__N__Home_page.svg'), 'utf8').includes('>FCP 5ms</text>'));
  assert.equal(fs.readFileSync(path.join(dir, 'waterfall__N__Shop.svg'), 'utf8'), chart);
});
