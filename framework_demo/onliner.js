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

// links
const Links = require('./links/links');
const directLinks = new Links.DirectLinks();

// reports
const CreateReport = require('./reporting/createReport');
const createReports = new CreateReport().createReports;

// exec will allow us to execute basic sh commands
const { promisify } = require('util');
const exec = promisify(require('child_process').exec)

const withPageStatusCheck = async (page, flow) => {
  return page.isSuccess? await flow() : console.log('Fail detected, skipping flow...');
}

const startBrowserWithLighthouse = async (configString, browserType, flow) => {
  switch (configString) {
    case "mobile": {
      const browser = browserType === "headless" ? await puppeteer.launch(browserSettings.headlessMobile) : await puppeteer.launch(browserSettings.headfulMobile);
      const page    = await browser.newPage();
      // change only page object inside flow to preserve report data
      const newFlow = typeof flow === "undefined" ? await lighthouse.startFlow(page, lightHouseSettings.configMobile) : flow.options.page = page;
      // extra property to track failed actions
      // any fail working with selectors or keyboard sets this to false
      page.isSuccess = true;
      return [browser, page, newFlow];
    }
    default: {
      const browser = browserType === "headless" ? await puppeteer.launch(browserSettings.headlessDesktop) : await puppeteer.launch(browserSettings.headfulDesktop);
      const page    = await browser.newPage();
      // change only page object inside flow to preserve report data
      const newFlow = typeof flow === "undefined" ? await lighthouse.startFlow(page, lightHouseSettings.configDesktop) : flow.options.page = page;
      // extra property to track failed actions
      // any fail working with selectors or keyboard sets this to false
      page.isSuccess = true;
      return [browser, page, newFlow];
    }
  }
}

const restartChrome = async (browser, page, flow, configString, browserType) => {
    console.log('killing CHROME');
    await page.close();
    await browser.close();
    try {
      // ensure that your system/docker has these commands installed
      await exec("kill -9 $(ps -ef | grep chrome | awk '{print $2}')");
    }
    catch(error) {
      console.log("chrome killed, error was from not existent PID, but we catch it");
    }
    [browser, page, flow] = await startBrowserWithLighthouse(configString, browserType, flow);
    return [browser, page];
}

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
    /*
      set vars depending on passed configString, browserType
      browser -- current browser instance
      page -- current page in browser
      flow -- lighthouse flow object (used for measurements and report)
    */
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
    [browser, page] = await restartChrome(browser, page, flow, configString, browserType);
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
