import logger from "../logger/logger.js";
import PowerAppsPage from "../pages/PowerApps/pages.js";
import { beforeHook, beforeEachHook, afterEachHook, afterHook } from '../settings/mochaHooks.js';
import * as params from '../settings/testParams.js';

before(async () => {
    await browser.init();
    await browser.start();
    browser.page.isSuccess = true;
    PowerApps.init(browser.page);
});

let browser;
const PowerApps = new PowerAppsPage();

// Extend the common beforeHook with additional setup
const customBeforeHook = async () => {
    await beforeHook(); // Perform the common setup first (browser startup)
    browser = await params.getBrowserInstance();
    PowerApps.init(browser.page); // Sets instance of puppeteer page to PowerApps page object
};

// Specify all mocha hooks
before(customBeforeHook);
beforeEach(beforeEachHook);
afterEach(afterEachHook);
after(afterHook);

// Given: I am opening the browser
// When: I am navigating to Home page
// Then: I measure cold navigation performance of the page
it("[ColdNavigation] Check PowerApps URL", async function () {
    await PowerApps.coldNavigation(browser);
    await new Promise(resolve => setTimeout(resolve, 120000));
}).timeout(params.testTime);

// Given: I am on the Home page
// When: I click on "marketing" inside iframe
// Then: I wait for the new page to be rendered
// And: I stop measuring action time performance of the page
it("[Timespan] Click on 'marketing'", async function () {
    await PowerApps.clickOnMarketing(browser)
}).timeout(params.testTime);

// Given: I am on the "Marketing" page
// When: I click on "Teams" icon
// Then: I take the URL of the page that opened
// And: I measure cold navigation performance of the new page URL
it("[ColdNavigation] Check 'Teams' page", async function () {
    await PowerApps.checkTeamsPage(browser);
}).timeout(params.testTime);