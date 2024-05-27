//import config from './custom-config.js';
import { Desktop, Mobile, Mobile3G, Mobile4G, Mobile4G_Slow, myRelevantAudits } from './constants.js';
const desktop = new Desktop();
const mobile = new Mobile();
const mobile3G = new Mobile3G();
const mobile4G = new Mobile4G();
const mobile4GSlow = new Mobile4G_Slow();

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
  name: mobile.lighthouseReportName,
  settings: {
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

export const configMobile3G = {
  extends: 'lighthouse:default',
  name: mobile3G.lighthouseReportName,
  settings: {
    throttling: {
      rttMs: mobile3G.rttMs,
      throughputKbps: mobile3G.throughputKbps,
      cpuSlowdownMultiplier: mobile3G.cpuSlowdownMultiplier,
      requestLatencyMs: mobile3G.requestLatencyMs,
      downloadThroughputKbps: mobile3G.downloadThroughputKbps,
      uploadThroughputKbps: mobile3G.uploadThroughputKbps
    },
    throttlingMethod: mobile3G.throttlingMethod,
    screenEmulation: {
      mobile: mobile3G.screenEmulationMobile,
      width: mobile3G.screenWidth,
      height: mobile3G.screenHeight,
      deviceScaleFactor: mobile3G.deviceScaleFactor,
      disabled: mobile3G.screenEmulationDisabled
    },
    formFactor: mobile3G.formFactor,
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

export const configMobile4G = {
  extends: 'lighthouse:default',
  name: mobile4G.lighthouseReportName,
  settings: {
    throttling: {
      rttMs: mobile4G.rttMs,
      throughputKbps: mobile4G.throughputKbps,
      cpuSlowdownMultiplier: mobile4G.cpuSlowdownMultiplier,
      requestLatencyMs: mobile4G.requestLatencyMs,
      downloadThroughputKbps: mobile4G.downloadThroughputKbps,
      uploadThroughputKbps: mobile4G.uploadThroughputKbps
    },
    throttlingMethod: mobile4G.throttlingMethod,
    screenEmulation: {
      mobile: mobile4G.screenEmulationMobile,
      width: mobile4G.screenWidth,
      height: mobile4G.screenHeight,
      deviceScaleFactor: mobile4G.deviceScaleFactor,
      disabled: mobile4G.screenEmulationDisabled
    },
    formFactor: mobile4G.formFactor,
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

export const configMobile4GSlow = {
  extends: 'lighthouse:default',
  name: mobile4GSlow.lighthouseReportName,
  settings: {
    throttling: {
      rttMs: mobile4GSlow.rttMs,
      throughputKbps: mobile4GSlow.throughputKbps,
      cpuSlowdownMultiplier: mobile4GSlow.cpuSlowdownMultiplier,
      requestLatencyMs: mobile4GSlow.requestLatencyMs,
      downloadThroughputKbps: mobile4GSlow.downloadThroughputKbps,
      uploadThroughputKbps: mobile4GSlow.uploadThroughputKbps
    },
    throttlingMethod: mobile4GSlow.throttlingMethod,
    screenEmulation: {
      mobile: mobile4GSlow.screenEmulationMobile,
      width: mobile4GSlow.screenWidth,
      height: mobile4GSlow.screenHeight,
      deviceScaleFactor: mobile4GSlow.deviceScaleFactor,
      disabled: mobile4GSlow.screenEmulationDisabled
    },
    formFactor: mobile4GSlow.formFactor,
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