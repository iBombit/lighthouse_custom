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
  get chrome()                  { return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"};
  get edge()                    { return "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"};
  get docker()                  { return "/usr/lib/chromium/chrome"};
}

export const myRelevantAudits = [
  'network-requests',
  'network-server-latency',
];