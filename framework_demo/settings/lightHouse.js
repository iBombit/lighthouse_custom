const config = require('./custom-config');

// Selectors
const Constants = require('./constants');
const desktop = new Constants.Desktop();
const mobile = new Constants.Mobile();

class LightHouse {
  get configDesktop() { return {
      config,
      name: desktop.lighthouseReportName,
      configContext: {
      settingsOverrides: {
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
            disabled: desktop.screenEmulationDisabled,
          },
          formFactor: desktop.formFactor,
          //onlyCategories: ["performance"],
      },
      },
  }};

  get configMobile() { return {
      config,
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
            disabled: mobile.screenEmulationDisabled,
          },
          formFactor: mobile.formFactor,
          //onlyCategories: ["performance"],
      },
      },
  }};
}

module.exports = {LightHouse: LightHouse};
