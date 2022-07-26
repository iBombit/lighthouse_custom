// Selectors
const Constants = require('./constants');
const desktop = new Constants.Desktop();
const mobile = new Constants.Mobile();


class Browser {
    get headlessDesktop() {
        return {
            args: [`--window-size=${ desktop.fhdWidth },${ desktop.fhdHeight }`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--display', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: desktop.fhdWidth,
                height: desktop.fhdHeight
            }
        }
    };
    get headfulDesktop() {
        return {
            "headless": false,
            args: [`--window-size=${ desktop.fhdWidth },${ desktop.fhdHeight }`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: desktop.fhdWidth,
                height: desktop.fhdHeight
            }
        }
    };
    get headlessMobile() {
        return {
            args: [`--window-size=${ mobile.fhdWidth },${ mobile.fhdHeight }`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--display', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: mobile.fhdWidth,
                height: mobile.fhdHeight
            }
        }
    };
    get headfulMobile() {
        return {
            "headless": false,
            args: [`--window-size=${ mobile.fhdWidth },${ mobile.fhdHeight }`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: mobile.fhdWidth,
                height: mobile.fhdHeight
            }
        }
    };
}

module.exports = {
    Browser: Browser
};
