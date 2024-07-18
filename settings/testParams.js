import LighthouseBrowser from '../core/browser.js';
import path from 'path';

let browserInstance;
const uploadDir = path.dirname(new URL(import.meta.url).pathname);

// Initialize variables with default values
let loops = 1;
let testTime = 120; // 2 minutes
let suitTime = 1800; // 30 minutes
let headless = true;
let browserType = 'desktop';
let login
let password;
let url;
let regions = 'not set';
let browserLocation;
let ddHost;
let ddKey;
let webhook;
let influxUrl;
let influxToken;
let influxOrg;
let influxBucket;
let influxUsername;
let influxPassword;
let influxDatabase;
let ciUrl;
let teamsWorkflowUrl;

// Process the command line arguments
const args = process.argv;
args.forEach(arg => {
    if (arg.includes('--') && arg.includes('=')) {
        let [key, ...valueParts] = arg.split('=');
        let value = valueParts.join('='); // This ensures the value contains all the parts
        key = key.replace('--', ''); // Remove '--' prefix

        switch (key.toLowerCase()) {
            case 'loops':
                loops = parseInt(value, 10);
                break;
            case 'testtime':
                testTime = parseInt(value, 10) * 1000; // Convert to milliseconds
                break;
            case 'suittime':
                suitTime = parseInt(value, 10) * 1000; // Convert to milliseconds
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
            case 'regions':
                regions = value.split(".");
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
            case 'webhook':
                webhook = value;
                break;
            case 'influxurl':
                influxUrl = value;
                break;
            case 'influxtoken':
                influxToken = value;
                break;
            case 'influxorg':
                influxOrg = value;
                break;
            case 'influxbucket':
                influxBucket = value;
                break;
            case 'influxusername':
                influxUsername = value;
                break;
            case 'influxpassword':
                influxPassword = value;
                break;
            case 'influxdatabase':
                influxDatabase = value;
                break;
            case 'ciurl':
                ciUrl = value;
                break;
            case 'teamsworkflowurl':
                teamsWorkflowUrl = value;
                console.warn(teamsWorkflowUrl)
                break;
            default:
                console.warn(`Unknown parameter specified: ${key}`)
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
    suitTime,
    headless,
    browserType,
    login,
    password,
    url,
    regions,
    browserLocation,
    ddHost,
    ddKey,
    webhook,
    influxUrl,
    influxToken,
    influxOrg,
    influxBucket,
    influxUsername,
    influxPassword,
    influxDatabase,
    ciUrl,
    teamsWorkflowUrl
};