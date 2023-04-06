const Page = require('../core/page');
const LighthouseBrowser = require('../core/browser');
const CreateReport = require('../reporting/createReport');


var browserType = "desktop",
    browser = new LighthouseBrowser(browserType),
    GooglePage = new Page();
    testTime = 30000;


// Create Page object for Google
function initGooglePage() {
    GooglePage.objects.url = "https://www.google.com"
    GooglePage.input("search", "input[name='q']")
    GooglePage.btn("submit", "input[name='btnK']")
}


beforeAll(async () =>  {
    await browser.init();
    await browser.start();
    GooglePage.init(browser.page); // Sets instance of puppeteer page to the page object
    initGooglePage(); // Need to be here as elements initialized with instance of page
}, testTime);

afterAll(async() => {
    await new CreateReport().createReports(browser.flow, browserType)
    await browser.closeBrowser().then(() => console.log("done"));
}, testTime)
  
// Now declaring tests
test('Check Google', async () => {
    await browser.coldNavigation("Main Page", GooglePage.objects.url)
    await browser.withPageStatusCheck()
}, testTime)


test('Search for "Lighthouse"', async () => {
    await GooglePage.objects.search.type('Lighthouse')
    await GooglePage.objects.submit.click()
    await browser.withPageStatusCheck()
    await browser.waitTillRendered()
    await browser.coldNavigation("Search Results")
    await browser.withPageStatusCheck()
}, testTime)