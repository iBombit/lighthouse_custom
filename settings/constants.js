import logger from "../logger/logger.js";

export class Desktop {
  get lighthouseReportName()    { return "Desktop"};
  get screenWidth()             { return 1920};
  get screenHeight()            { return 1080};
  get rttMs()                   { return 40};
  get throughputKbps()          { return 10240};
  get cpuSlowdownMultiplier()   { return 1};
  get requestLatencyMs()        { return 0};
  get downloadThroughputKbps()  { return 0};
  get uploadThroughputKbps()    { return 0};
  get throttlingMethod()        { return "simulate"};
  get screenEmulationMobile()   { return false};
  get deviceScaleFactor()       { return 1};
  get screenEmulationDisabled() { return false};
  get hasTouch()                { return false};
  get formFactor()              { return "desktop"};
}

export class Mobile {
  get lighthouseReportName()    { return "Mobile"};
  get screenWidth()             { return 390};
  get screenHeight()            { return 844};
  get rttMs()                   { return 40};
  get throughputKbps()          { return 10240};
  get cpuSlowdownMultiplier()   { return 1};
  get requestLatencyMs()        { return 0};
  get downloadThroughputKbps()  { return 0};
  get uploadThroughputKbps()    { return 0};
  get throttlingMethod()        { return "simulate"};
  get screenEmulationMobile()   { return true};
  get deviceScaleFactor()       { return 3};
  get screenEmulationDisabled() { return false};
  get hasTouch()                { return true};
  get formFactor()              { return "mobile"};
}

export class BrowserLocations {
  constructor(os) {
    this.os = os;
  }
  get chrome() {
    let location = ""
    logger.debug("[MESSAGE] Browser location not specified via '--browserLocation' + 'path' so trying to find it based on OS type")
    if (this.os.indexOf('Windows') !== -1) {
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

export const myRelevantAudits = [
  './settings/audits/network-requests',
  './settings/audits/network-server-latency',
];