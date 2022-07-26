class Desktop {
  get lighthouseReportName()   { return "onliner desktop"};
  get fhdWidth()               { return 1920};
  get fhdHeight()              { return 1080};
  get rttMs()                  { return 40};
	get throughputKbps()         { return 10240};
  get cpuSlowdownMultiplier()  { return 1};
  get requestLatencyMs()       { return 0};
  get downloadThroughputKbps() { return 0};
  get uploadThroughputKbps()   { return 0};
  get throttlingMethod()       { return "simulate"};
  get screenEmulationMobile()  { return false};
  get deviceScaleFactor()      { return 1};
  get screenEmulationDisabled(){ return false};
  get formFactor()             { return "desktop"};
}

class Mobile {
  get lighthouseReportName()   { return "onliner mobile"};
  get fhdWidth()               { return 844};
  get fhdHeight()              { return 390};
  get rttMs()                  { return 40};
  get throughputKbps()         { return 10240};
  get cpuSlowdownMultiplier()  { return 1};
  get requestLatencyMs()       { return 0};
  get downloadThroughputKbps() { return 0};
  get uploadThroughputKbps()   { return 0};
  get throttlingMethod()       { return "simulate"};
  get screenEmulationMobile()  { return false};
  get deviceScaleFactor()      { return 3};
  get screenEmulationDisabled(){ return false};
  get formFactor()             { return "mobile"};
}

module.exports = {Desktop: Desktop,
                  Mobile: Mobile
                };
