import logger from "lh-pptr-framework/logger/logger.js";
import PowerAppsPage from "../pages/powerapps/pages.js";
import { beforeHook, beforeEachHook, afterEachHook, afterHook } from 'lh-pptr-framework/settings/mochaHooks.js';
import * as params from 'lh-pptr-framework/settings/testParams.js';

let browser;
const PowerApps = new PowerAppsPage();
const pages = [PowerApps];

// Extend the common beforeHook with additional setup
const customBeforeHook = async () => {
    await beforeHook(); // Perform the common setup first (browser startup)
    browser = await params.getBrowserInstance();
    for (const page of pages) {
        page.init(browser.page); // Sets instance of puppeteer page to page objects
    }
};

// Specify all mocha hooks
before(customBeforeHook);
beforeEach(beforeEachHook);
afterEach(afterEachHook);
after(afterHook);

it("[N]_PowerApps_URL", async function () {
    await PowerApps.navigation(browser, this);
    await new Promise(resolve => setTimeout(resolve, 120000));
}).timeout(params.testTime);

it("[T]_Click_on_'marketing'", async function () {
    await PowerApps.clickOnMarketing(browser, this)
}).timeout(params.testTime);

it("[N]_Teams_page", async function () {
    await PowerApps.checkTeamsPage(browser, this);
}).timeout(params.testTime);