import logger from "../logger/logger.js";

export class Desktop {
  get lighthouseReportName()    { return "Desktop"};
  get screenWidth()             { return 1536};//1240
  get screenHeight()            { return 864};//720
  get rttMs()                   { return 40};
  get throughputKbps()          { return 10240};
  get cpuSlowdownMultiplier()   { return 1};
  get requestLatencyMs()        { return 0};
  get downloadThroughputKbps()  { return 0};
  get uploadThroughputKbps()    { return 0};
  get throttlingMethod()        { return "devtools"};
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
  get throttlingMethod()        { return "devtools"};
  get screenEmulationMobile()   { return true};
  get deviceScaleFactor()       { return 3};
  get screenEmulationDisabled() { return false};
  get hasTouch()                { return true};
  get formFactor()              { return "mobile"};
}

export class Mobile4G {
  get lighthouseReportName()    { return "Mobile Regular4G"};
  get screenWidth()             { return 360};
  get screenHeight()            { return 640};
  get rttMs()                   { return 150};
  get throughputKbps()          { return 1.6 * 1024};
  get cpuSlowdownMultiplier()   { return 4};
  get requestLatencyMs()        { return 150};
  get downloadThroughputKbps()  { return 1.6 * 1024};
  get uploadThroughputKbps()    { return 1.6 * 1024};
  get throttlingMethod()        { return "devtools"};
  get screenEmulationMobile()   { return true};
  get deviceScaleFactor()       { return 2.625};
  get screenEmulationDisabled() { return false};
  get formFactor()              { return "mobile"};
}

export class Mobile4G_Slow {
  get lighthouseReportName()    { return "Mobile Slow4G"};
  get screenWidth()             { return 360};
  get screenHeight()            { return 640};
  get rttMs()                   { return 150};
  get throughputKbps()          { return 1.6 * 1024};
  get cpuSlowdownMultiplier()   { return 4};
  get requestLatencyMs()        { return 150};
  get downloadThroughputKbps()  { return 1.6 * 1024};
  get uploadThroughputKbps()    { return 1.6 * 1024};
  get throttlingMethod()        { return "devtools"};
  get screenEmulationMobile()   { return true};
  get deviceScaleFactor()       { return 2.625};
  get screenEmulationDisabled() { return false};
  get formFactor()              { return "mobile"};
}

export class Mobile3G {
  get lighthouseReportName()    { return "Mobile Regular3G"};
  get screenWidth()             { return 360};
  get screenHeight()            { return 640};
  get rttMs()                   { return 300};
  get throughputKbps()          { return 700};
  get cpuSlowdownMultiplier()   { return 4};
  get requestLatencyMs()        { return 300};
  get downloadThroughputKbps()  { return 700};
  get uploadThroughputKbps()    { return 700};
  get throttlingMethod()        { return "devtools"};
  get screenEmulationMobile()   { return true};
  get deviceScaleFactor()       { return 2.625};
  get screenEmulationDisabled() { return false};
  get formFactor()              { return "mobile"};
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

export const myRelevantAudits = [
  './settings/audits/network-requests',
  './settings/audits/network-server-latency',
];