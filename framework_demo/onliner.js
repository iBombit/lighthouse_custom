// pages
const ColdNavigations = require('./pages/coldNavigations');
const measureColdPage = new ColdNavigations().openPage;
const Pages = require('./pages/goto');
const goto = new Pages();

// flows
const CurrencyExchange = require('./flows/currencyExchange');
const selectCurrencyExchange = new CurrencyExchange().selectCurrencyExchange;
const zoomIn = new CurrencyExchange().zoomIn;

// links
const Links = require('./links/links');
const directLinks = new Links();

// reports
const CreateReport = require('./reporting/createReport');
const createReports = new CreateReport().createReports;

// helpers
const BrowserActions = require('./helpers/browserActions');
const startBrowserWithLighthouse = new BrowserActions().startBrowserWithLighthouse;
const restartBrowser = new BrowserActions().restartBrowser;
const closeBrowser = new BrowserActions().closeBrowser;
const PageStatus = require('./helpers/pageStatus');
const withPageStatusCheck = new PageStatus().withPageStatusCheck;

async function captureReport() {
    console.time('Execution Time');
    let testuser     = process.argv[2]; //username
    let testpassword = process.argv[3]; //password
    let configString = process.argv[4]; //desktop or mobile
    let browserType  = process.argv[5]; //headless (docker) or headful (node.js)
    let env          = process.argv[6]; //env link
    let browser = ''; let page = ''; let flow = '';

    // set env URL in links.js class
    directLinks.link = env;

    // set vars depending on passed configString, browserType
    [browser, page, flow] = await startBrowserWithLighthouse(configString, browserType);

    //TEST STEPS
    await withPageStatusCheck(page, () => measureColdPage(page, flow, directLinks.mainPage, "Main Page"));
    await withPageStatusCheck(page, () => measureColdPage(page, flow, directLinks.services, "Uslugi"));
    await withPageStatusCheck(page, () => measureColdPage(page, flow, directLinks.baraholka, "Baraholka"));
    /*
      Chrome with puppeteer tends to use A LOT of RAM with large sites and >10 consecutive page navigations
      Chrome has a limit for 1 page of 4GB
      The method below will restart Chrome and append previous report results (flow object)
      Do not forget to login after this (if needed)
    */
    [browser, page] = await restartBrowser(browser, page, flow, configString, browserType);
    await withPageStatusCheck(page, () => measureColdPage(page, flow, directLinks.forum, "Forum"));
    await withPageStatusCheck(page, () => measureColdPage(page, flow, directLinks.kurs, "Kurs"));
    await withPageStatusCheck(page, () => selectCurrencyExchange(page, flow));
    await withPageStatusCheck(page, () => zoomIn(page, flow));

    //REPORTING
    await createReports(flow, configString);
    await closeBrowser(browser);
    console.timeEnd('Execution Time');
}
captureReport();
