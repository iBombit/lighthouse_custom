import config from './custom-config.js';
import { Desktop, Mobile, myRelevantAudits } from './constants.js';
const desktop = new Desktop();
const mobile = new Mobile();

export const configDesktop = {
  extends: 'lighthouse:default',
  name: desktop.lighthouseReportName,
  settings: {
    "config-path": "./custom-config.js",
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
  categories: {
    'server-side': {
      title: 'Server-Side Metrics',
      description: 'API loading speed, Server-side latency and screenshot times. ',
      supportedModes: ['navigation', 'timespan'],
      auditRefs: [
          {id: 'network-requests', weight: 1, group: 'metrics', acronym: 'NR', relevantAudits: myRelevantAudits},
          {id: 'network-rtt', weight: 0, group: 'metrics', acronym: 'RTT'},
          {id: 'network-server-latency', weight: 1, group: 'metrics', acronym: 'SBL', relevantAudits: myRelevantAudits},
          {id: 'main-thread-tasks', weight: 0, group: 'metrics'},
          {id: 'screenshot-thumbnails', weight: 0, group: 'metrics'},
          {id: 'final-screenshot', weight: 1, group: 'metrics', acronym: 'FS'},
          {id: 'mainthread-work-breakdown', weight: 0, group: 'metrics'},
      ],
  },
  },
};

export const configMobile = {
  extends: 'lighthouse:default',
  //config,
  name: mobile.lighthouseReportName,
  configContext: {
    settingsOverrides: {
      "config-path": "./custom-config.js",
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
      //onlyCategories: ["performance"],
    },
  },
};