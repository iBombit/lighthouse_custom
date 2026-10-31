import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { distDir, runIsolated } from './helpers.ts';

interface ConfigDump {
  config: {
    extends: string;
    name: string;
    settings: Record<string, any>;
    artifacts: Array<{ id: string; gatherer: string }>;
    audits: string[];
    categories: Record<string, { title: string; supportedModes?: string[]; auditRefs: Array<{ id: string; weight: number; group?: string }> }>;
    groups?: Record<string, { title: string }>;
  };
  only: string[] | null;
  modes: Record<string, string[] | null>;
}

const dumpConfig = (browserType: string) => `
const c = await fw('settings/configLoader.js');
const config = c.getLighthouseConfigByBrowserType(${JSON.stringify(browserType)});
print({ config, only: c.getOnlyCategories(), modes: Object.fromEntries(['navigation', 'timespan', 'snapshot'].map(m => [m, c.getOnlyCategoriesForMode(m)])) });
`;

test('default desktop config: device settings, custom audits/gatherers and the Custom Metrics category', () => {
  const { config, only, modes } = runIsolated<ConfigDump>(dumpConfig('desktop'));
  assert.equal(config.extends, 'lighthouse:default');
  assert.equal(config.name, 'Desktop Report');
  assert.deepEqual(config.settings, {
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 10240, uploadThroughputKbps: 2048 },
    throttlingMethod: 'devtools',
    screenEmulation: { mobile: false, width: 1920, height: 1080, deviceScaleFactor: 1, disabled: false },
    formFactor: 'desktop',
  });
  assert.deepEqual(config.artifacts.map(a => a.id), ['MemoryProfile', 'SelectorTiming', 'NetworkRequestBodies']);
  assert.equal(config.audits.length, 15);
  assert.ok(['tbt-breakdown.js', 'main-thread-timeline.js', 'js-hotspots.js'].every(f => config.audits.some(a => a.endsWith(f))));
  // Audits/gatherers are referenced by absolute path of this very build.
  for (const modulePath of [...config.audits, ...config.artifacts.map(a => a.gatherer)]) {
    assert.ok(path.isAbsolute(modulePath), modulePath);
    assert.ok(modulePath.startsWith(path.join(distDir, 'settings')), modulePath);
    assert.ok(fs.existsSync(modulePath), modulePath);
  }
  assert.deepEqual(Object.keys(config.categories), ['custom-metrics']);
  const custom = config.categories['custom-metrics']!;
  assert.equal(custom.title, 'Custom Metrics');
  assert.deepEqual(custom.supportedModes, ['navigation', 'timespan']);
  assert.equal(custom.auditRefs.length, 17);
  // The main-thread audits and memory-audit (process-wide values, see its description) are informational: the weighted
  // audits are those of the former server-side category minus memory-audit.
  assert.deepEqual(custom.auditRefs.filter(r => r.weight > 0).map(r => r.id).sort(), ['final-screenshot', 'longest-first-party-request',
    'network-requests', 'network-server-latency', 'network-xhr-audit', 'selector-timing-audit', 'slowest-network-request', 'xhr-count-audit']);
  assert.deepEqual(Object.keys(config.groups!), ['custom-main-thread', 'custom-network', 'custom-page']);
  assert.ok(custom.auditRefs.every(r => r.group && config.groups![r.group]));
  assert.equal('additionalTraceCategories' in config.settings, false);
  assert.equal(only, null);
  assert.deepEqual(modes, { navigation: null, timespan: null, snapshot: null });
});

test('browser types map to their device profiles; unknown types use desktop', () => {
  const expected: Record<string, [string, number, number, boolean]> = {
    mobile: ['Mobile', 390, 40, true],
    mobile3G: ['Mobile Regular3G', 360, 300, true],
    mobile4G: ['Mobile Regular4G', 360, 150, true],
    mobile4GSlow: ['Mobile Slow4G', 360, 150, true],
    bogus: ['Desktop Report', 1920, 40, false],
  };
  for (const [type, [name, width, rtt, mobile]] of Object.entries(expected)) {
    const { config } = runIsolated<ConfigDump>(dumpConfig(type));
    assert.equal(config.name, name, type);
    assert.equal(config.settings.screenEmulation.width, width, type);
    assert.equal(config.settings.throttling.rttMs, rtt, type);
    assert.equal(config.settings.screenEmulation.mobile, mobile, type);
  }
});

test('custom config file is merged; framework-only settings are stripped and onlyCategories is mode-aware', () => {
  const custom = {
    settings: {
      throttling: { rttMs: 1 },
      formFactor: 'mobile',
      onlyCategories: ['performance', 'custom-metrics'],
      browserArgs: { headless: ['--a'], headful: ['--b'] },
    },
    groups: { metrics: { title: 'Metrics' } },
  };
  const { config, only, modes } = runIsolated<ConfigDump>(dumpConfig('desktop'), ['--configFile=custom.json'], { 'custom.json': JSON.stringify(custom) });
  assert.deepEqual(config.settings.throttling, { rttMs: 1 }); // top-level settings keys are replaced, not deep-merged
  assert.equal(config.settings.formFactor, 'mobile');
  assert.equal(config.settings.throttlingMethod, 'devtools');
  assert.equal('browserArgs' in config.settings, false);
  assert.equal('onlyCategories' in config.settings, false);
  // Groups from the file are added to the framework's own (needed by its audit refs).
  assert.deepEqual(Object.keys(config.groups!), ['custom-main-thread', 'custom-network', 'custom-page', 'metrics']);
  assert.equal(config.audits.length, 15);
  assert.deepEqual(only, ['performance', 'custom-metrics']);
  assert.deepEqual(modes, { navigation: ['performance', 'custom-metrics'], timespan: ['performance', 'custom-metrics'], snapshot: ['performance'] });
});

test('the former category id "server-side" in onlyCategories is mapped to "custom-metrics"', () => {
  const { only, modes } = runIsolated<ConfigDump>(dumpConfig('desktop'), ['--configFile=custom.json'],
    { 'custom.json': JSON.stringify({ settings: { onlyCategories: ['performance', 'server-side', 'custom-metrics'] } }) });
  assert.deepEqual(only, ['performance', 'custom-metrics']);
  assert.deepEqual(modes.snapshot, ['performance']);
});

test('--jsProfiling=true adds the V8 CPU profiler trace category', () => {
  const { config } = runIsolated<ConfigDump>(dumpConfig('mobile'), ['--jsProfiling=true']);
  assert.equal(config.settings.additionalTraceCategories, 'disabled-by-default-v8.cpu_profiler');
});

test('categories and audits from the custom config replace the defaults (shallow merge)', () => {
  const custom = { settings: { onlyCategories: ['server-side'] }, categories: { mine: { title: 'Mine', supportedModes: ['snapshot'], auditRefs: [] } } };
  const { config, modes } = runIsolated<ConfigDump>(dumpConfig('desktop'), ['--configFile=custom.json'], { 'custom.json': JSON.stringify(custom) });
  assert.deepEqual(Object.keys(config.categories), ['mine']);
  // server-side is no longer defined in the config, so it isn't filtered out for any mode.
  assert.deepEqual(modes, { navigation: ['server-side'], timespan: ['server-side'], snapshot: ['server-side'] });
});

test('an unreadable custom config falls back to the base config', () => {
  const r = runIsolated<{ name: string; audits: number; custom: unknown; args: string[] }>(`
const c = await fw('settings/configLoader.js');
const config = c.getLighthouseConfigByBrowserType('desktop');
print({ name: config.name, audits: config.audits.length, custom: c.loadCustomConfig(), args: c.getBrowserArgsFromCustomConfig(true) });
`, ['--configFile=broken.json'], { 'broken.json': '{ not json' });
  assert.equal(r.name, 'Desktop Report');
  assert.equal(r.audits, 15);
  assert.deepEqual(r.custom, {});
  assert.deepEqual(r.args, []);
});

test('Puppeteer launch options use browserArgs from the custom config, or the defaults', () => {
  const snippet = `
const { Browser } = await fw('settings/browser.js');
const b = new Browser('C:/Custom/chrome.exe');
print({ location: b.browserLocation, hd: b.headlessDesktop, fd: b.headfulDesktop, hm: b.headlessMobile, fm: b.headfulMobile });
`;
  const withConfig = runIsolated<Record<string, any>>(snippet, ['--configFile=custom.json'], { 'custom.json': JSON.stringify({ settings: { browserArgs: { headless: ['--h'], headful: ['--f'] } } }) });
  assert.equal(withConfig.location, 'C:/Custom/chrome.exe');
  assert.deepEqual(withConfig.hd, {
    executablePath: 'C:/Custom/chrome.exe',
    args: ['--window-size=1920,1080', '--h'],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  assert.deepEqual(withConfig.fm, {
    executablePath: 'C:/Custom/chrome.exe',
    headless: false,
    args: ['--window-size=390,844', '--f'],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 3 },
  });

  const defaults = runIsolated<Record<string, any>>(snippet);
  assert.deepEqual(defaults.hd.args, ['--window-size=1920,1080', '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--display', '--ignore-certificate-errors', '--disable-storage-reset=true']);
  assert.deepEqual(defaults.fd.args, ['--window-size=1920,1080', '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true']);
  assert.equal(defaults.fd.headless, false);
  assert.equal('headless' in defaults.hd, false);
});

test('the Chrome location is derived from the OS type when no path is given', () => {
  const r = runIsolated<Record<string, string>>(`
const { Browser } = await fw('settings/browser.js');
const out = {};
for (const os of ['Windows_NT', 'Darwin', 'Linux', 'SunOS']) { try { out[os] = new Browser(os).browserLocation; } catch (e) { out[os] = 'error: ' + e.message; } }
print(out);
`);
  assert.deepEqual(r, {
    Windows_NT: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    Darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    Linux: '/usr/lib/chromium/chrome',
    SunOS: 'error: Unsupported operating system: SunOS',
  });
});
