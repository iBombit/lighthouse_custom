import LighthouseBrowser from 'lh-pptr-framework/core/browser.js';
import path from 'path';

let browserInstance;
const uploadDir = path.dirname(new URL(import.meta.url).pathname);

// Initialize variables with default values
let loops = 1;
let testTime = 120000; // 2 minutes
let suitTime = 1800000; // 30 minutes
let headless = true;
let browserType = 'desktop';
let login, password, url;
let regions = 'not set';
let browserLocation, ddHost, ddKey;
let influxUrl, influxToken, influxOrg, influxBucket;
let influxUsername, influxPassword, influxDatabase;
let ciUrl, teamsWebhook, slackWebhook, teamsWorkflowUrl;
let configFilePath;
let includeTimestamp = false;
let generateCSV = false;

// Process the command line arguments
const args = process.argv;
args.forEach(arg => {
    if (arg.includes('--') && arg.includes('=')) {
        let [key, ...valueParts] = arg.split('=');
        let value = valueParts.join('=');
        key = key.replace('--', '');

        switch (key.toLowerCase()) {
            case 'loops': loops = parseInt(value, 10); break;
            case 'testtime': testTime = parseInt(value, 10) * 1000; break;
            case 'suittime': suitTime = parseInt(value, 10) * 1000; break;
            case 'headless': headless = value !== 'false'; break;
            case 'browsertype':
                browserType = ['mobile', 'mobile3G', 'mobile4G', 'mobile4GSlow'].includes(value) ? value : 'desktop';
                break;
            case 'login': login = value; break;
            case 'password': password = value; break;
            case 'url': url = value; break;
            case 'regions': regions = value.split('.'); break;
            case 'browserlocation': browserLocation = value; break;
            case 'ddkey': ddKey = value; break;
            case 'ddhost': ddHost = value; break;
            case 'teamswebhook': teamsWebhook = value; break;
            case 'slackwebhook': slackWebhook = value; break;
            case 'influxurl': influxUrl = value; break;
            case 'influxtoken': influxToken = value; break;
            case 'influxorg': influxOrg = value; break;
            case 'influxbucket': influxBucket = value; break;
            case 'influxusername': influxUsername = value; break;
            case 'influxpassword': influxPassword = value; break;
            case 'influxdatabase': influxDatabase = value; break;
            case 'ciurl': ciUrl = value; break;
            case 'teamsworkflowurl': teamsWorkflowUrl = value; break;
            case 'configfile': configFilePath = value; break;
            case 'includetimestamp': includeTimestamp = value !== 'false'; break;
            case 'generatecsv': generateCSV = value === 'true'; break;
            default: console.warn(`Unknown parameter specified: ${key}`);
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
    testTime, suitTime,
    headless, browserType,
    login, password,
    url,
    regions,
    browserLocation,
    ddHost, ddKey,
    influxUrl, influxToken, influxOrg, influxBucket,
    influxUsername, influxPassword, influxDatabase,
    ciUrl, teamsWebhook, slackWebhook, teamsWorkflowUrl,
    configFilePath,
    includeTimestamp,
    generateCSV
};