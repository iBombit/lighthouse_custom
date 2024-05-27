import { Desktop, Mobile, BrowserLocations } from './constants.js';

const desktop = new Desktop();
const mobile = new Mobile();
let browserLocation = "UNKNOWN BROWSER LOCATION";

export class Browser {
    constructor(os) {
        this.os = os;
        browserLocation = (this.os.includes("\"") || this.os.includes("/")|| this.os.includes("\\") || this.os.includes("\'")) ? this.os : new BrowserLocations(os).chrome;
    }
    
    get headlessDesktop() {
        return {
            executablePath: browserLocation,
            args: [
                `--window-size=${desktop.screenWidth},${desktop.screenHeight}`, 
                '--allow-no-sandbox-job',
                '--allow-sandbox-debugging',
                '--no-sandbox',
                '--disable-gpu',
                '--disable-gpu-sandbox',
                '--display',
                '--ignore-certificate-errors',
                '--disable-storage-reset=true'
            ],
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
            executablePath: browserLocation,
            "headless": false,
            args: [
                `--window-size=${desktop.screenWidth},${desktop.screenHeight}`,
                '--allow-no-sandbox-job',
                '--allow-sandbox-debugging',
                '--no-sandbox',
                '--ignore-certificate-errors',
                '--disable-storage-reset=true'
            ],
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
            executablePath: browserLocation,
            args: [
                `--window-size=${mobile.screenWidth},${mobile.screenHeight}`,
                '--allow-no-sandbox-job',
                '--allow-sandbox-debugging',
                '--no-sandbox',
                '--disable-gpu',
                '--disable-gpu-sandbox',
                '--display',
                '--ignore-certificate-errors',
                '--disable-storage-reset=true'
            ],
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
            executablePath: browserLocation,
            "headless": false,
            args: [
                `--window-size=${mobile.screenWidth},${mobile.screenHeight}`,
                '--allow-no-sandbox-job',
                '--allow-sandbox-debugging',
                '--no-sandbox',
                '--ignore-certificate-errors',
                '--disable-storage-reset=true'
            ],
            defaultViewport: {
                width: mobile.screenWidth,
                height: mobile.screenHeight,
                hasTouch: mobile.hasTouch,
                deviceScaleFactor: mobile.deviceScaleFactor
            }
        }
    };
}