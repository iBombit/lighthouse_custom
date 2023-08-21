import LighthouseBrowser from '../core/browser.js';
import CreateReport from '../reporting/createReport.js';
import { MainPage, FullMenuList, ProductPage } from '../pages/apetito/pages.js'
import logger from "../logger/logger.js";


// Declare browser and pages required for this test
let browserType = "desktop",
    browser = new LighthouseBrowser(browserType),
    mainPage = new MainPage(), // Creates instance of Main page object
    productPage = new ProductPage(), // Creates instance of Product Page 
    fullMenuList = new FullMenuList(), // Creates instance of Full Menu List Page
    testTime = 90000; // Timeout must be bigger then DEFAULT_TIMEOUT in element.js (5000) otherwise you never will be able to debug


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

// Teardown browser and create report after tests
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
// When: I am opening the main page
// Then: I measure cold navigation performance of the page
it('Open main page', async () => {
    await browser.coldNavigation("Main Page", mainPage.url)
    await mainPage.acceptCookies.shadowRootButtonClick()
    await mainPage.firstProduct.find()
    // await browser.flow.navigate(browser.page.url(), {name: "Main page warm", configContext: {
    //     settingsOverrides: {disableStorageReset: true}}})
}).timeout(testTime);

// Given: I am on the main page
// When: I am clicking on the first product
// Then: I measure cold navigation performance of the product page
it('Open product page', async () => {
    await browser.flow.startTimespan({ name: "Open First Product page" });
    await mainPage.firstProduct.click();
    await productPage.addProduct.find();
    await browser.flow.endTimespan();
    await browser.waitTillRendered();
}).timeout(testTime);

// Given: I am on the product page
// Then: I measure cold navigation performance of the product page
it('Cold Check of product page', async () => {
    await browser.flow.navigate(browser.page.url(), { name: "Product page" });
}).timeout(testTime);

// Given: I am on the product page
// When: I am clicking on the "Zubereitung" tab
// Then: I measure timing of the action
it('Open "Zubereitung" tab', async () => {
    await browser.flow.startTimespan({ name: "Open 'Zubereitung' tab" });
    await productPage.zubereitung.click();
    await browser.flow.endTimespan();
}).timeout(testTime);

// Given: I am on the product page
// When: I adding product to the cart
// Then: I measure timing of the action
it('Add product to the cart', async () => {
    await browser.flow.startTimespan({ name: "Add product to the cart" });
    await productPage.addProduct.click();
    await productPage.fistProductAdded.find();
    await browser.flow.endTimespan();
}).timeout(testTime);

// Given: I am on the product page
// When: I'm navigating to main page
// Then: I measure timing of the action
it('Navigate to main page', async () => {
    await browser.flow.startTimespan({ name: "Navigate to main page" });
    await productPage.mainPageLink.click();
    await mainPage.thirdProduct.find();
    await browser.flow.endTimespan();
}).timeout(testTime);

// Given: I am on the main page
// Then: I measure warm navigation performance of the main page
it('Warm Check of main page', async () => {
    await browser.flow.navigate(browser.page.url(), {
        name: "Main page warm", configContext: {
            settingsOverrides: { disableStorageReset: true }
        }
    })
}).timeout(testTime);

// Given I'm on the main page
// When: I'm selecting third product
// Then: I'm navigating to the product page
// And: I measure timing of the action
it('Open third product page', async () => {
    await browser.flow.startTimespan({ name: "Open third product page" });
    await mainPage.thirdProduct.click();
    await productPage.addProduct.find();
    await browser.flow.endTimespan();
}).timeout(testTime);

// Given: I'm on the product page 2
// Then: I measure warm navigation performance of the product page 2
it('Watm Check of product page 2', async () => {
    await browser.flow.navigate(browser.page.url(), {
        name: "Product page 2", configContext: {
            settingsOverrides: { disableStorageReset: true }
        }
    });
}).timeout(testTime);

// Given: I am on the product page
// When: I'm adding product to the cart
// Then: I measure timing of the action
it('Add second product to the cart', async () => {
    await browser.flow.startTimespan({ name: "Add second product to the cart" });
    await productPage.addProduct.click();
    await productPage.secondProductAdded.find();
    await browser.flow.endTimespan();
}).timeout(testTime);


// Given: I see top menu bar
// When: I want to select full menu
// Then: I click on the "Menus" button
// And: I measure timing of the action
it('Select full meal', async () => {
    await browser.flow.startTimespan({ name: "Select full meal" });
    await mainPage.menus.click();
    await mainPage.fullMenus.find();
    await browser.flow.endTimespan();
}).timeout(testTime);

// Given I'm on the full menu page
// Then: I measure cold navigation performance of the full menu page
it('Cold Check of full meal page', async () => {
    await browser.flow.navigate(browser.page.url(), { name: "Full Meal List" });
}).timeout(testTime);

// Given I'm on the full menu page
// When: I want to select a full menu
// Then: I click Full menus list
// And: I measure timing of the action
it('Open full meal list', async () => {
    await browser.flow.startTimespan({ name: "Open full meal list" });
    await mainPage.fullMenus.click();
    await browser.flow.endTimespan();
}).timeout(testTime);

// Given: I'm on a full menu selection page
// Then: I measure cold navigation performance of the full menu selection page
it('Cold Check of full meal selection page', async () => {
    await browser.flow.navigate(browser.page.url(), { name: "Full Meal Selection" });
}).timeout(testTime);

// Given: I see full meal page
// When: I want to select second available option
// Then: I click on the second product
// And: I measure timing of the action
it('Select second full meal', async () => {
    await browser.flow.startTimespan({ name: "Select second full meal" });
    let el = await fullMenuList.secondAvailableProduct();
    console.log(el);
    el.click();
    await browser.flow.endTimespan();
}).timeout(testTime);

// Given I'm on the full menu selection page
// When: I want to check what is in cart
// Then: I click on the cart
// And: I measure timing of the action
it('Open cart', async () => {
    await browser.flow.startTimespan({ name: "Open cart" });
    await mainPage.cartButton.click();
    await browser.flow.endTimespan();
    await browser.flow.snapshot({ name: 'Cart' });
}).timeout(testTime);