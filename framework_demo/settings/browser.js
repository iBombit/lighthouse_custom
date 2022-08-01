// Selectors
const Constants = require('./constants');
const desktop = new Constants.Desktop();
const mobile = new Constants.Mobile();


class Browser {
    get headlessDesktop() {
        return {
            args: [`--window-size=${ desktop.screenWidth },${ desktop.screenHeight }`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--display', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: desktop.screenWidth,
                height: desktop.screenHeight
            }
        }
    };
    get headfulDesktop() {
        return {
            "headless": false,
            args: [`--window-size=${ desktop.screenWidth },${ desktop.screenHeight }`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: desktop.screenWidth,
                height: desktop.screenHeight
            }
        }
    };
    get headlessMobile() {
        return {
            args: [`--window-size=${ mobile.screenWidth },${ mobile.screenHeight }`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--display', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: mobile.screenWidth,
                height: mobile.screenHeight
            }
        }
    };
    get headfulMobile() {
        return {
            "headless": false,
            args: [`--window-size=${ mobile.screenWidth },${ mobile.screenHeight }`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: mobile.screenWidth,
                height: mobile.screenHeight
            }
        }
    };
}

module.exports = {
    Browser: Browser
};
