const logger = require("../logger/logger");
const PowerApps = require('../pages/powerapps/pages');
const LighthouseBrowser = require('../core/browser');
const CreateReport = require('../reporting/createReport');

var browserType = "desktop",
    headless = false,
    browser = new LighthouseBrowser(browserType, headless),
    powerApps = new PowerApps(),
    testTime = 180000;

beforeAll(async () =>  {
    await browser.init();
    await browser.start();   
    browser.page.isSuccess = true; // Track failed actions (any fail working with actions sets this to false)
    powerApps.init(browser.page); // Sets instance of puppeteer page to powerApps page object
}, testTime);

// Check if prev flow finished successfully before launching test
beforeEach(async () =>  {
    logger.debug("[STARTED] " + expect.getState().currentTestName)
    if (browser.flow.currentTimespan) {  // happens if waiting inside actions exceeds "testTime" timeout
        await browser.flow.endTimespan() // stopping active timespan if not stopped by timeout
        browser.page.isSuccess = false
        throw new Error('Skipping test because previous flow exceeded testTime limit: ' + testTime);
    }
    else if (!browser.page.isSuccess) 
        throw new Error('Skipping test because previous flow failed');
}, testTime)

afterEach(async () =>  {
    logger.debug("[ENDED] " + expect.getState().currentTestName)
})

afterAll(async () =>  {
    if (browser.flow.currentTimespan) {  // happens if waiting inside actions exceeds "testTime" timeout
        await browser.flow.endTimespan() // stopping active timespan if not stopped by timeout
        browser.page.isSuccess = false
    }
    await browser.flow.snapshot({stepName: 'Capturing last state of the test'});
    await new CreateReport().createReports(browser.flow, browserType)
    await browser.closeBrowser();
}, testTime)

// Given: I am opening the browser
// When: I am navigating to Home page
// Then: I measure cold navigation performance of the page
test("[ColdNavigation] Check " + powerApps.url, async () => {
    await browser.coldNavigation("Main Page", powerApps.url)
    await browser.page.waitForTimeout(120000); // Time needed for login and 2factor
}, testTime)

// Given: I am on the Home page
// When: I click on "marketing" inside iframe
// Then: I wait for the new page to be rendered
// And: I stop measuring action time performance of the page
test("[Timespan] Click on 'marketing'", async () => {
    await browser.flow.startTimespan({ stepName: "Click on 'marketing'"})
        powerApps.init(await powerApps.appFrame.createIframe()); // Update page object with new iframe
        await powerApps.marketing.click();
        await powerApps.marketingHeader.find();
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the "Marketing" page
// When: I click on "Teams" icon
// Then: I take the URL of the page that opened
// And: I measure cold navigation performance of the new page URL
test("[ColdNavigation] Check 'Teams' page", async () => {
    powerApps.init(browser.page) // Update page object with browser default page
    await powerApps.teamsIcon.click()
    let newPage = await browser.getNewPageWhenLoaded();
    await browser.coldNavigation("Teams Page", newPage.url()); // Using new page URL obtained after click for measurement
}, testTime)