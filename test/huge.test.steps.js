import logger from "lh-pptr-framework/logger/logger.js";
import HomePage from '../pages/demoqa/homePage.js';
import TextBoxPage from '../pages/demoqa/textBoxPage.js';
import UploadDownloadPage from '../pages/demoqa/uploadDownloadPage.js';
import CheckBoxPage from '../pages/demoqa/checkBoxPage.js';
import ButtonsPage from '../pages/demoqa/buttonsPage.js';
import { beforeHook, beforeEachHook, afterEachHook, afterHook } from 'lh-pptr-framework/settings/mochaHooks.js';
import * as params from 'lh-pptr-framework/settings/testParams.js';

let browser;
const Home = new HomePage();
const TextBox = new TextBoxPage();
const UploadDownload = new UploadDownloadPage();
const CheckBox = new CheckBoxPage();
const Buttons = new ButtonsPage();

const pages = [Home, TextBox, UploadDownload, 
               CheckBox, Buttons];

// Extend the common beforeHook with additional setup
const customBeforeHook = async () => {
    await beforeHook(); // Perform the common setup first (browser startup)
    browser = await params.getBrowserInstance();
    for (const page of pages) {
        page.init(browser.page); // Sets instance of puppeteer page to page objects
    }
};

// Specify all mocha hooks
before(customBeforeHook);
beforeEach(beforeEachHook);
afterEach(afterEachHook);
after(afterHook);

it(`[N]_${Home.getURL()}`, async function () {
    await Home.navigation(browser, this)
}).timeout(params.testTime);

it("[N]_Home_URL", async function () {
    await Home.navigation(browser, this)
}).timeout(params.testTime);

it("[T]_Click_on_Elements", async function () {
    await Home.clickOnElements(browser, this)
}).timeout(params.testTime);

it(`[N]_${TextBox.getURL()}`, async function () {
    await TextBox.navigation(browser, this)
}).timeout(params.testTime);

it("[T]_Submit_text_box_form", async function () {
    await TextBox.submitTextForm(browser, this)
}).timeout(params.testTime);

it(`[N]_${CheckBox.getURL()}`, async function () {
    await CheckBox.navigation(browser, this)
}).timeout(params.testTime);

it("[T]_Select_Home_checkBox", async function () {
    await CheckBox.selectHomeCheckbox(browser, this)
}).timeout(params.testTime);

it("[T]_Expand_Home_treeNode", async function () {
    await CheckBox.expandHomeTreeNode(browser, this)
}).timeout(params.testTime);

it("[T]_Deselect_Desktop_checkBox", async function () {
    await CheckBox.deselectDesktopCheckbox(browser, this)
}).timeout(params.testTime);

it(`[N]_${Buttons.getURL()}`, async function () {
    await Buttons.navigation(browser, this)
}).timeout(params.testTime);

it("[T]_Simple_click_button", async function () {
    await Buttons.simpleClickButton(browser, this)
}).timeout(params.testTime);

it("[T]_Double_click_button", async function () {
    await Buttons.doubleClickButton(browser, this)
}).timeout(params.testTime);

it("[T]_Right_click_button", async function () {
    await Buttons.rightClickButton(browser, this)
}).timeout(params.testTime);

it(`[N]_${UploadDownload.getURL()}`, async function () {
    await UploadDownload.navigation(browser, this)
}).timeout(params.testTime);

it("[T]_Upload_file_into_input", async function () {
    await UploadDownload.uploadFileIntoInput(browser, this)
}).timeout(params.testTime);