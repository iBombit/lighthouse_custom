//import config from './custom-config.js';
import { Desktop, Mobile, myRelevantAudits } from './constants.js';
const desktop = new Desktop();
const mobile = new Mobile();

export const configDesktop = {
  extends: 'lighthouse:default',
  name: desktop.lighthouseReportName,
  settings: {
    throttling: {
      rttMs: desktop.rttMs,
      throughputKbps: desktop.throughputKbps,
      cpuSlowdownMultiplier: desktop.cpuSlowdownMultiplier,
      requestLatencyMs: desktop.requestLatencyMs,
      downloadThroughputKbps: desktop.downloadThroughputKbps,
      uploadThroughputKbps: desktop.uploadThroughputKbps
    },
    throttlingMethod: desktop.throttlingMethod,
    screenEmulation: {
      mobile: desktop.screenEmulationMobile,
      width: desktop.screenWidth,
      height: desktop.screenHeight,
      deviceScaleFactor: desktop.deviceScaleFactor,
      disabled: desktop.screenEmulationDisabled
    },
    formFactor: desktop.formFactor,
  },
  // 2. Register new artifact with custom gatherer.
  artifacts: [
    { id: 'MemoryProfile', gatherer: './settings/gatherers/memory-gatherer.js' },
  ],
  // 3. Add custom audit to the list of audits 'lighthouse:default' will run.
  audits: [
    './settings/audits/memory-audit',
    './settings/audits/network-requests',
    './settings/audits/network-server-latency',
    './settings/audits/main-thread-tasks',
    './settings/audits/final-screenshot',
  ],
  categories: {
    'server-side': {
      title: 'Server-Side Metrics',
      description: 'API loading speed, Server-side latency and screenshot times. ',
      supportedModes: ['navigation', 'timespan'],
      auditRefs: [
        { id: 'network-requests', weight: 1, group: 'metrics', acronym: 'NR', relevantAudits: myRelevantAudits },
        { id: 'network-rtt', weight: 0, group: 'metrics', acronym: 'RTT' },
        { id: 'network-server-latency', weight: 1, group: 'metrics', acronym: 'SBL', relevantAudits: myRelevantAudits },
        { id: 'main-thread-tasks', weight: 0, group: 'metrics' },
        { id: 'screenshot-thumbnails', weight: 0, group: 'metrics' },
        { id: 'final-screenshot', weight: 1, group: 'metrics', acronym: 'FS' },
        { id: 'mainthread-work-breakdown', weight: 0, group: 'metrics' },
        { id: 'memory-audit', weight: 1 },
      ],
    },
  },
};

export const configMobile = {
  extends: 'lighthouse:default',
  configContext: {
    settingsOverrides: {
      throttling: {
        rttMs: mobile.rttMs,
        throughputKbps: mobile.throughputKbps,
        cpuSlowdownMultiplier: mobile.cpuSlowdownMultiplier,
        requestLatencyMs: mobile.requestLatencyMs,
        downloadThroughputKbps: mobile.downloadThroughputKbps,
        uploadThroughputKbps: mobile.uploadThroughputKbps
      },
      throttlingMethod: mobile.throttlingMethod,
      screenEmulation: {
        mobile: mobile.screenEmulationMobile,
        width: mobile.screenWidth,
        height: mobile.screenHeight,
        deviceScaleFactor: mobile.deviceScaleFactor,
        disabled: mobile.screenEmulationDisabled
      },
      formFactor: mobile.formFactor,
    },
  },
  // 2. Register new artifact with custom gatherer.
  artifacts: [
    { id: 'MemoryProfile', gatherer: './settings/gatherers/memory-gatherer.js' },
  ],
  // 3. Add custom audit to the list of audits 'lighthouse:default' will run.
  audits: [
    './settings/audits/memory-audit',
    './settings/audits/network-requests',
    './settings/audits/network-server-latency',
    './settings/audits/main-thread-tasks',
    './settings/audits/final-screenshot',
  ],
  categories: {
    'server-side': {
      title: 'Server-Side Metrics',
      description: 'API loading speed, Server-side latency and screenshot times. ',
      supportedModes: ['navigation', 'timespan'],
      auditRefs: [
        { id: 'network-requests', weight: 1, group: 'metrics', acronym: 'NR', relevantAudits: myRelevantAudits },
        { id: 'network-rtt', weight: 0, group: 'metrics', acronym: 'RTT' },
        { id: 'network-server-latency', weight: 1, group: 'metrics', acronym: 'SBL', relevantAudits: myRelevantAudits },
        { id: 'main-thread-tasks', weight: 0, group: 'metrics' },
        { id: 'screenshot-thumbnails', weight: 0, group: 'metrics' },
        { id: 'final-screenshot', weight: 1, group: 'metrics', acronym: 'FS' },
        { id: 'mainthread-work-breakdown', weight: 0, group: 'metrics' },
        { id: 'memory-audit', weight: 1 },
      ],
    },
  },
};