import logger from "../logger/logger.js";
import CreateReport from '../reporting/createReport.js';
import * as params from './testParams.js';
import { setupBrowser } from './testParams.js';

let browser;

export async function beforeHook() {
    browser = await setupBrowser();
};

export async function beforeEachHook() {
    logger.debug("[STARTED] " + this.currentTest.fullTitle());
    this.timeout(params.testTime);

    if (browser.flow.currentTimespan) {  // happens if waiting inside actions exceeds "params.testTime" timeout
        await browser.flow.endTimespan(); // stopping active timespan if not stopped by timeout
        browser.page.isSuccess = false;
        throw new Error('Skipping test because previous flow exceeded testTime limit: ' + params.testTime);
    } else if (!browser.page.isSuccess) {
        throw new Error('Skipping test because previous flow failed');
    }
};

export async function afterEachHook() {
    logger.debug(`[ENDED] ${this.currentTest.title}`);
};


export async function afterHook() {
    this.timeout(300000); // consider increasing this time if it can't create reports within the limit
    try {
        if (browser.flow.currentTimespan) {   // happens if waiting inside actions exceeds "testTime" timeout
            await browser.flow.endTimespan(); // stopping the active timespan if not stopped by timeout
            browser.page.isSuccess = false;
        }
        await browser.flow.snapshot({ name: 'Capturing last state of the test' });
        await new CreateReport(params.ddHost, params.ddKey, params.webhook, params.teamsWorkflowUrl, params.influxUrl, params.influxToken, params.influxOrg, params.influxBucket).createReports(browser.flow);
        await browser.closeBrowser();
    } catch (error) {
        logger.debug("[ERROR] afterHook " + error);
    }
};