import { Desktop, Mobile, BrowserLocations } from 'lh-pptr-framework/settings/constants.js';
import { getBrowserArgsFromCustomConfig } from 'lh-pptr-framework/settings/configLoader.js';

const desktop = new Desktop();
const mobile = new Mobile();
let browserLocation = "UNKNOWN BROWSER LOCATION";

// Default browser args (fallback if config not provided)
const DEFAULT_HEADLESS_ARGS = [
    '--allow-no-sandbox-job',
    '--allow-sandbox-debugging',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-gpu-sandbox',
    '--display',
    '--ignore-certificate-errors',
    '--disable-storage-reset=true'
];

const DEFAULT_HEADFUL_ARGS = [
    '--allow-no-sandbox-job',
    '--allow-sandbox-debugging',
    '--no-sandbox',
    '--ignore-certificate-errors',
    '--disable-storage-reset=true'
];

export class Browser {
    constructor(os) {
        this.os = os;
        browserLocation = (this.os.includes("\"") || this.os.includes("/")|| this.os.includes("\\") || this.os.includes("\'")) ? this.os : new BrowserLocations(os).chrome;
    }

    #getArgs(isHeadless = true) {
        const configArgs = getBrowserArgsFromCustomConfig(isHeadless);
        const defaultArgs = isHeadless ? DEFAULT_HEADLESS_ARGS : DEFAULT_HEADFUL_ARGS;
        console.log("Browser args:", { isHeadless, configArgs, defaultArgs });
        // Use config args if available, otherwise fall back to defaults
        return configArgs.length > 0 ? configArgs : defaultArgs;
    }
    
    get headlessDesktop() {
        return {
            executablePath: browserLocation,
            args: [
                `--window-size=${desktop.screenWidth},${desktop.screenHeight}`,
                ...this.#getArgs(true)
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
                ...this.#getArgs(false)
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
                ...this.#getArgs(true)
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
                ...this.#getArgs(false)
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