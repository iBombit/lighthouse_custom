import { Desktop, Mobile, Mobile3G, Mobile4G, Mobile4G_Slow } from './constants.js';

export const configDesktop = createBaseConfig(new Desktop());
export const configMobile = createBaseConfig(new Mobile());
export const configMobile3G = createBaseConfig(new Mobile3G());
export const configMobile4G = createBaseConfig(new Mobile4G());
export const configMobile4GSlow = createBaseConfig(new Mobile4G_Slow());

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
        uploadThroughputKbps: device.uploadThroughputKbps
      },
      throttlingMethod: device.throttlingMethod,
      screenEmulation: {
        mobile: device.screenEmulationMobile,
        width: device.screenWidth,
        height: device.screenHeight,
        deviceScaleFactor: device.deviceScaleFactor,
        disabled: device.screenEmulationDisabled
      },
      formFactor: device.formFactor,
    },
    artifacts: [
      { id: 'MemoryProfile', gatherer: 'settings-module/gatherers/memory-gatherer.js' },
      // { id: 'DomContentLoadedTracker', gatherer: 'settings-module/gatherers/dom-content-loaded-tracker.js' },
      // { id: 'NetworkIdle0Tracker', gatherer: 'settings-module/gatherers/network-idle-0-tracker.js' },
      // { id: 'NetworkIdle2Tracker', gatherer: 'settings-module/gatherers/network-idle-2-tracker.js' },
    ],
    audits: [
      'settings-module/audits/network-longest-first-party.js',
      'settings-module/audits/network-slowest-request.js',
      'settings-module/audits/memory-audit.js',
      // 'settings-module/audits/dom-content-loaded-audit.js',
      // 'settings-module/audits/network-idle-0-audit.js',
      // 'settings-module/audits/network-idle-2-audit.js',
      'settings-module/audits/network-requests.js',
      'settings-module/audits/network-server-latency.js',
      'settings-module/audits/main-thread-tasks.js',
      'settings-module/audits/final-screenshot.js',
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
          { id: 'screenshot-thumbnails', weight: 0, group: 'metrics' },
          { id: 'final-screenshot', weight: 1, group: 'metrics', acronym: 'FS' },
          { id: 'mainthread-work-breakdown', weight: 0, group: 'metrics' },
          { id: 'memory-audit', weight: 1 },
          // { id: 'dom-content-loaded-audit', weight: 1, group: 'metrics' },
          // { id: 'network-idle-0-audit', weight: 1, group: 'metrics' },
          // { id: 'network-idle-2-audit', weight: 1, group: 'metrics' },
        ],
      },
    },
  };
}