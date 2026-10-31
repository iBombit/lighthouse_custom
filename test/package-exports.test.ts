import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chdirToTemp, distDir } from './helpers.ts';

chdirToTemp(); // importing the audits loads the logger, which writes a log file into the cwd

/** Every module path published by 1.x — consumers (and custom Lighthouse configs) import these. */
const PUBLIC_MODULES = [
  'core/browser.js', 'core/page.js',
  'core/elements/button.js', 'core/elements/dropdown.js', 'core/elements/element.js',
  'core/elements/iframe.js', 'core/elements/textField.js', 'core/elements/uploadField.js',
  'logger/logger.js',
  'reporting/createReport.js', 'reporting/waterfall.js',
  'reporting/reporters/csv.js', 'reporting/reporters/datadog.js', 'reporting/reporters/influx_v1.js',
  'reporting/reporters/influx_v2.js', 'reporting/reporters/slackWebhook.js', 'reporting/reporters/teamsWebhook.js',
  'reporting/reporters/teamsWorkflow.js',
  'settings/browser.js', 'settings/configLoader.js', 'settings/constants.js', 'settings/mochaHooks.js', 'settings/testParams.js',
  'settings/audits/enhanced-screenshot-thumbnails.js', 'settings/audits/final-screenshot.js', 'settings/audits/main-thread-tasks.js',
  'settings/audits/memory-audit.js', 'settings/audits/metrics-to-audits.js', 'settings/audits/network-audit.js',
  'settings/audits/network-longest-first-party.js', 'settings/audits/network-requests.js', 'settings/audits/network-server-latency.js',
  'settings/audits/network-slowest-request.js', 'settings/audits/network-waterfall.js', 'settings/audits/network-xhr-audit.js',
  'settings/audits/selector-timing-audit.js', 'settings/audits/xhr-count-audit.js',
  'settings/gatherers/memory-gatherer.js', 'settings/gatherers/network-request-bodies-gatherer.js', 'settings/gatherers/selector-timing-gatherer.js',
];

test('every 1.x module path resolves (ESM) to the compiled file in dist/', () => {
  for (const modulePath of PUBLIC_MODULES) {
    const resolved = fileURLToPath(import.meta.resolve(`lh-pptr-framework/${modulePath}`));
    assert.equal(resolved, path.join(distDir, modulePath), modulePath);
    assert.ok(fs.existsSync(resolved), `${modulePath} was not built`);
    assert.ok(fs.existsSync(resolved.replace(/\.js$/, '.d.ts')), `${modulePath} has no type declarations`);
  }
});

test('module paths also resolve through CommonJS resolution (used by Lighthouse for custom configs)', () => {
  const require = createRequire(import.meta.url);
  assert.ok(require.resolve('lh-pptr-framework/settings/audits/network-requests.js').endsWith('network-requests.js'));
  assert.ok(require.resolve('lh-pptr-framework/package.json').endsWith('package.json'));
});

test('custom audits and gatherers keep a default export (required by Lighthouse)', async () => {
  for (const modulePath of PUBLIC_MODULES.filter(p => /\/(audits|gatherers)\//.test(p) && !p.endsWith('metrics-to-audits.js'))) {
    const mod = await import(`lh-pptr-framework/${modulePath}`);
    assert.equal(typeof mod.default, 'function', modulePath);
  }
});
