import logger from "../logger/logger.js";
import HomePage from '../pages/demoqa/homePage.js';
import TextBoxPage from '../pages/demoqa/textBoxPage.js';
import UploadDownloadPage from '../pages/demoqa/uploadDownloadPage.js';
import CheckBoxPage from '../pages/demoqa/checkBoxPage.js';
import ButtonsPage from '../pages/demoqa/buttonsPage.js';
import { beforeHook, beforeEachHook, afterEachHook, afterHook } from '../settings/mochaHooks.js';
import * as params from '../settings/testParams.js';

let browser;
const Home = new HomePage();
const TextBox = new TextBoxPage();
const UploadDownload = new UploadDownloadPage();
const CheckBox = new CheckBoxPage();
const Buttons = new ButtonsPage();

// Extend the common beforeHook with additional setup
const customBeforeHook = async () => {
    await beforeHook(); // Perform the common setup first (browser startup)
    browser = await params.getBrowserInstance();
    Home.init(browser.page); // Sets instance of puppeteer page to Home page object
    TextBox.init(browser.page); // Sets instance of puppeteer page to TextBox page object
    UploadDownload.init(browser.page); // Sets instance of puppeteer page to UploadDownload page object
    CheckBox.init(browser.page); // Sets instance of puppeteer page to CheckBox page object
    Buttons.init(browser.page); // Sets instance of puppeteer page to Buttons page object
};

// Specify all mocha hooks
before(customBeforeHook);
beforeEach(beforeEachHook);
afterEach(afterEachHook);
after(afterHook);

// Given: I am opening the browser
// When: I am navigating to Home page
// Then: I measure cold navigation performance of the page
it("[ColdNavigation] Check Home URL", async function () {
    await browser.coldNavigation("Main Page", Home.url)
}).timeout(params.testTime);

// Given: I am on the Home page
// When: I click on "Elements"
// Then: I wait for the new page to be rendered
// And: I stop measuring action time performance of the page
it("[Timespan] Click on 'Elements'", async function () {
    await browser.flow.startTimespan({ name: "Click on 'Elements'" })
    await Home.elements.click()
    await browser.waitTillRendered()
    await browser.flow.endTimespan()
}).timeout(params.testTime);

// Given: I am on the Main page "Elements" section
// When: I am navigating to Main page "TextBox" section
// Then: I measure cold navigation performance of the page
it("[ColdNavigation] Check TextBox URL", async function () {
    await browser.coldNavigation("TextBox Page", TextBox.url)
}).timeout(params.testTime);

// Given: I am on the Main page "TextBox" section
// When: I fill text box fields
// Then: I click on "submit" button
// And: I wait for "textBoxVerify" to be visible
// And: I stop measuring action time performance of the page
it("[Timespan] Submit text box form", async function () {
    await TextBox.fullName.type("UI TESTER")
    await TextBox.userEmail.type("ui_tester@gmail.com")
    await TextBox.currentAddress.type("mars, musk st., 39 apt., twitter")
    await TextBox.permanentAddress.type("earth, UK, cotswolds, clarkson's farm")

    await browser.flow.startTimespan({ name: "Submit text box form" })
    await TextBox.submit.click()
    await TextBox.textBoxVerify.find()
    await browser.waitTillRendered()
    await browser.flow.endTimespan()
}).timeout(params.testTime);

// Given: I am on the Main page "TextBox" section
// When: I am navigating to Main page "CheckBox" section
// Then: I measure cold navigation performance of the page
it("[ColdNavigation] Check CheckBox URL", async function () {
    await browser.coldNavigation("CheckBox Page", CheckBox.url)
}).timeout(params.testTime);

// Given: I am on the Main page "CheckBox" section
// When: I check 'Home' checkbox
// Then: I wait for 'Home' checkbox to be selected
// And: I measure action time performance of the page
it("[Timespan] Select 'Home' checkBox", async function () {
    await browser.flow.startTimespan({ name: "Select 'Home' checkBox" })
    await CheckBox.homeCheckBox.click()
    await CheckBox.homeSelectVerify.find()
    await browser.waitTillRendered()
    await browser.flow.endTimespan()
}).timeout(params.testTime);

// Given: I am on the Main page "CheckBox" section
// And: 'Home' checkbox is selected
// When: I expand 'Home' treeNode
// Then: I wait for 'Home' treeNode to be expanded
// And: I measure action time performance of the page
it("[Timespan] Expand 'Home' treeNode", async function () {
    await browser.flow.startTimespan({ name: "Expand 'Home' treeNode" })
    await CheckBox.checkBoxExpandHome.click()
    await CheckBox.checkBoxSelectVerify.find()
    await browser.waitTillRendered()
    await browser.flow.endTimespan()
}).timeout(params.testTime);

// Given: I am on the Main page "CheckBox" section
// And: 'Home' checkbox is selected
// And: 'Home' treeNode is expanded
// When: I uncheck 'Desktop' checkbox
// Then: I wait for 'Desktop' checkbox to be deselected
// And: I measure action time performance of the page
it("[Timespan] Deselect 'Desktop' checkBox", async function () {
    await browser.flow.startTimespan({ name: "Deselect 'Desktop' checkBox" })
    await CheckBox.desktopCheckbox.click()
    await CheckBox.desktopCheckboxVerify.findHidden()
    await browser.waitTillRendered()
    await browser.flow.endTimespan()
}).timeout(params.testTime);

// Given: I am on the Main page "CheckBox" section
// When: I am navigating to Main page "Buttons" section
// Then: I measure cold navigation performance of the page
it("[ColdNavigation] Check Buttons URL", async function () {
    await browser.coldNavigation("Buttons Page", Buttons.url)
}).timeout(params.testTime);

// Given: I am on the Main page "Buttons" section
// When: I click on "Click Me" button
// Then: I wait for click message to appear
// And: I measure action time performance of the page
it("[Timespan] Simple click button", async function () {
    await browser.flow.startTimespan({ name: "Simple click button" })
    await Buttons.clickBtn.click()
    await Buttons.clickVerify.find()
    await browser.waitTillRendered()
    await browser.flow.endTimespan()
}).timeout(params.testTime);

// Given: I am on the Main page "Buttons" section
// When: I double click on "Double Click Me" button
// Then: I wait for click message to appear
// And: I measure action time performance of the page
it("[Timespan] Double click button", async function () {
    await browser.flow.startTimespan({ name: "Double click button" })
    await Buttons.doubleClickBtn.doubleClick()
    await Buttons.doubleClickVerify.find()
    await browser.waitTillRendered()
    await browser.flow.endTimespan()
}).timeout(params.testTime);

// Given: I am on the Main page "Buttons" section
// When: I right click on "Right Click Me" button
// Then: I wait for click message to appear
// And: I measure action time performance of the page
it("[Timespan] Right click button", async function () {
    await browser.flow.startTimespan({ name: "Right click button" })
    await Buttons.rightClickBtn.rightClick()
    await Buttons.rightClickVerify.find()
    await browser.waitTillRendered()
    await browser.flow.endTimespan()
}).timeout(params.testTime);

// Given: I am on the Main page "Buttons" section
// When: I am navigating to Main page "UploadDownload" section
// Then: I measure cold navigation performance of the page
it("[ColdNavigation] Check UploadDownload URL", async function () {
    await browser.coldNavigation("UploadDownload Page", UploadDownload.url)
}).timeout(params.testTime);

// Given: I am on the Main page "UploadDownload" section
// When: I am uploading test file
// Then: I wait for upload verification message to appear
// And: I measure action time performance of the page
it("[Timespan] Upload file into 'Choose File'", async function () {
    await browser.flow.startTimespan({ name: "Upload file into 'Choose File'" })
    await UploadDownload.uploadFile.upload(params.uploadDir + "../testdata/files/uploadTest.txt")
    await UploadDownload.uploadVerify.find()
    await browser.waitTillRendered() //TODO it fails with "RESULT_CODE_KILLED_BAD_MESSAGE"
    await browser.flow.endTimespan()
}).timeout(params.testTime);