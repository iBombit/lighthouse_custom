import logger from "logger-module/logger.js";
import HomePage from '../pages/demoqa/homePage.js';
import TextBoxPage from '../pages/demoqa/textBoxPage.js';
import UploadDownloadPage from '../pages/demoqa/uploadDownloadPage.js';
import CheckBoxPage from '../pages/demoqa/checkBoxPage.js';
import ButtonsPage from '../pages/demoqa/buttonsPage.js';
import { beforeHook, beforeEachHook, afterEachHook, afterHook } from 'settings-module/mochaHooks.js';
import * as params from 'settings-module/testParams.js';

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

it(`[ColdNavigation] Check ${Home.getURL()}`, async function () {
    await Home.coldNavigation(browser)
}).timeout(params.testTime);

it("[WarmNavigation] Check Home URL", async function () {
    await Home.warmNavigation(browser)
}).timeout(params.testTime);

it("[Timespan] Click on 'Elements'", async function () {
    await Home.clickOnElements(browser)
}).timeout(params.testTime);

it(`[ColdNavigation] Check ${TextBox.getURL()}`, async function () {
    await TextBox.coldNavigation(browser)
}).timeout(params.testTime);

it("[Timespan] Submit text box form", async function () {
    await TextBox.submitTextForm(browser)
}).timeout(params.testTime);

it(`[ColdNavigation] Check ${CheckBox.getURL()}`, async function () {
    await CheckBox.coldNavigation(browser)
}).timeout(params.testTime);

it("[Timespan] Select 'Home' checkBox", async function () {
    await CheckBox.selectHomeCheckbox(browser)
}).timeout(params.testTime);

it("[Timespan] Expand 'Home' treeNode", async function () {
    await CheckBox.expandHomeTreeNode(browser)
}).timeout(params.testTime);

it("[Timespan] Deselect 'Desktop' checkBox", async function () {
    await CheckBox.deselectDesktopCheckbox(browser)
}).timeout(params.testTime);

it(`[ColdNavigation] Check ${Buttons.getURL()}`, async function () {
    await Buttons.coldNavigation(browser)
}).timeout(params.testTime);

it("[Timespan] Simple click button", async function () {
    await Buttons.simpleClickButton(browser)
}).timeout(params.testTime);

it("[Timespan] Double click button", async function () {
    await Buttons.doubleClickButton(browser)
}).timeout(params.testTime);

it("[Timespan] Right click button", async function () {
    await Buttons.rightClickButton(browser)
}).timeout(params.testTime);

it(`[ColdNavigation] Check ${UploadDownload.getURL()}`, async function () {
    await UploadDownload.coldNavigation(browser)
}).timeout(params.testTime);

it("[Timespan] Upload file into 'Choose File'", async function () {
    await UploadDownload.uploadFileIntoInput(browser)
}).timeout(params.testTime);