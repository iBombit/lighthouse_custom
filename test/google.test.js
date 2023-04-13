const Page = require('../core/page');
const LighthouseBrowser = require('../core/browser');
const CreateReport = require('../reporting/createReport');
const { expect } = require('chai');


var browserType = "desktop",
    headless = false,
    browser = new LighthouseBrowser(browserType, headless),
    GooglePage = new Page();
    testTime = 100000;


// Create Page object for Google
function initGooglePage() {
    GooglePage.url = "https://www.google.com"
    GooglePage.input("search", "input[name='q'],textarea[name='q']")
    GooglePage.btn("submit", "input[name='btnK']")
    GooglePage.btn("searchSubmit", "//button[@type='submit']")
    GooglePage.btn("searchResultLinks", "a>h3")
    GooglePage.btn("images", "g-img")
}


beforeAll(async () =>  {
    await browser.init();
    await browser.start();    
    browser.page.isSuccess = true; // Track failed actions (any fail working with actions sets this to false)
    GooglePage.init(browser.page); // Sets instance of puppeteer page to the page object
    initGooglePage(); // Need to be here as elements initialized with instance of page
}, testTime);

// Check if prev flow finished successfully before launching test
beforeEach(async () =>  {
    if (browser.flow.currentTimespan) {  // happens if waiting inside actions exceeds "testTime" timeout
        await browser.flow.endTimespan() // stopping active timespan if not stopped by timeout
        browser.page.isSuccess = false
        throw new Error('Skipping test because previous flow exceeded testTime limit: ' + testTime);
    }
    if (!browser.page.isSuccess) 
        throw new Error('Skipping test because previous flow failed');
}, testTime)

afterAll(async () =>  {
    await browser.flow.snapshot({stepName: 'Capturing last state of the test'});
    await new CreateReport().createReports(browser.flow, browserType)
    await browser.closeBrowser();
}, testTime)


// coldNavigations -- full page load
// can't be used together with timespan
test('[ColdNavigation] Check Google', async () => {
    await browser.coldNavigation("Main Page", GooglePage.url)
}, testTime)

// timespans -- actions
// should contain ONE submit action that triggers loading between start/end block
test('[Timespan] Search for "Lighthouse"', async () => {
    await browser.flow.startTimespan({ stepName: "Execute google search from Home"})
        await GooglePage.search.type('Lighthouse')
        await GooglePage.submit.click()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

test('[Timespan] Search for "laptop"', async () => {
    await browser.flow.startTimespan({ stepName: "Execute google search from search results"})
        await GooglePage.search.clear()        
        await GooglePage.search.type('laptop')
        await GooglePage.searchSubmit.click()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

// test('[Timespan] Open link from results', async () => {
//     await browser.flow.startTimespan({ stepName: "Open link from results"})
//         await GooglePage.searchResultLinks.click()
//         await GooglePage.images.isHidden()
//         await browser.waitTillRendered()
//     await browser.flow.endTimespan()
// }, testTime)
