import logger from "../logger/logger.js";
import PowerApps from "../pages/powerapps/pages.js";
import LighthouseBrowser from "../core/browser.js";
import CreateReport from "../reporting/createReport.js";

const args = process.argv;
const browserType = args.includes("--desktop") ? "desktop" : "mobile",
    headless = args.includes("--headless") ? true : false,
    browserLocationIndex = args.indexOf("--browserLocation"),
    browserLocation = browserLocationIndex !==-1 ? args[browserLocationIndex + 1] : undefined,
    browser = new LighthouseBrowser(browserType, headless, browserLocation),
    powerApps = new PowerApps(),
    testTime = 180000;

before(async () => {
    await browser.init();
    await browser.start();
    browser.page.isSuccess = true;
    powerApps.init(browser.page);
});

// Check if prev flow finished successfully before launching test
beforeEach(async function () {
    logger.debug("[STARTED] " + this.currentTest.fullTitle());
    this.timeout(testTime);
    if (browser.flow.currentTimespan) {  // happens if waiting inside actions exceeds "testTime" timeout
        await browser.flow.endTimespan() // stopping active timespan if not stopped by timeout
        browser.page.isSuccess = false
        throw new Error('Skipping test because previous flow exceeded testTime limit: ' + testTime);
    }
    else if (!browser.page.isSuccess)
        throw new Error('Skipping test because previous flow failed');
});

afterEach(async function () {
    logger.debug("[ENDED] " + this.currentTest.title);
});

after(async function () {
    if (browser.flow.currentTimespan) {  // happens if waiting inside actions exceeds "testTime" timeout
        await browser.flow.endTimespan(); // stopping active timespan if not stopped by timeout
        browser.page.isSuccess = false;
    }
    await browser.flow.snapshot({ name: 'Capturing last state of the test' });
    await new CreateReport().createReports(browser.flow, browserType);
    await browser.closeBrowser();
});


// Given: I am opening the browser
// When: I am navigating to Home page
// Then: I measure cold navigation performance of the page
it("[ColdNavigation] Check " + powerApps.url, async function () {
    await browser.coldNavigation("Main Page", powerApps.url);
    await browser.page.waitForTimeout(120000);
}).timeout(testTime);

// Given: I am on the Home page
// When: I click on "marketing" inside iframe
// Then: I wait for the new page to be rendered
// And: I stop measuring action time performance of the page
it("[Timespan] Click on 'marketing'", async function () {
    await browser.flow.startTimespan({ stepName: "Click on 'marketing'" });
    powerApps.init(await powerApps.appFrame.createIframe());
    await powerApps.marketing.click();
    await powerApps.marketingHeader.find();
    await browser.waitTillRendered();
    await browser.flow.endTimespan();
}).timeout(testTime);

// Given: I am on the "Marketing" page
// When: I click on "Teams" icon
// Then: I take the URL of the page that opened
// And: I measure cold navigation performance of the new page URL
it("[ColdNavigation] Check 'Teams' page", async function () {
    powerApps.init(browser.page);
    await powerApps.teamsIcon.click();
    let newPage = await browser.getNewPageWhenLoaded();
    await browser.coldNavigation("Teams Page", newPage.url());
}).timeout(testTime);