import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chdirToTemp } from './helpers.ts';

chdirToTemp();
const { requestTimingBreakdown, timingHint, cacheSource } = await import('lh-pptr-framework/settings/audits/network-timing.js');
const { pickKeyFrames, MAX_KEY_FRAMES } = await import('lh-pptr-framework/settings/audits/enhanced-screenshot-thumbnails.js');
const { default: MemoryAudit } = await import('lh-pptr-framework/settings/audits/memory-audit.js');
const { default: SelectorTimingAudit } = await import('lh-pptr-framework/settings/audits/selector-timing-audit.js');
const { collectFrontendIssues } = await import('lh-pptr-framework/reporting/frontendIssues.js');

type TimingRecord = Parameters<typeof requestTimingBreakdown>[0];
const MB = 1024 * 1024;

test('request timing is split into DevTools phases that add up to the total', () => {
  // Queued at 1000 ms, network request at 1010 ms (requestTime 1.010 s), DNS 5 ms, TCP 20 ms incl. TLS 12 ms,
  // request sent at +30, first byte at +230, headers done at 1242, finished at 1300.
  const record = {
    rendererStartTime: 1000, networkRequestTime: 1010, responseHeadersEndTime: 1242, networkEndTime: 1300,
    timing: {
      requestTime: 1.010, proxyStart: -1, proxyEnd: -1, dnsStart: 2, dnsEnd: 7, connectStart: 7, connectEnd: 27, sslStart: 15, sslEnd: 27,
      workerStart: -1, workerReady: -1, workerFetchStart: -1, workerRespondWithSettled: -1, sendStart: 28, sendEnd: 30,
      pushStart: 0, pushEnd: 0, receiveHeadersStart: 230, receiveHeadersEnd: 232,
    },
  } as unknown as TimingRecord;
  const t = requestTimingBreakdown(record);
  assert.deepEqual(t.phases.map(p => p.name), ['queue', 'dns', 'connect', 'ssl', 'send', 'wait', 'download']);
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  assert.ok(near(t.queueing, 12) && near(t.dns, 5) && near(t.connect, 8) && near(t.ssl, 12), JSON.stringify(t));
  // Request sent 1037 → 1040 (incl. the 1 ms gap after the connection) + waiting 1040 → 1242 (headers received).
  assert.ok(near(t.waiting, 3 + 202) && near(t.download, 58) && near(t.total, 300), JSON.stringify(t));
  assert.ok(near(t.phases.reduce((s, p) => s + p.end - p.start, 0), t.total), 'phases cover the request without gaps or overlaps');
  assert.equal(timingHint(t), 'mostly server time (TTFB): check the backend, caching or CDN');

  // No resource timing (e.g. memory cache): waiting + download from Lighthouse's own times.
  const cached = requestTimingBreakdown({ rendererStartTime: 50, networkRequestTime: 50, responseHeadersEndTime: 51, networkEndTime: 52 } as unknown as TimingRecord);
  assert.deepEqual(cached.phases.map(p => p.name), ['wait', 'download']);
  assert.equal(timingHint(cached), '', 'nothing to say about a 2 ms request');
  assert.equal(cacheSource({ fromMemoryCache: true, fromDiskCache: false, fromPrefetchCache: false, fetchedViaServiceWorker: false }), 'memory cache');
});

test('key frames keep the first and last frame, the must-have frames and spread the rest', () => {
  const timings = Array.from({ length: 185 }, (_, i) => i * 44);
  const picked = pickKeyFrames(timings, [3, 90]);
  assert.ok(picked.length <= MAX_KEY_FRAMES && picked.length >= 6, String(picked));
  assert.ok([0, 3, 90, 184].every(i => picked.includes(i)), String(picked));
  assert.deepEqual([...picked].sort((a, b) => a - b), picked, 'sorted');
  assert.deepEqual(pickKeyFrames([0, 100, 200], [1]), [0, 1, 2], 'few frames: all kept');
});

test('memory audit lists the page size, retained JS heap, listeners and documents without scoring them', () => {
  const memory = { pageElements: 413, jsHeapUsed: 30 * MB, jsHeapTotal: 45 * MB, embedderHeapUsed: 6 * MB, backingStorage: 0, domNodes: 1834, jsEventListeners: 412, documents: 2, afterGarbageCollection: true };
  type Result = { score: unknown; numericValue?: number; displayValue: string; details: { items: Array<{ id: string; raw: number; metric: string }> } };
  const result = MemoryAudit.audit({ MemoryProfile: memory } as never) as unknown as Result;
  assert.equal(MemoryAudit.meta.scoreDisplayMode, 'informative');
  assert.equal(result.score, null, 'process-wide values (incl. back/forward-cached pages) are not scored');
  assert.equal(result.numericValue, undefined, 'no numericValue: the Datadog / InfluxDB metric set is unchanged');
  assert.equal(result.displayValue, 'JS heap 30.0 MB · 413 elements on the page · 412 listeners');
  assert.deepEqual(result.details.items.map(i => i.id), ['pageElements', 'jsHeapUsed', 'jsHeapTotal', 'embedderHeapUsed', 'domNodes', 'jsEventListeners', 'documents']);
  assert.equal(result.details.items[1].metric, 'JS heap used (renderer, after garbage collection)');
  const noGc = MemoryAudit.audit({ MemoryProfile: { ...memory, pageElements: undefined, afterGarbageCollection: false } } as never) as unknown as Result;
  assert.equal(noGc.details.items[0].metric, 'JS heap used (renderer, garbage collection failed: includes garbage)');
});

test('selector timing is not applicable when the step did not validate the page', () => {
  const none = SelectorTimingAudit.audit({ SelectorTiming: { pageValidateTiming: null } } as never) as { score: unknown; notApplicable?: boolean; numericValue?: number };
  assert.equal(none.notApplicable, true);
  assert.equal(none.numericValue, undefined, 'no fake 0 ms value');
  const measured = SelectorTimingAudit.audit({ SelectorTiming: { pageValidateTiming: { selector: '#title', duration: 1750, stepName: 's', timestamp: 0 } } } as never) as { score: number; numericValue: number };
  assert.equal(measured.numericValue, 1750);
  assert.equal(measured.score, 0.5);
});

/** A step whose audits are given as `{id: details}`. */
function step(name: string, gatherMode: string, audits: Record<string, unknown>, url = 'https://shop.example.com/cart') {
  return {
    name,
    lhr: {
      gatherMode, finalDisplayedUrl: url, requestedUrl: url, categories: {},
      audits: Object.fromEntries(Object.entries(audits).map(([id, details]) => [id, { id, title: id, score: 1, scoreDisplayMode: 'informative', details }])),
    },
  };
}
const memoryDetails = (heapMb: number, listeners: number, nodes: number) => ({
  type: 'table', items: [
    { id: 'jsHeapUsed', raw: heapMb * MB }, { id: 'domNodes', raw: nodes }, { id: 'jsEventListeners', raw: listeners },
  ],
});

test('memory that keeps growing over interactions on one page becomes a possible-leak issue', () => {
  const flow = {
    steps: [
      step('[N]_Cart', 'navigation', { 'memory-audit': memoryDetails(20, 300, 1500) }),
      step('[T]_Add item', 'timespan', { 'memory-audit': memoryDetails(24, 420, 1700) }),
      step('[T]_Add item again', 'timespan', { 'memory-audit': memoryDetails(29, 540, 1900) }),
      step('[N]_Home', 'navigation', { 'memory-audit': memoryDetails(15, 200, 900) }, 'https://shop.example.com/'),
      step('[T]_Open menu', 'timespan', { 'memory-audit': memoryDetails(15, 200, 900) }, 'https://shop.example.com/'),
    ],
  };
  const issues = collectFrontendIssues(flow as never);
  const leak = issues.filter(i => i.category === 'Memory');
  assert.equal(leak.length, 1, JSON.stringify(issues.map(i => i.title)));
  assert.equal(leak[0].title, 'Possible memory leak: memory keeps growing on cart (shop.example.com)');
  assert.ok(leak[0].occurrences[0].impact.includes('JS heap 20.0 → 29.0 MB') && leak[0].occurrences[0].impact.includes('event listeners 300 → 540'));
  assert.equal(leak[0].occurrences[0].evidence.length, 3);
});

test('failing, slow and repeated API calls become issues for the right owner', () => {
  const xhr = {
    type: 'table', items: [
      { url: 'https://api.shop.example.com/v1/cart?id=1', requestMethod: 'GET', statusCode: 200, duration: 2300, serverTime: 2100, downloadTime: 20, diagnosis: 'mostly server time (TTFB): check the backend, caching or CDN' },
      { url: 'https://api.shop.example.com/v1/promo', requestMethod: 'POST', statusCode: 404, duration: 80 },
    ],
  };
  const count = { type: 'table', items: [
    { category: 'Repeated call', name: 'GET https://api.shop.example.com/v1/user', count: 4, percentage: 50 },
    { category: 'Repeated call', name: 'GET https://cds.tracker.example/?uid=1', count: 5, percentage: 50 },
  ] };
  const issues = collectFrontendIssues({ steps: [step('[N]_Cart', 'navigation', { 'network-xhr-audit': xhr, 'xhr-count-audit': count })] } as never);
  const byTitle = Object.fromEntries(issues.map(i => [i.title, i]));
  const slow = byTitle['Slow API endpoint: GET cart (api.shop.example.com)'];
  assert.ok(slow && slow.owner === 'backend' && slow.priority === 'P3', JSON.stringify(Object.keys(byTitle)));
  assert.ok(slow.occurrences[0].evidence.some(e => e.startsWith('Time split: server (TTFB) 2100 ms')));
  const failing = byTitle['Failing API call: POST promo (api.shop.example.com) (404)'];
  assert.ok(failing && failing.owner === 'frontend' && failing.priority === 'P2');
  const repeated = byTitle['Repeated API call: GET user (api.shop.example.com) ×4'];
  assert.ok(repeated && repeated.owner === 'frontend' && repeated.priority === 'P2');
  // Calls to other sites (tags, ads, analytics) are the vendor's: third-party owner, P3.
  const vendor = byTitle['Repeated third-party call: GET / (cds.tracker.example) ×5'];
  assert.ok(vendor && vendor.owner === 'third-party' && vendor.priority === 'P3', JSON.stringify(Object.keys(byTitle)));
});

test('a slow first-party request that is mostly download goes to frontend, mostly server time to backend', () => {
  const longest = (serverTime: number, downloadTime: number) => ({
    id: 'longest-first-party-request', title: 'l', score: 0.5, scoreDisplayMode: 'numeric', numericValue: 1400,
    details: { type: 'table', items: [{ url: 'https://shop.example.com/assets/app.js', duration: 1400, serverTime, downloadTime, setupTime: 5, diagnosis: 'x' }] },
  });
  const ownerFor = (server: number, download: number) => {
    const s = step('[N]_Cart', 'navigation', {});
    (s.lhr.audits as Record<string, unknown>)['longest-first-party-request'] = longest(server, download);
    return collectFrontendIssues({ steps: [s] } as never).find(i => i.title.startsWith('Slow first-party request'))?.owner;
  };
  assert.equal(ownerFor(390, 1000), 'frontend');
  assert.equal(ownerFor(1200, 100), 'backend');
});
