import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chdirToTemp, runIsolated } from './helpers.ts';

chdirToTemp();
const { default: LighthouseBrowser } = await import('lh-pptr-framework/core/browser.js');

/** A LighthouseBrowser whose Lighthouse flow and page are recording fakes. */
function fakeBrowser() {
  const calls: unknown[][] = [];
  const browser = new LighthouseBrowser('desktop', true, 'C:/chrome.exe');
  browser.page = { url: () => 'https://current.example.com/' } as never;
  browser.flow = new Proxy({} as Record<string | symbol, unknown>, {
    get: (target, method) => target[method] ?? (async (...args: unknown[]) => { calls.push([method, ...args]); }),
  }) as never;
  return { browser, calls };
}

test('navigation(): warm Lighthouse navigation, defaulting to the current URL', async () => {
  const { browser, calls } = fakeBrowser();
  await browser.navigation('[N]_Home', 'https://demoqa.com/');
  await browser.navigation('[N]_Current');
  assert.deepEqual(calls, [
    ['navigate', 'https://demoqa.com/', { name: '[N]_Home', configContext: { settingsOverrides: { disableStorageReset: true } } }],
    ['navigate', 'https://current.example.com/', { name: '[N]_Current', configContext: { settingsOverrides: { disableStorageReset: true } } }],
  ]);
});

test('customNavigation() and timespan() wrap the actions in the matching flow step', async () => {
  const { browser, calls } = fakeBrowser();
  await browser.customNavigation('[N]_Custom', async () => { calls.push(['actions']); });
  await browser.timespan('[T]_Click', async () => { calls.push(['actions']); });
  await browser.snapshot({ name: 'snap' });
  assert.deepEqual(calls, [
    ['startNavigation', { name: '[N]_Custom' }], ['actions'], ['endNavigation'],
    ['startTimespan', { name: '[T]_Click' }], ['actions'], ['endTimespan'],
    ['snapshot', { name: 'snap' }],
  ]);
});

test('navigation errors are wrapped', async () => {
  const { browser } = fakeBrowser();
  (browser.flow as unknown as Record<string, unknown>).navigate = async () => { throw new Error('nav failed'); };
  await assert.rejects(browser.navigation('x', 'https://x'), (e: Error) => e.message === 'Error: nav failed');
});

test('init() rejects unknown browser types (untyped callers)', async () => {
  const browser = new LighthouseBrowser('tablet' as never, true, 'C:/chrome.exe');
  await assert.rejects(browser.init(), { message: 'browserType is not correct! Received: tablet' });
});

test('onlyCategories from the custom config is applied per step (snapshots only get categories that support them)', () => {
  const calls = runIsolated<unknown[][]>(`
const LB = (await fw('core/browser.js')).default;
(await fw('settings/configLoader.js')).getLighthouseConfigByBrowserType('desktop');
const calls = [];
const b = new LB('desktop', true, 'C:/chrome.exe');
b.page = { url: () => 'https://x/' };
b.flow = new Proxy({}, { get: (_, m) => async (...a) => { calls.push([m, ...a]); } });
await b.navigation('n', 'https://x/');
await b.timespan('t', async () => {});
await b.snapshot({ name: 's' });
print(calls);
`, ['--configFile=custom.json'], { 'custom.json': JSON.stringify({ settings: { onlyCategories: ['performance', 'server-side'] } }) });
  // ('server-side' is the former id of the Custom Metrics category and is mapped to 'custom-metrics'.)
  assert.deepEqual(calls, [
    ['navigate', 'https://x/', { name: 'n', configContext: { settingsOverrides: { disableStorageReset: true } }, onlyCategories: ['performance', 'custom-metrics'] }],
    ['startTimespan', { name: 't', onlyCategories: ['performance', 'custom-metrics'] }],
    ['endTimespan'],
    ['snapshot', { name: 's', onlyCategories: ['performance'] }],
  ]);
});

test('Page builds URLs from --url and names steps after the running test', () => {
  const r = runIsolated<{ urls: string[]; steps: unknown[][]; isSuccess: boolean }>(`
const Page = (await fw('core/page.js')).default;
class Home extends Page { constructor() { super(); this.setPath('text-box'); } }
const urls = ['', '/', 'text-box', '//a//b/'].map(p => { const pg = new Home(); pg.setPath(p); return pg.getURL(); });
const steps = [];
const browser = { navigation: async (...a) => { steps.push(a); return browser; } };
const home = new Home();
const page = {};
home.init(page);
await home.navigation(browser, { test: { title: '[N]_From_test_title' } });
await home.navigation(browser, undefined, 'https://other/');
print({ urls, steps, isSuccess: page.isSuccess });
`, ['--url=https://demoqa.com/']);
  assert.deepEqual(r.urls, ['https://demoqa.com/', 'https://demoqa.com/', 'https://demoqa.com/text-box', 'https://demoqa.com/a//b/']);
  assert.deepEqual(r.steps, [['[N]_From_test_title', 'https://demoqa.com/text-box', null], ['[N]_Home', 'https://other/', null]]);
  assert.equal(r.isSuccess, true);
});
