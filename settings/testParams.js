import LighthouseBrowser from '../core/browser.js';
import path from 'path';

let browserInstance;
const uploadDir = path.dirname(new URL(import.meta.url).pathname);

// Initialize variables with default values
let loops = 1;
let testTime = 360000; // 360 seconds or 6 minutes
let headless = true;
let browserType = 'desktop';
let login;
let password;
let url;
let browserLocation;
let ddHost;
let ddKey;

// Process the command line arguments
const args = process.argv;
args.forEach(arg => {
    if (arg.includes('--') && arg.includes('=')) {
        let [key, value] = arg.split('=');
        key = key.replace('--', ''); // Remove '--' prefix

        switch (key.toLowerCase()) {
            case 'loops':
                loops = parseInt(value, 10);
                break;
            case 'testtime':
                testTime = parseInt(value, 10) * 1000; // Convert to milliseconds
                break;
            case 'headless':
                headless = value !== 'false'; // Anything other than 'false' is considered true
                break;
            case 'browsertype':
                switch (value) {
                    case 'mobile':
                    case 'mobile3G':
                    case 'mobile4G':
                    case 'mobile4GSlow':
                        browserType = value;
                        break;
                    default:
                        browserType = 'desktop'; // Defaults to 'desktop'
                        break;
                }
                break;
            case 'login':
                login = value;
                break;
            case 'password':
                password = value;
                break;
            case 'url':
                url = value;
                break;
            case 'browserlocation':
                browserLocation = value;
                break;
            case 'ddkey':
                ddKey = value;
                break;
            case 'ddhost':
                ddHost = value;
                break;
        }
    }
});

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
    uploadDir,
    loops,
    testTime,
    headless,
    browserType,
    login,
    password,
    url,
    browserLocation,
    ddHost,
    ddKey
};