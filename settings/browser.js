import { Desktop, Mobile, BrowserLocations } from './constants.js';
import * as os from 'os';

const desktop = new Desktop();
const mobile = new Mobile();
const browserLocations = new BrowserLocations(os.type());

export class Browser {
    get headlessDesktop() {
        return {
            executablePath: browserLocations.chrome,
            args: [`--window-size=${desktop.screenWidth},${desktop.screenHeight}`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--display', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: desktop.screenWidth,
                height: desktop.screenHeight,
                hasTouch: desktop.hasTouch,
                deviceScaleFactor: desktop.deviceScaleFactor
            }
        }
    };
    get headfulDesktop() {
        return {
            executablePath: browserLocations.chrome,
            "headless": false,
            args: [`--window-size=${desktop.screenWidth},${desktop.screenHeight}`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: desktop.screenWidth,
                height: desktop.screenHeight,
                hasTouch: desktop.hasTouch,
                deviceScaleFactor: desktop.deviceScaleFactor
            }
        }
    };
    get headlessMobile() {
        return {
            executablePath: browserLocations.chrome,
            args: [`--window-size=${mobile.screenWidth},${mobile.screenHeight}`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--display', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: mobile.screenWidth,
                height: mobile.screenHeight,
                hasTouch: mobile.hasTouch,
                deviceScaleFactor: mobile.deviceScaleFactor
            }
        }
    };
    get headfulMobile() {
        return {
            executablePath: browserLocations.chrome,
            "headless": false,
            args: [`--window-size=${desktop.screenWidth},${desktop.screenHeight}`, '--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true'],
            defaultViewport: {
                width: mobile.screenWidth,
                height: mobile.screenHeight,
                hasTouch: mobile.hasTouch,
                deviceScaleFactor: mobile.deviceScaleFactor
            }
        }
    };
}