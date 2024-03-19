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

it("[ColdNavigation] Check HomePage", async function () {
    await Home.executeStep({ browserInstance: browser, type: 'coldNavigation', name: 'HomePage' });
}).timeout(params.testTime);

it("[WarmNavigation] Check Home URL", async function () {
    await Home.executeStep({ browserInstance: browser, type: 'warmNavigation', name: 'Home URL' });
}).timeout(params.testTime);

it("[Timespan] Click on 'Elements'", async function () {
    await Home.executeStep({
        browserInstance: browser,
        type: 'timespan',
        name: 'Click Elements',
        actions: async () => { await Home.clickOnElements(browser) }
    });
}).timeout(params.testTime);

it("[ColdNavigation] Check TextBox URL", async function () {
    await TextBox.executeStep({ browserInstance: browser, type: 'coldNavigation', name: 'TextBox URL' });
}).timeout(params.testTime);

it("[Timespan] Submit text box form", async function () {
    await TextBox.executeStep({
        browserInstance: browser,
        type: 'timespan',
        name: 'Submit TextBox Form',
        actions: async () => await TextBox.submitTextForm(browser)
      });
}).timeout(params.testTime);

it("[ColdNavigation] Check CheckBox URL", async function () {
    await CheckBox.executeStep({ browserInstance: browser, type: 'coldNavigation', name: 'Check CheckBox URL' });
}).timeout(params.testTime);

it("[Timespan] Select 'Home' checkBox", async function () {
    await CheckBox.executeStep({
        browserInstance: browser,
        type: 'timespan',
        name: "Select 'Home' CheckBox",
        actions: async () => await CheckBox.selectHomeCheckbox(browser)
      });
}).timeout(params.testTime);

it("[Timespan] Expand 'Home' treeNode", async function () {
    await CheckBox.executeStep({
        browserInstance: browser,
        type: 'timespan',
        name: "Expand 'Home' TreeNode",
        actions: async () => await CheckBox.expandHomeTreeNode(browser)
      });
}).timeout(params.testTime);

it("[Timespan] Deselect 'Desktop' checkBox", async function () {
    await CheckBox.executeStep({
        browserInstance: browser,
        type: 'timespan',
        name: "Deselect 'Desktop' CheckBox",
        actions: async () => await CheckBox.deselectDesktopCheckbox(browser)
      });
}).timeout(params.testTime);

it("[ColdNavigation] Check Buttons URL", async function () {
    await Buttons.executeStep({ browserInstance: browser, type: 'coldNavigation', name: 'Check Buttons URL' });
}).timeout(params.testTime);

it("[Timespan] Simple click button", async function () {
    await Buttons.executeStep({
        browserInstance: browser,
        type: 'timespan',
        name: "Simple Click Button",
        actions: async () => await Buttons.simpleClickButton(browser)
      });
}).timeout(params.testTime);

it("[Timespan] Double click button", async function () {
    await Buttons.executeStep({
        browserInstance: browser,
        type: 'timespan',
        name: "Double Click Button",
        actions: async () => await Buttons.doubleClickButton(browser)
      });
}).timeout(params.testTime);

it("[Timespan] Right click button", async function () {
    await Buttons.executeStep({
        browserInstance: browser,
        type: 'timespan',
        name: "Right Click Button",
        actions: async () => await Buttons.rightClickButton(browser)
      });
}).timeout(params.testTime);

it("[ColdNavigation] Check UploadDownload URL", async function () {
    await UploadDownload.executeStep({ browserInstance: browser, type: 'coldNavigation', name: 'Check UploadDownload URL' });
}).timeout(params.testTime);

it("[Timespan] Upload file into 'Choose File'", async function () {
    await UploadDownload.executeStep({
        browserInstance: browser,
        type: 'timespan',
        name: "Upload File into 'Choose File'",
        actions: async () => await UploadDownload.uploadFileIntoInput(browser)
      });
}).timeout(params.testTime);