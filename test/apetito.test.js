import logger from "../logger/logger.js";
import { MainPage, FullMenuList, ProductPage } from '../pages/apetito/pages.js'
import { beforeHook, beforeEachHook, afterEachHook, afterHook } from '../settings/mochaHooks.js';
import * as params from '../settings/testParams.js';

let browser;
const mainPage = new MainPage();
const productPage = new ProductPage();
const fullMenuList = new FullMenuList();

// Extend the common beforeHook with additional setup
const customBeforeHook = async () => {
    await beforeHook(); // Perform the common setup first (browser startup)
    browser = await params.getBrowserInstance();
    mainPage.init(browser.page); // Sets instance of puppeteer page to mainPage page object
    productPage.init(browser.page); // Sets instance of puppeteer page to productPage page object
    fullMenuList.init(browser.page); // Sets instance of puppeteer page to fullMenuList page object
};

// Specify all mocha hooks
before(customBeforeHook);
beforeEach(beforeEachHook);
afterEach(afterEachHook);
after(afterHook);

// Given: I am opening the browser
// When: I am opening the main page
// Then: I measure cold navigation performance of the page
it('Open main page', async () => {
    await browser.coldNavigation("Main Page", mainPage.url)
    await mainPage.acceptCookies.shadowRootButtonClick()
    await mainPage.firstProduct.find()
    // await browser.flow.navigate(browser.page.url(), {name: "Main page warm", configContext: {
    //     settingsOverrides: {disableStorageReset: true}}})
}).timeout(params.testTime);

// Given: I am on the main page
// When: I am clicking on the first product
// Then: I measure cold navigation performance of the product page
it('Open product page', async () => {
    await browser.flow.startTimespan({ name: "Open First Product page" });
    await mainPage.firstProduct.click();
    await productPage.addProduct.find();
    await browser.flow.endTimespan();
    await browser.waitTillRendered();
}).timeout(params.testTime);

// Given: I am on the product page
// Then: I measure cold navigation performance of the product page
it('Cold Check of product page', async () => {
    await browser.flow.navigate(browser.page.url(), { name: "Product page" });
}).timeout(params.testTime);

// Given: I am on the product page
// When: I am clicking on the "Zubereitung" tab
// Then: I measure timing of the action
it('Open "Zubereitung" tab', async () => {
    await browser.flow.startTimespan({ name: "Open 'Zubereitung' tab" });
    await productPage.zubereitung.click();
    await browser.flow.endTimespan();
}).timeout(params.testTime);

// Given: I am on the product page
// When: I adding product to the cart
// Then: I measure timing of the action
it('Add product to the cart', async () => {
    await browser.flow.startTimespan({ name: "Add product to the cart" });
    await productPage.addProduct.click();
    await productPage.fistProductAdded.find();
    await browser.flow.endTimespan();
}).timeout(params.testTime);

// Given: I am on the product page
// When: I'm navigating to main page
// Then: I measure timing of the action
it('Navigate to main page', async () => {
    await browser.flow.startTimespan({ name: "Navigate to main page" });
    await productPage.mainPageLink.click();
    await mainPage.thirdProduct.find();
    await browser.flow.endTimespan();
}).timeout(params.testTime);

// Given: I am on the main page
// Then: I measure warm navigation performance of the main page
it('Warm Check of main page', async () => {
    await browser.flow.navigate(browser.page.url(), {
        name: "Main page warm", configContext: {
            settingsOverrides: { disableStorageReset: true }
        }
    })
}).timeout(params.testTime);

// Given I'm on the main page
// When: I'm selecting third product
// Then: I'm navigating to the product page
// And: I measure timing of the action
it('Open third product page', async () => {
    await browser.flow.startTimespan({ name: "Open third product page" });
    await mainPage.thirdProduct.click();
    await productPage.addProduct.find();
    await browser.flow.endTimespan();
}).timeout(params.testTime);

// Given: I'm on the product page 2
// Then: I measure warm navigation performance of the product page 2
it('Watm Check of product page 2', async () => {
    await browser.flow.navigate(browser.page.url(), {
        name: "Product page 2", configContext: {
            settingsOverrides: { disableStorageReset: true }
        }
    });
}).timeout(params.testTime);

// Given: I am on the product page
// When: I'm adding product to the cart
// Then: I measure timing of the action
it('Add second product to the cart', async () => {
    await browser.flow.startTimespan({ name: "Add second product to the cart" });
    await productPage.addProduct.click();
    await productPage.secondProductAdded.find();
    await browser.flow.endTimespan();
}).timeout(params.testTime);


// Given: I see top menu bar
// When: I want to select full menu
// Then: I click on the "Menus" button
// And: I measure timing of the action
it('Select full meal', async () => {
    await browser.flow.startTimespan({ name: "Select full meal" });
    await mainPage.menus.click();
    await mainPage.fullMenus.find();
    await browser.flow.endTimespan();
}).timeout(params.testTime);

// Given I'm on the full menu page
// Then: I measure cold navigation performance of the full menu page
it('Cold Check of full meal page', async () => {
    await browser.flow.navigate(browser.page.url(), { name: "Full Meal List" });
}).timeout(params.testTime);

// Given I'm on the full menu page
// When: I want to select a full menu
// Then: I click Full menus list
// And: I measure timing of the action
it('Open full meal list', async () => {
    await browser.flow.startTimespan({ name: "Open full meal list" });
    await mainPage.fullMenus.click();
    await browser.flow.endTimespan();
}).timeout(params.testTime);

// Given: I'm on a full menu selection page
// Then: I measure cold navigation performance of the full menu selection page
it('Cold Check of full meal selection page', async () => {
    await browser.flow.navigate(browser.page.url(), { name: "Full Meal Selection" });
}).timeout(params.testTime);

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
}).timeout(params.testTime);

// Given I'm on the full menu selection page
// When: I want to check what is in cart
// Then: I click on the cart
// And: I measure timing of the action
it('Open cart', async () => {
    await browser.flow.startTimespan({ name: "Open cart" });
    await mainPage.cartButton.click();
    await browser.flow.endTimespan();
    await browser.flow.snapshot({ name: 'Cart' });
}).timeout(params.testTime);