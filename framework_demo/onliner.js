const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse/lighthouse-core/fraggle-rock/api.js');

// settings
const LightHouse = require('./settings/lightHouse');
const Browser = require('./settings/browser');
const lightHouseSettings = new LightHouse.LightHouse;
const browserSettings = new Browser.Browser;

// pages
const ColdNavigations = require('./pages/coldNavigations');
const Pages = require('./pages/goto');
const measureColdPage = new ColdNavigations().openPage;
const goto = new Pages();

// flows
const CurrencyExchange = require('./flows/currencyExchange');
const selectCurrencyExchange = new CurrencyExchange().selectCurrencyExchange;
const zoomIn = new CurrencyExchange().zoomIn;

// Links
const Links = require('./links/links');
const directLinks = new Links.DirectLinks();

// reports
const CreateReport = require('./reporting/createReport');
const createReports = new CreateReport().createReports;

async function captureReport() {
    const nodePath = process.argv[0]; //always 1st env var
    const appPath = process.argv[1]; //always 2nd env var
    const testuser = process.argv[2]; //username to pass from Carrier
    const testpassword = process.argv[3]; //password to pass from Carrier

    //FOR docker/carrier
    //const browser = await puppeteer.launch(browserSettings.headlessDesktop);
    //FOR LOCAL DEBUG -- with node only (doesn't work in docker)
    const browser = await puppeteer.launch(browserSettings.headfulDesktop);
    const page = await browser.newPage();
    // extra property to track failed actions
    // any fail working with selectors or keyboard sets this to false
    page.isSuccess = true;

    // Start Lighthouse Flow for UI perfomance measurement
    const flow = await lighthouse.startFlow(page, lightHouseSettings.configDesktop);
    //const flow = await lighthouse.startFlow(page, lightHouseSettings.configMobile);

    //TEST STEPS
    page.isSuccess ? await measureColdPage(page, flow, directLinks.mainPage, "Main Page") : console.log('Fail detected, skipping flow...');
    page.isSuccess ? await measureColdPage(page, flow, directLinks.services, "Uslugi") : console.log('Fail detected, skipping flow...');
    page.isSuccess ? await measureColdPage(page, flow, directLinks.baraholka, "Baraholka") : console.log('Fail detected, skipping flow...');
    page.isSuccess ? await measureColdPage(page, flow, directLinks.forum, "Forum") : console.log('Fail detected, skipping flow...');
    page.isSuccess ? await measureColdPage(page, flow, directLinks.kurs, "Kurs") : console.log('Fail detected, skipping flow...');

    page.isSuccess ? await selectCurrencyExchange(page, flow) : console.log('Fail detected, skipping flow...');
    page.isSuccess ? await zoomIn(page, flow) : console.log('Fail detected, skipping flow...');

    //REPORTING
    await createReports(flow);

    await browser.close();
}
captureReport();