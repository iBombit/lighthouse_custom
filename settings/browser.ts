import type { LaunchOptions } from 'puppeteer-core';
import { Desktop, Mobile, BrowserLocations, type DeviceProfile } from './constants.js';
import { getBrowserArgsFromCustomConfig } from './configLoader.js';

const desktop: DeviceProfile = new Desktop();
const mobile: DeviceProfile = new Mobile();

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

/**
 * Puppeteer launch options per device profile and headless mode.
 *
 * @param os - Either `os.type()` (the Chrome location is then auto-detected) or
 *             an explicit browser executable path (anything containing a slash or quote).
 */
export class Browser {
    os: string;
    browserLocation: string;

    constructor(os: string) {
        this.os = os;
        this.browserLocation = (this.os.includes("\"") || this.os.includes("/") || this.os.includes("\\") || this.os.includes("'")) ? this.os : new BrowserLocations(os).chrome;
    }

    #getArgs(isHeadless = true): string[] {
        const configArgs = getBrowserArgsFromCustomConfig(isHeadless);
        const defaultArgs = isHeadless ? DEFAULT_HEADLESS_ARGS : DEFAULT_HEADFUL_ARGS;
        console.log("Browser args:", { isHeadless, configArgs, defaultArgs });
        // Use config args if available, otherwise fall back to defaults
        return configArgs.length > 0 ? configArgs : defaultArgs;
    }

    #launchOptions(device: DeviceProfile, isHeadless: boolean): LaunchOptions {
        return {
            executablePath: this.browserLocation,
            // Headless is Puppeteer's default, so it is only spelled out for headful runs.
            ...(isHeadless ? {} : { headless: false }),
            args: [
                `--window-size=${device.screenWidth},${device.screenHeight}`,
                ...this.#getArgs(isHeadless)
            ],
            defaultViewport: {
                width: device.screenWidth,
                height: device.screenHeight,
                hasTouch: device.hasTouch,
                deviceScaleFactor: device.deviceScaleFactor
            }
        };
    }

    get headlessDesktop(): LaunchOptions {
        return this.#launchOptions(desktop, true);
    }

    get headfulDesktop(): LaunchOptions {
        return this.#launchOptions(desktop, false);
    }

    get headlessMobile(): LaunchOptions {
        return this.#launchOptions(mobile, true);
    }

    get headfulMobile(): LaunchOptions {
        return this.#launchOptions(mobile, false);
    }
}
