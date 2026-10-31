import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runIsolated } from './helpers.ts';

type Params = Record<string, unknown>;

const PRINT_PARAMS = `
const p = await fw('settings/testParams.js');
const out = {};
for (const [k, v] of Object.entries(p)) if (typeof v !== 'function') out[k] = v;
print(out);
`;

test('defaults when no parameters are given', () => {
  const p = runIsolated<Params>(PRINT_PARAMS);
  assert.equal(p.loops, 1);
  assert.equal(p.testTime, 120000);
  assert.equal(p.suitTime, 1800000);
  assert.equal(p.headless, true);
  assert.equal(p.browserType, 'desktop');
  assert.equal(p.regions, 'not set');
  assert.equal(p.includeTimestamp, false);
  assert.equal(p.generateCSV, false);
  for (const key of ['url', 'login', 'password', 'configFilePath', 'ddHost', 'teamsWorkflow', 'influxUrl']) assert.equal(p[key], undefined, key);
});

test('parses every parameter (names are case-insensitive, values may contain "=")', () => {
  const p = runIsolated<Params>(PRINT_PARAMS, [
    '--loops=3', '--testTime=30', '--SUITTIME=600', '--headless=false', '--browserType=mobile4G', '--login=user@x.com',
    '--password=p=a=ss', '--url=https://demoqa.com/', '--regions=eu.us', '--browserLocation=C:/chrome.exe',
    '--ddKey=k', '--ddHost=api.dd', '--teamsWebhook=https://t/w', '--slackWebhook=https://s/w', '--ciUrl=https://ci',
    '--influxUrl=http://i:8086', '--influxToken=t', '--influxOrg=o', '--influxBucket=b', '--influxUsername=u',
    '--influxPassword=pw', '--influxDatabase=db', '--configFile=cfg.json', '--includeTimestamp=true', '--generateCSV=true',
  ]);
  assert.deepEqual(p, {
    uploadDir: p.uploadDir,
    loops: 3, testTime: 30000, suitTime: 600000, headless: false, browserType: 'mobile4G',
    login: 'user@x.com', password: 'p=a=ss', url: 'https://demoqa.com/', regions: ['eu', 'us'], browserLocation: 'C:/chrome.exe',
    ddHost: 'api.dd', ddKey: 'k', influxUrl: 'http://i:8086', influxToken: 't', influxOrg: 'o', influxBucket: 'b',
    influxUsername: 'u', influxPassword: 'pw', influxDatabase: 'db', ciUrl: 'https://ci', teamsWebhook: 'https://t/w',
    slackWebhook: 'https://s/w', configFilePath: 'cfg.json', includeTimestamp: true, generateCSV: true,
    saveTraces: false, jsProfiling: false,
  }); // (unset parameters such as teamsWorkflow are undefined, so they are absent from the JSON dump)
});

test('unknown browser types fall back to desktop; teamsWorkflowUrl is an alias', () => {
  const p = runIsolated<Params>(PRINT_PARAMS, ['--browserType=tablet', '--teamsWorkflowUrl=https://flow?a=1', '--generateCSV=yes', '--includeTimestamp=1']);
  assert.equal(p.browserType, 'desktop');
  assert.equal(p.teamsWorkflow, 'https://flow?a=1');
  assert.equal(p.generateCSV, false); // only the literal "true" enables CSV
  assert.equal(p.includeTimestamp, true); // anything but "false" enables timestamps
});

test('--saveTraces and --jsProfiling are enabled only by "true"', () => {
  assert.deepEqual(
    runIsolated<Params>(`const p = await fw('settings/testParams.js'); print({ saveTraces: p.saveTraces, jsProfiling: p.jsProfiling });`, ['--saveTraces=true', '--JSPROFILING=true']),
    { saveTraces: true, jsProfiling: true });
  assert.deepEqual(
    runIsolated<Params>(`const p = await fw('settings/testParams.js'); print({ saveTraces: p.saveTraces, jsProfiling: p.jsProfiling });`, ['--saveTraces=yes']),
    { saveTraces: false, jsProfiling: false });
});

test('getBrowserInstance() rejects before setupBrowser()', () => {
  const r = runIsolated<string>(`
const p = await fw('settings/testParams.js');
try { await p.getBrowserInstance(); print('resolved'); } catch (e) { print(e.message); }
`);
  assert.equal(r, 'Browser not initialized. Call setupBrowser first.');
});
