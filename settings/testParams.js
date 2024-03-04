import LighthouseBrowser from '../core/browser.js';
import path from 'path';
import * as os from 'os';

let browserInstance;
const args = process.argv;
const uploadDir = path.dirname(new URL(import.meta.url).pathname);

// Sets duration for all "it" mocha methods
// Timeout must be bigger then DEFAULT_TIMEOUT in element.js otherwise you never will be able to debug
const testTime = 120000;

// Define constants for input arguments
const browserType = args.includes("--desktop") ? "desktop" : "mobile";
const headless = args.includes("--headless");
const browserLocationIndex = args.indexOf("--browserLocation");
const testuserIndex = args.indexOf("--login");
const testpasswordIndex = args.indexOf("--password");
const envIndex = args.indexOf("--host");
const ddHostIndex = args.indexOf("--ddhost");
const ddKeyIndex = args.indexOf("--ddkey");
const browserLocation = browserLocationIndex !== -1 ? args[browserLocationIndex + 1] : os.type();
const login = testuserIndex !== -1 ? args[testuserIndex + 1] : undefined;
const password = testpasswordIndex !== -1 ? args[testpasswordIndex + 1] : undefined;
const url = envIndex !== -1 ? args[envIndex + 1] : undefined;
const ddHost = ddHostIndex !== -1 ? args[ddHostIndex + 1] : undefined;
const ddKey = ddKeyIndex !== -1 ? args[ddKeyIndex + 1] : undefined;

async function setupBrowser() {
    if (!browserInstance) {
        browserInstance = new LighthouseBrowser(browserType, headless, browserLocation);
        await browserInstance.init();
        await browserInstance.start();
    }
    return browserInstance;
}

async function getBrowserInstance() {
    if (!browserInstance) {
        throw new Error('Browser not initialized. Call setupBrowser first.');
    }
    return browserInstance;
}

export {
    setupBrowser,
    getBrowserInstance,
    browserType,
    testTime,
    uploadDir,
    login,
    password,
    url,
    ddHost,
    ddKey
};