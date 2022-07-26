// Selectors
const Constants = require('./constants');
const desktop = new Constants.Desktop();

const fhdWidth = desktop.fhdWidth;
const fhdHeight = desktop.fhdHeight;

class Browser {
  get headless() { return {
      args: [`--window-size=${ fhdWidth },${ fhdHeight }`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--display', '--ignore-certificate-errors', '--disable-storage-reset=true'],
      defaultViewport: { width: fhdWidth, height: fhdHeight }
  }};
  get headful() { return {
    "headless": false,
    args: [`--window-size=${ fhdWidth },${ fhdHeight }`,'--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true'],
    defaultViewport: { width: fhdWidth, height: fhdHeight }
  }};
}

module.exports = {Browser: Browser};
