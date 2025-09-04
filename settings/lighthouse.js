import fs from 'fs';
import path from 'path';
import { Desktop, Mobile, Mobile3G, Mobile4G, Mobile4G_Slow } from 'lh-pptr-framework/settings/constants.js';
import { configFilePath } from 'lh-pptr-framework/settings/testParams.js';

function createBaseConfig(device) {
  return {
    extends: 'lighthouse:default',
    name: device.lighthouseReportName,
    settings: {
      throttling: {
        rttMs: device.rttMs,
        throughputKbps: device.throughputKbps,
        cpuSlowdownMultiplier: device.cpuSlowdownMultiplier,
        requestLatencyMs: device.requestLatencyMs,
        downloadThroughputKbps: device.downloadThroughputKbps,
        uploadThroughputKbps: device.uploadThroughputKbps,
      },
      throttlingMethod: device.throttlingMethod,
      screenEmulation: {
        mobile: device.screenEmulationMobile,
        width: device.screenWidth,
        height: device.screenHeight,
        deviceScaleFactor: device.deviceScaleFactor,
        disabled: device.screenEmulationDisabled,
      },
      formFactor: device.formFactor,
    },
    artifacts: [
      { id: 'MemoryProfile', gatherer: 'lh-pptr-framework/settings/gatherers/memory-gatherer.js' },
      { id: 'SelectorTiming', gatherer: 'lh-pptr-framework/settings/gatherers/selector-timing-gatherer.js' },
    ],
    audits: [
      'lh-pptr-framework/settings/audits/network-longest-first-party.js',
      'lh-pptr-framework/settings/audits/network-slowest-request.js',
      'lh-pptr-framework/settings/audits/memory-audit.js',
      'lh-pptr-framework/settings/audits/network-requests.js',
      'lh-pptr-framework/settings/audits/network-server-latency.js',
      'lh-pptr-framework/settings/audits/main-thread-tasks.js',
      'lh-pptr-framework/settings/audits/final-screenshot.js',
      'lh-pptr-framework/settings/audits/selector-timing-audit.js',
      'lh-pptr-framework/settings/audits/enhanced-screenshot-thumbnails.js',
      'lh-pptr-framework/settings/audits/network-xhr-audit.js',
      'lh-pptr-framework/settings/audits/xhr-count-audit.js',
    ],
    categories: {
      'server-side': {
        title: 'Server-Side Metrics',
        description: 'API loading speed, Server-side latency and screenshot times.',
        supportedModes: ['navigation', 'timespan'],
        auditRefs: [
          { id: 'longest-first-party-request', weight: 1, group: 'metrics', acronym: 'FPA'},
          { id: 'slowest-network-request', weight: 1, group: 'metrics', acronym: 'FPA'},
          { id: 'network-requests', weight: 1, group: 'metrics', acronym: 'NR'},
          { id: 'network-rtt', weight: 0, group: 'metrics', acronym: 'RTT' },
          { id: 'network-server-latency', weight: 1, group: 'metrics', acronym: 'SBL'},
          { id: 'main-thread-tasks', weight: 0, group: 'metrics' },
          { id: 'enhanced-screenshot-thumbnails', weight: 0, group: 'metrics' },
          { id: 'final-screenshot', weight: 1, group: 'metrics', acronym: 'FS' },
          { id: 'mainthread-work-breakdown', weight: 0, group: 'metrics' },
          { id: 'memory-audit', weight: 1 },
          { id: 'selector-timing-audit', weight: 1, group: 'metrics', acronym: 'STV' },
          { id: 'network-xhr-audit', weight: 1, group: 'metrics', acronym: 'XHR' },
          { id: 'xhr-count-audit', weight: 1, group: 'metrics', acronym: 'XHC' },
        ],
      },
    },
  };
}

function getConfigByBrowserType(browserType) {
  const deviceMap = {
    desktop: new Desktop(),
    mobile: new Mobile(),
    mobile3G: new Mobile3G(),
    mobile4G: new Mobile4G(),
    mobile4GSlow: new Mobile4G_Slow(),
  };

  const baseConfig = createBaseConfig(deviceMap[browserType] || new Desktop());

  // Try to load and merge custom config file (if specified)
  if (configFilePath) {
    try {
      const customConfig = JSON.parse(fs.readFileSync(path.resolve(configFilePath), 'utf-8'));
      return {
        ...baseConfig,
        ...customConfig,
        settings: {
          ...baseConfig.settings,
          ...customConfig.settings,
        },
      };
    } catch (error) {
      console.error(`Failed to load custom config file: ${error.message}`);
      return baseConfig; // Fallback to base config if error occurs
    }
  }

  return baseConfig; // Default config if no custom file is provided
}

export { getConfigByBrowserType };