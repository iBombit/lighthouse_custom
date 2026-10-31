import LighthouseBrowser from '../core/browser.js';
import path from 'path';
import type { BrowserType } from './constants.js';

let browserInstance: LighthouseBrowser | undefined;
const uploadDir = path.dirname(new URL(import.meta.url).pathname);

const MOBILE_BROWSER_TYPES: readonly string[] = ['mobile', 'mobile3G', 'mobile4G', 'mobile4GSlow'];

// Initialize variables with default values
let loops = 1;
let testTime = 120000; // 2 minutes
let suitTime = 1800000; // 30 minutes
let headless = true;
let browserType: BrowserType = 'desktop';
let login: string | undefined, password: string | undefined, url: string | undefined;
let regions: string | string[] = 'not set';
let browserLocation: string | undefined, ddHost: string | undefined, ddKey: string | undefined;
let influxUrl: string | undefined, influxToken: string | undefined, influxOrg: string | undefined, influxBucket: string | undefined;
let influxUsername: string | undefined, influxPassword: string | undefined, influxDatabase: string | undefined;
let ciUrl: string | undefined, teamsWebhook: string | undefined, slackWebhook: string | undefined, teamsWorkflow: string | undefined;
let configFilePath: string | undefined;
let includeTimestamp = false;
let generateCSV = false;
/** Write each step's trace to ./reports/traces/ for the DevTools Performance panel. */
let saveTraces = false;
/** Record V8 JavaScript samples (function-level hot spots; adds overhead). */
let jsProfiling = false;

// Process the command line arguments
const args = process.argv;
args.forEach(arg => {
    if (arg.includes('--') && arg.includes('=')) {
        let [key, ...valueParts] = arg.split('=');
        const value = valueParts.join('=');
        key = key.replace('--', '');

        switch (key.toLowerCase()) {
            case 'loops': loops = parseInt(value, 10); break;
            case 'testtime': testTime = parseInt(value, 10) * 1000; break;
            case 'suittime': suitTime = parseInt(value, 10) * 1000; break;
            case 'headless': headless = value !== 'false'; break;
            case 'browsertype':
                browserType = MOBILE_BROWSER_TYPES.includes(value) ? value as BrowserType : 'desktop';
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
            case 'teamsworkflow': teamsWorkflow = value; break;
            case 'influxurl': influxUrl = value; break;
            case 'influxtoken': influxToken = value; break;
            case 'influxorg': influxOrg = value; break;
            case 'influxbucket': influxBucket = value; break;
            case 'influxusername': influxUsername = value; break;
            case 'influxpassword': influxPassword = value; break;
            case 'influxdatabase': influxDatabase = value; break;
            case 'ciurl': ciUrl = value; break;
            case 'teamsworkflowurl': teamsWorkflow = value; break;
            case 'configfile': configFilePath = value; break;
            case 'includetimestamp': includeTimestamp = value !== 'false'; break;
            case 'generatecsv': generateCSV = value === 'true'; break;
            case 'savetraces': saveTraces = value === 'true'; break;
            case 'jsprofiling': jsProfiling = value === 'true'; break;
            default: console.warn(`Unknown parameter specified: ${key}`);
        }
    }
});

/** Creates (once) and starts the shared {@link LighthouseBrowser} configured from the CLI parameters. */
async function setupBrowser(): Promise<LighthouseBrowser> {
    if (!browserInstance) {
        browserInstance = new LighthouseBrowser(browserType, headless, browserLocation);
        await browserInstance.init();
        await browserInstance.start();
    }
    return browserInstance;
}

/** Returns the shared browser created by {@link setupBrowser}; throws if it hasn't been set up yet. */
async function getBrowserInstance(): Promise<LighthouseBrowser> {
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
    ciUrl, teamsWebhook, slackWebhook, teamsWorkflow,
    configFilePath,
    includeTimestamp,
    generateCSV,
    saveTraces,
    jsProfiling
};
