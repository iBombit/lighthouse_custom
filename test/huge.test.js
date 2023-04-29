const logger = require("../settings/logger");
const HomePage = require('../pages/homePage');
const TextBoxPage = require('../pages/webElements/textBoxPage');
const UploadDownloadPage = require('../pages/webElements/uploadDownloadPage');
const CheckBoxPage = require('../pages/webElements/checkBoxPage');
const ButtonsPage = require('../pages/webElements/buttonsPage');
const LighthouseBrowser = require('../core/browser');
const CreateReport = require('../reporting/createReport');
const path = require('path');
const uploadDir = path.relative(process.cwd(), __dirname)

var browserType = "desktop",
    headless = false,
    browser = new LighthouseBrowser(browserType, headless),
    Home = new HomePage(),
    TextBox = new TextBoxPage(),
    UploadDownload = new UploadDownloadPage(),
    CheckBox = new CheckBoxPage(),
    Buttons = new ButtonsPage(),
    testTime = 100000;

beforeAll(async () =>  {
    await browser.init();
    await browser.start();   
    browser.page.isSuccess = true; // Track failed actions (any fail working with actions sets this to false)
    Home.init(browser.page); // Sets instance of puppeteer page to Home page object
    TextBox.init(browser.page); // Sets instance of puppeteer page to TextBox page object
    UploadDownload.init(browser.page); // Sets instance of puppeteer page to UploadDownload page object
    CheckBox.init(browser.page); // Sets instance of puppeteer page to CheckBox page object
    Buttons.init(browser.page); // Sets instance of puppeteer page to Buttons page object
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
test("[ColdNavigation] Check " + Home.url, async () => {
    await browser.coldNavigation("Main Page", Home.url)
}, testTime)

// Given: I am on the Home page
// When: I click on "Elements"
// Then: I wait for the new page to be rendered
// And: I stop measuring action time performance of the page
test("[Timespan] Click on 'Elements'", async () => {
    await browser.flow.startTimespan({ stepName: "Click on 'Elements'"})
        await Home.elements.click()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the Main page "Elements" section
// When: I am navigating to Main page "TextBox" section
// Then: I measure cold navigation performance of the page
test("[ColdNavigation] Check " + TextBox.url, async () => {
    await browser.coldNavigation("TextBox Page", TextBox.url)
}, testTime)

// Given: I am on the Main page "TextBox" section
// When: I fill text box fields
// Then: I click on "submit" button
// And: I wait for "textBoxVerify" to be visible
// And: I stop measuring action time performance of the page
test("[Timespan] Submit text box form", async () => {
    await TextBox.fullName.type("UI TESTER")
    await TextBox.userEmail.type("ui_tester@gmail.com")
    await TextBox.currentAddress.type("mars, musk st., 39 apt., twitter")
    await TextBox.permanentAddress.type("earth, UK, cotswolds, clarkson's farm")
    
    await browser.flow.startTimespan({ stepName: "Submit text box form"})
        await TextBox.submit.click()
        await TextBox.textBoxVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the Main page "TextBox" section
// When: I am navigating to Main page "CheckBox" section
// Then: I measure cold navigation performance of the page
test("[ColdNavigation] Check " + CheckBox.url, async () => {
    await browser.coldNavigation("CheckBox Page", CheckBox.url)
}, testTime)

// Given: I am on the Main page "CheckBox" section
// When: I check 'Home' checkbox
// Then: I wait for 'Home' checkbox to be selected
// And: I measure action time performance of the page
test("[Timespan] Select 'Home' checkBox", async () => {    
    await browser.flow.startTimespan({ stepName: "Select 'Home' checkBox"})    
        await CheckBox.homeCheckBox.click()
        await CheckBox.homeSelectVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the Main page "CheckBox" section
// And: 'Home' checkbox is selected
// When: I expand 'Home' treeNode
// Then: I wait for 'Home' treeNode to be expanded
// And: I measure action time performance of the page
test("[Timespan] Expand 'Home' treeNode", async () => {
    await browser.flow.startTimespan({ stepName: "Expand 'Home' treeNode"})    
        await CheckBox.checkBoxExpandHome.click()
        await CheckBox.checkBoxSelectVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the Main page "CheckBox" section
// And: 'Home' checkbox is selected
// And: 'Home' treeNode is expanded
// When: I uncheck 'Desktop' checkbox
// Then: I wait for 'Desktop' checkbox to be deselected
// And: I measure action time performance of the page
test("[Timespan] Deselect 'Desktop' checkBox", async () => {    
    await browser.flow.startTimespan({ stepName: "Deselect 'Desktop' checkBox"})    
        await CheckBox.desktopCheckbox.click()
        await CheckBox.desktopCheckboxVerify.findHidden()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the Main page "CheckBox" section
// When: I am navigating to Main page "Buttons" section
// Then: I measure cold navigation performance of the page
test("[ColdNavigation] Check " + Buttons.url, async () => {
    await browser.coldNavigation("Buttons Page", Buttons.url)
}, testTime)

// Given: I am on the Main page "Buttons" section
// When: I click on "Click Me" button
// Then: I wait for click message to appear
// And: I measure action time performance of the page
test("[Timespan] Simple click button", async () => {    
    await browser.flow.startTimespan({ stepName: "Simple click button"})    
        await Buttons.clickBtn.click()
        await Buttons.clickVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the Main page "Buttons" section
// When: I double click on "Double Click Me" button
// Then: I wait for click message to appear
// And: I measure action time performance of the page
test("[Timespan] Double click button", async () => {    
    await browser.flow.startTimespan({ stepName: "Double click button"})    
        await Buttons.doubleClickBtn.dobleClick()
        await Buttons.doubleClickVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the Main page "Buttons" section
// When: I right click on "Right Click Me" button
// Then: I wait for click message to appear
// And: I measure action time performance of the page
test("[Timespan] Right click button", async () => {    
    await browser.flow.startTimespan({ stepName: "Right click button"})    
        await Buttons.rightClickBtn.rightClick()
        await Buttons.rightClickVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)

// Given: I am on the Main page "Buttons" section
// When: I am navigating to Main page "UploadDownload" section
// Then: I measure cold navigation performance of the page
test("[ColdNavigation] Check " + UploadDownload.url, async () => {
    await browser.coldNavigation("UploadDownload Page", UploadDownload.url)
}, testTime)

// Given: I am on the Main page "UploadDownload" section
// When: I am uploading test file
// Then: I wait for upload verification message to appear
// And: I measure action time performance of the page
test("[Timespan] Upload file into 'Choose File'", async () => {
    await browser.flow.startTimespan({ stepName: "Upload file into 'Choose File'"})
        await UploadDownload.uploadFile.upload(uploadDir + "../testdata/files/uploadTest.txt")
        await UploadDownload.uploadVerify.find()
        await browser.waitTillRendered()
    await browser.flow.endTimespan()
}, testTime)