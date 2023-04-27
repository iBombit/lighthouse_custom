// Given: I'm on the main page
// When: I'm clicking on the first product
// Then:  I measure cold navigation performance of the product page
test('Open main page', async () => {                                         // Declare test
    await browser.coldNavigation("Main Page", mainPage.url)                  // I am opening the main page and measure cold navigation performance
    await browser.flow.startTimespan({ stepName: "Open First Product page"}) // I'm about to measure performance of action
    await mainPage.firstProduct.click()                                      // I'm clicking on first product
    await productPage.addProduct.find()                                      // I expect product page will open with purchase button available
    await browser.flow.endTimespan()                                         // Completing measure of action performance
    await browser.waitTillRendered()                                         // Waiting for page to load
    await browser.flow.navigate(browser.page.url(), {stepName: "Product page"}) // Measure performance of "Procut page" 
}, testTime)                                                                 // End of a test with timeout of "testTime"

// Given: I am on the product page
// When: I adding product to the cart
// Then: I measure timing of the action
test('Add product to the cart', async () => {
    await browser.flow.startTimespan({ stepName: "Add product to the cart"}) // I'm about to measure performance of action
    await productPage.addProduct.click()                        // I'm clicking on first product
    await productPage.fistProductAdded.find()                  // I expect product page will open with purchase button available
    await browser.flow.endTimespan()                           // Completing measure of action performance
}, testTime)                                                  // End of a test with timeout of "testTime"

// Given: I am on the Google homepage
// When: I search for "Lighthouse"
// Then: I wait for results of the search
// And: I measure cold navigation performance of the page
test('Search for "Lighthouse"', async () => {                  // Declare test
    await GooglePage.search.type('Lighthouse')                 // I am typing "Lighthouse" in the search field
    await GooglePage.submit.click()                            // I am submitting the search
    await browser.waitTillRendered()                           // Waiting for page to load
    await browser.coldNavigation("Search Results")             // I am measuring cold navigation performance of the page
}, testTime)                                                   // End of a test with timeout of "testTime"
