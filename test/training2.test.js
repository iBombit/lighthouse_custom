// Given: I'm on the main page
// When: I'm clicking on the first product
// Then:  I measure cold navigation performance of the product page
test('Open main page', async () => {                            
    await browser.coldNavigation("Main Page", mainPage.url)
    await browser.flow.startTimespan({ stepName: "Open First Product page"})
    await mainPage.firstProduct.click()
    await productPage.addProduct.find()
    await browser.flow.endTimespan()
    await browser.waitTillRendered()
    await browser.flow.navigate(browser.page.url(), {stepName: "Product page"})
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

