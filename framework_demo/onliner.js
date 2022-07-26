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

const withPageStatusCheck = async (page, flow) => {
  return page.isSuccess? await flow() : console.log('Fail detected, skipping flow...');
}

async function captureReport() {
    console.time('Execution Time');
    let testuser     = process.argv[2]; //username
    let testpassword = process.argv[3]; //password
    let configString = process.argv[4]; //desktop or mobile
    let browserType  = process.argv[5]; //headless (docker) or headful (node.js)
    let browser = ''; let page = ''; let flow = '';

    switch (configString) {
      case "mobile": {
        browser = browserType==="headless"? await puppeteer.launch(browserSettings.headlessMobile) : await puppeteer.launch(browserSettings.headfulMobile);
        page    = await browser.newPage();
        flow    = await lighthouse.startFlow(page, lightHouseSettings.configMobile);
        break;
      }
      default: {
        browser = browserType==="headless"? await puppeteer.launch(browserSettings.headlessDesktop) : await puppeteer.launch(browserSettings.headfulDesktop);
        page    = await browser.newPage();
        flow    = await lighthouse.startFlow(page, lightHouseSettings.configDesktop);
      }
    }
    // extra property to track failed actions
    // any fail working with selectors or keyboard sets this to false
    page.isSuccess = true;

    //TEST STEPS
    await withPageStatusCheck(page, () => measureColdPage(page, flow, directLinks.mainPage, "Main Page"));
    await withPageStatusCheck(page, () => measureColdPage(page, flow, directLinks.services, "Uslugi"));
    await withPageStatusCheck(page, () => measureColdPage(page, flow, directLinks.baraholka, "Baraholka"));
    await withPageStatusCheck(page, () => measureColdPage(page, flow, directLinks.forum, "Forum"));
    await withPageStatusCheck(page, () => measureColdPage(page, flow, directLinks.kurs, "Kurs"));
    await withPageStatusCheck(page, () => selectCurrencyExchange(page, flow));
    await withPageStatusCheck(page, () => zoomIn(page, flow));

    //REPORTING
    await createReports(flow, configString);

    await browser.close();
    console.timeEnd('Execution Time');
}
captureReport();
