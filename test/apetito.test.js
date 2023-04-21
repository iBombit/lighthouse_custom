const LighthouseBrowser = require('../core/browser');
const CreateReport = require('../reporting/createReport');
const { MainPage, FullMenuList, ProductPage } = require('../apetito/pages');


// Declare browser and pages required for this test
var browserType = "desktop",
    browser = new LighthouseBrowser(browserType),
    mainPage = new MainPage(), // Creates instance of Main page object
    productPage = new ProductPage(), // Creates instance of Product Page 
    fullMenuList = new FullMenuList(), // Creates instance of Full Menu List Page
    testTime = 90000; // Timeout must be bigger then DEFAULT_TIMEOUT in element.js (5000) otherwise you never will be able to debug


// Setup browser and initialize Google page object before tests
beforeAll(async () =>  {
    await browser.init();
    await browser.start();
    mainPage.init(browser.page); // Sets instance of puppeteer page to the page object
    productPage.init(browser.page); // Sets instance of puppeteer page to the page object
    fullMenuList.init(browser.page); // Sets instance of puppeteer page to the page object
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
// When: I am opening the main page
// Then: I measure cold navigation performance of the page
test('Open main page', async () => {
    await browser.coldNavigation("Main Page", mainPage.url)
    await mainPage.acceptCookies.shadowRootButtonClick()
    await mainPage.firstProduct.find()
    // await browser.flow.navigate(browser.page.url(), {stepName: "Main page warm", configContext: {
    //     settingsOverrides: {disableStorageReset: true}}})
}, testTime)

// Given: I am on the main page
// When: I am clicking on the first product
// Then: I measure cold navigation performance of the product page
test('Open product page', async () => {
    await browser.flow.startTimespan({ stepName: "Open First Product page"})
    await mainPage.firstProduct.click()
    await productPage.addProduct.find()
    await browser.flow.endTimespan()
    await browser.waitTillRendered()
}, testTime)

// Given: I am on the product page
// Then: I measure cold navigation performance of the product page
test('Cold Check of product page', async () => {
    await browser.flow.navigate(browser.page.url(), {stepName: "Product page"})
}, testTime)

// Given: I am on the product page
// When: I am clicking on the "Zubereitung" tab
// Then: I measure timing of the action
test('Open "Zubereitung" tab', async () => {
    await browser.flow.startTimespan({ stepName: "Open 'Zubereitung' tab"})
    await productPage.zubereitung.click()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the product page
// When: I adding product to the cart
// Then: I measure timing of the action
test('Add product to the cart', async () => {
    await browser.flow.startTimespan({ stepName: "Add product to the cart"})
    await productPage.addProduct.click()
    await productPage.fistProductAdded.find()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the product page
// When: I'm navigating to main page
// Then: I measure timing of the action
test('Navigate to main page', async () => {
    await browser.flow.startTimespan({ stepName: "Navigate to main page"})
    await productPage.mainPageLink.click()
    await mainPage.thirdProduct.find()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the main page
// Then: I measure warm navigation performance of the main page
test('Warm Check of main page', async () => {
    await browser.flow.navigate(browser.page.url(), {stepName: "Main page warm", configContext: {
        settingsOverrides: {disableStorageReset: true}}})
}, testTime)

// Given I'm on the main page
// When: I'm selecting third product
// Then: I'm navigating to the product page
// And: I measure timing of the action
test('Open third product page', async () => {
    await browser.flow.startTimespan({ stepName: "Open third product page"})
    await mainPage.thirdProduct.click()
    await productPage.addProduct.find()
    await browser.flow.endTimespan()
}, testTime)

// Given: I' on the product page 2
// Then: I measure warm navigation performance of the product page 2
test('Watm Check of product page 2', async () => {
    await browser.flow.navigate(browser.page.url(), {stepName: "Product page 2", configContext: {
        settingsOverrides: {disableStorageReset: true}}
    })
}, testTime)

// Given: I am on the product page
// When: I'm adding product to the cart
// Then: I measure timing of the action
test('Add second product to the cart', async () => {
    await browser.flow.startTimespan({ stepName: "Add second product to the cart"})
    await productPage.addProduct.click()
    await productPage.secondProductAdded.find()
    await browser.flow.endTimespan()
}, testTime)


// Given: I see top menu bar
// When: I want to select full menu
// Then: I click on the "Menus" button
// And: I measure timing of the action
test('Select full meal', async () => {
    await browser.flow.startTimespan({ stepName: "Select full meal"})
    await mainPage.menus.click()
    await mainPage.fullMenus.find()
    await browser.flow.endTimespan()
}, testTime)

// Given I'm on the full menu page
// Then: I measure cold navigation performance of the full menu page
test('Cold Check of full meal page', async () => {
    await browser.flow.navigate(browser.page.url(), {stepName: "Full Meal List"})
}, testTime)

// Given I'm on the full menu page
// When: I want to select a full menu
// Then: I click Full menus list
// And: I measure timing of the action
test('Open full meal list', async () => {
    await browser.flow.startTimespan({ stepName: "Open full meal list"})
    await mainPage.fullMenus.click();
    await browser.flow.endTimespan()
}, testTime)

// Given: I'm on a full menu selection page
// Then: I measure cold navigation performance of the full menu selection page
test('Cold Check of full meal selection page', async () => {
    await browser.flow.navigate(browser.page.url(), {stepName: "Full Meal Selection"})
}, testTime)

// Given: I see full meal page
// When: I want to select second available option
// Then: I click on the second product
// And: I measure timing of the action
test('Select second full meal', async () => {
    await browser.flow.startTimespan({ stepName: "Select second full meal"})
    var el = await fullMenuList.secondAvailableProduct()
    console.log(el)
    el.click()
    await browser.flow.endTimespan()
}, testTime)

// Given I'm on the full menu selection page
// When: I want to check what is in cart
// Then: I click on the cart
// And: I measure timing of the action
test('Open cart', async () => {
    await browser.flow.startTimespan({ stepName: "Open cart"})
    await mainPage.cartButton.click()
    await browser.flow.endTimespan()
    await browser.flow.snapshot({stepName: 'Cart'});
}, testTime)
