import logger from '../logger/logger.js';

/** Device/network profiles selectable with `--browserType`. */
export type BrowserType = 'desktop' | 'mobile' | 'mobile3G' | 'mobile4G' | 'mobile4GSlow';

export type ThrottlingMethod = 'devtools' | 'simulate' | 'provided';
export type FormFactor = 'desktop' | 'mobile';

/** Emulation + throttling values used to build the Puppeteer viewport and the Lighthouse config. */
export interface DeviceProfile {
  lighthouseReportName: string;
  rttMs: number;
  throughputKbps: number;
  cpuSlowdownMultiplier: number;
  requestLatencyMs: number;
  downloadThroughputKbps: number;
  uploadThroughputKbps: number;
  throttlingMethod: ThrottlingMethod;
  screenEmulationMobile: boolean;
  screenWidth: number;
  screenHeight: number;
  deviceScaleFactor: number;
  screenEmulationDisabled: boolean;
  formFactor: FormFactor;
  hasTouch?: boolean;
}

export class Desktop implements DeviceProfile {
  lighthouseReportName = 'Desktop Report';
  rttMs = 40;
  throughputKbps = 10240;
  cpuSlowdownMultiplier = 1;
  requestLatencyMs = 0;
  downloadThroughputKbps = 10240;
  uploadThroughputKbps = 2048;
  throttlingMethod: ThrottlingMethod = 'devtools';
  screenEmulationMobile = false;
  screenWidth = 1920;
  screenHeight = 1080;
  deviceScaleFactor = 1;
  screenEmulationDisabled = false;
  formFactor: FormFactor = 'desktop';
}

export class Mobile implements DeviceProfile {
  lighthouseReportName = 'Mobile';
  screenWidth = 390;
  screenHeight = 844;
  rttMs = 40;
  throughputKbps = 10240;
  cpuSlowdownMultiplier = 1;
  requestLatencyMs = 0;
  downloadThroughputKbps = 0;
  uploadThroughputKbps = 0;
  throttlingMethod: ThrottlingMethod = 'devtools';
  screenEmulationMobile = true;
  deviceScaleFactor = 3;
  screenEmulationDisabled = false;
  formFactor: FormFactor = 'mobile';
}

export class Mobile3G implements DeviceProfile {
  lighthouseReportName = 'Mobile Regular3G';
  screenWidth = 360;
  screenHeight = 640;
  rttMs = 300;
  throughputKbps = 700;
  cpuSlowdownMultiplier = 1;
  requestLatencyMs = 300;
  downloadThroughputKbps = 700;
  uploadThroughputKbps = 700;
  throttlingMethod: ThrottlingMethod = 'devtools';
  screenEmulationMobile = true;
  deviceScaleFactor = 2.625;
  screenEmulationDisabled = false;
  formFactor: FormFactor = 'mobile';
}

export class Mobile4G implements DeviceProfile {
  lighthouseReportName = 'Mobile Regular4G';
  screenWidth = 360;
  screenHeight = 640;
  rttMs = 150;
  throughputKbps = 1.6 * 1024;
  cpuSlowdownMultiplier = 1;
  requestLatencyMs = 150;
  downloadThroughputKbps = 1.6 * 1024;
  uploadThroughputKbps = 1.6 * 1024;
  throttlingMethod: ThrottlingMethod = 'devtools';
  screenEmulationMobile = true;
  deviceScaleFactor = 2.625;
  screenEmulationDisabled = false;
  formFactor: FormFactor = 'mobile';
  hasTouch = true;
}

export class Mobile4G_Slow implements DeviceProfile {
  lighthouseReportName = 'Mobile Slow4G';
  screenWidth = 360;
  screenHeight = 640;
  rttMs = 150;
  throughputKbps = 1.6 * 1024 / 2;
  cpuSlowdownMultiplier = 1;
  requestLatencyMs = 150;
  downloadThroughputKbps = 1.6 * 1024 / 2;
  uploadThroughputKbps = 1.6 * 1024 / 2;
  throttlingMethod: ThrottlingMethod = 'devtools';
  screenEmulationMobile = true;
  deviceScaleFactor = 2.625;
  screenEmulationDisabled = false;
  formFactor: FormFactor = 'mobile';
  hasTouch = true;
}

/** Default Chrome/Chromium location per OS (`os.type()` value). */
export class BrowserLocations {
  os: string;

  constructor(os: string) {
    this.os = os;
  }

  get chrome(): string {
    let location = '';
    logger.debug("[MESSAGE] Browser location not specified via '--browserLocation' + 'path' so trying to find it based on OS type");
    if (this.os === 'Windows_NT') {
      location = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } else if (this.os === 'Darwin') {
      location = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    } else if (this.os === 'Linux') {
      location = '/usr/lib/chromium/chrome';
    } else {
      throw new Error(`Unsupported operating system: ${this.os}`);
    }
    logger.debug(`[BROWSER] ${location}`);
    return location;
  }
}
