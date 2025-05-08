import logger from "lh-pptr-framework/logger/logger.js";
import CreateReport from 'lh-pptr-framework/reporting/createReport.js';
import * as params from 'lh-pptr-framework/settings/testParams.js';
import { setupBrowser } from 'lh-pptr-framework/settings/testParams.js';
import { saveHTMLSource } from 'lh-pptr-framework/reporting/createReport.js';

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

    if (this.currentTest.state === 'failed') {
        const stepName = this.currentTest.title;
        try {
            const htmlFilePath = await saveHTMLSource(browser.page, stepName);
            logger.debug(`[HTML SAVED] ${htmlFilePath}`);
        } catch (error) {
            logger.error(`[HTML ERROR] Failed to save HTML source: ${error.message}`);
        }
    }
};

export async function afterHook() {
    this.timeout(300000); // consider increasing this time if it can't create reports within the limit
    try {
        if (browser.flow.currentTimespan) {   // happens if waiting inside actions exceeds "testTime" timeout
            await browser.flow.endTimespan(); // stopping the active timespan if not stopped by timeout
            browser.page.isSuccess = false;
        }
        await browser.flow.snapshot({ name: 'Capturing last state of the test' });
        await new CreateReport().createReports(browser.flow);
        await browser.closeBrowser();
    } catch (error) {
        logger.debug("[ERROR] afterHook " + error);
    }
};