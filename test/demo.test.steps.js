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
const CheckBox = new CheckBoxPage();
const Buttons = new ButtonsPage();

// Extend the common beforeHook with additional setup
const customBeforeHook = async () => {
    await beforeHook(); // Perform the common setup first (browser startup)
    browser = await params.getBrowserInstance();
    Home.init(browser.page); // Sets instance of puppeteer page to Home page object
    TextBox.init(browser.page); // Sets instance of puppeteer page to TextBox page object
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