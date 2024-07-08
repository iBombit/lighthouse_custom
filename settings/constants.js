import logger from "../logger/logger.js";

export class Desktop {
  constructor() {
    this.lighthouseReportName = 'Desktop Report';
    this.rttMs = 40;
    this.throughputKbps = 10240;
    this.cpuSlowdownMultiplier = 1;
    this.requestLatencyMs = 0; // Assuming values for demonstration
    this.downloadThroughputKbps = 10240;
    this.uploadThroughputKbps = 2048;
    this.throttlingMethod = 'simulate';
    this.screenEmulationMobile = false;
    this.screenWidth = 1920;
    this.screenHeight = 1080;
    this.deviceScaleFactor = 1;
    this.screenEmulationDisabled = false;
    this.formFactor = 'desktop';
  }
}

export class Mobile {
  constructor() {
    this.lighthouseReportName = 'Mobile';
    this.screenWidth = 390;
    this.screenHeight = 844;
    this.rttMs = 40;
    this.throughputKbps = 10240;
    this.cpuSlowdownMultiplier = 1;
    this.requestLatencyMs = 0;
    this.downloadThroughputKbps = 0;
    this.uploadThroughputKbps = 0;
    this.throttlingMethod = 'devtools';
    this.screenEmulationMobile = true;
    this.deviceScaleFactor = 3;
    this.screenEmulationDisabled = false;
    this.formFactor = 'mobile';
  }
}

export class Mobile3G {
  constructor() {
    this.lighthouseReportName = 'Mobile Regular3G';
    this.screenWidth = 360;
    this.screenHeight = 640;
    this.rttMs = 300;
    this.throughputKbps = 700;
    this.cpuSlowdownMultiplier = 1;
    this.requestLatencyMs = 300;
    this.downloadThroughputKbps = 700;
    this.uploadThroughputKbps = 700;
    this.throttlingMethod = 'devtools';
    this.screenEmulationMobile = true;
    this.deviceScaleFactor = 2.625;
    this.screenEmulationDisabled = false;
    this.formFactor = 'mobile';
  }
}

export class Mobile4G {
  constructor() {
    this.lighthouseReportName = 'Mobile Regular4G';
    this.screenWidth = 360;
    this.screenHeight = 640;
    this.rttMs = 150;
    this.throughputKbps = 1.6 * 1024;
    this.cpuSlowdownMultiplier = 1;
    this.requestLatencyMs = 150;
    this.downloadThroughputKbps = 1.6 * 1024;
    this.uploadThroughputKbps = 1.6 * 1024;
    this.throttlingMethod = 'devtools';
    this.screenEmulationMobile = true;
    this.deviceScaleFactor = 2.625;
    this.screenEmulationDisabled = false;
    this.formFactor = 'mobile';
    this.hasTouch = true;
  }
}

export class Mobile4G_Slow {
  constructor() {
    this.lighthouseReportName = 'Mobile Slow4G';
    this.screenWidth = 360;
    this.screenHeight = 640;
    this.rttMs = 150;
    this.throughputKbps = 1.6 * 1024 / 2;
    this.cpuSlowdownMultiplier = 1;
    this.requestLatencyMs = 150;
    this.downloadThroughputKbps = 1.6 * 1024 / 2;
    this.uploadThroughputKbps = 1.6 * 1024 / 2;
    this.throttlingMethod = 'devtools';
    this.screenEmulationMobile = true;
    this.deviceScaleFactor = 2.625;
    this.screenEmulationDisabled = false;
    this.formFactor = 'mobile';
    this.hasTouch = true;
  }
}

export class BrowserLocations {
  constructor(os) {
    this.os = os;
  }
  get chrome() {
    let location = ""
    logger.debug("[MESSAGE] Browser location not specified via '--browserLocation' + 'path' so trying to find it based on OS type")
    if (this.os === "Windows_NT") {
      location = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    } else if (this.os === 'Darwin') {
      location = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    } else if (this.os === 'Linux') {
      location = "/usr/lib/chromium/chrome"
    } else {
      throw new Error(`Unsupported operating system: ${this.os}`);
    }
    logger.debug(`[BROWSER] ${location}`)
    return location;
  }
}