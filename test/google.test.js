const Page = require('../core/page');
const LighthouseBrowser = require('../core/browser');
const CreateReport = require('../reporting/createReport');
const Input = require('../core/elements/textField');
const Button = require('../core/elements/button');


// Create Page object for Google
// With search input and submit button
class GoogleHome extends Page {
    init(page) {
        super.init(page)
        this.url = "https://www.google.com"
        this.search = new Input("input[name='q'],textarea[name='q']", page)
        this.submit = new Button("input[name='btnK']", page)
    }
}

// Create Page object for Google search results
// With list of search results
class GoogleSearchResults extends Page {
    init(page) {
        super.init(page)
        this.search = new Input("input[name='q'],textarea[name='q']", page)
        this.searchSubmit = new Button("//button[@type='submit']", page)
        this.searchResultLinks = new Button("a>h3", page)
        this.images = new Button("g-img", page)
    }
}

// Declare browser and pages required for this test
var browserType = "desktop",
    browser = new LighthouseBrowser(browserType),
    GooglePage = new GoogleHome(), // Creates instance of Google page object
    GoogleSearchResultsPage = new GoogleSearchResults(), // Creates instance of Google search results page object
    testTime = 30000; // Timeout must be bigger then DEFAULT_TIMEOUT in element.js (5000) otherwise you never will be able to debug


// Setup browser and initialize Google page object before tests
beforeAll(async () =>  {
    await browser.init();
    await browser.start();
    GooglePage.init(browser.page); // Sets instance of puppeteer page to the page object
    GoogleSearchResultsPage.init(browser.page); // Sets instance of puppeteer page to the page object
}, testTime);

// Check if prev flow finished successfully before launching test
beforeEach(async () =>  {
    browser.beforeEachHanlder(testTime).catch(err => {
        throw err
    })
}, testTime)

// Teardown browser and create report after tests
afterAll(async() => {
    await new CreateReport().createReports(browser.flow, browserType)
    await browser.closeBrowser();
}, testTime)

// Given: I am opening the browser
// When: I am navigating to Google homepage
// Then: I measure cold navigation performance of the page
test('Check Google', async () => {
    await browser.coldNavigation("Main Page", GooglePage.url)
}, testTime)

// Given: I am on the Google homepage
// When: I search for "Lighthouse"
// Then: I wait for results of the search
// And: I measure cold navigation performance of the page
test('Search for "Lighthouse"', async () => {
    await GooglePage.search.type('Lighthouse')
    await GooglePage.submit.click()
    await browser.waitTillRendered()
    await browser.coldNavigation("Search Results")
}, testTime)

// Given: I am on the Google seach results page
// When: I enter "Laptop" in the search field to measure action time
// Then: I wait for results of the search
// And: I measure action time performance of the page
test('Search for "Laptop"', async () => {
    await browser.flow.startTimespan({ stepName: "Execute google search from Search Results page"})
    await GoogleSearchResultsPage.search.clear()
    await GoogleSearchResultsPage.search.type('Laptop')
    await GoogleSearchResultsPage.searchSubmit.click()
    await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)
