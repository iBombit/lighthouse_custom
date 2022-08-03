const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse/lighthouse-core/fraggle-rock/api.js');

// settings
const LightHouse = require('../settings/lightHouse');
const Browser = require('../settings/browser');
const lightHouseSettings = new LightHouse.LightHouse;
const browserSettings = new Browser.Browser;

// exec will allow us to execute basic sh commands
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

class BrowserActions {
  /**
   * Set vars depending on passed configString, browserType
   * @browser       current browser instance
   * @page          current page in browser
   * @flow          lighthouse flow object (used for measurements and report)
   * @configString  desktop or mobile
   * @browserType   headless (docker) or headful (node.js)
   * @return        browser, page, flow
  */
  async startBrowserWithLighthouse (configString, browserType, flow) {
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

  /**
   * Restart browser and append new page to current flow object
   * @browser      current browser instance
   * @page         current page in browser
   * @flow         lighthouse flow object (used for measurements and report)
   * @configString desktop or mobile
   * @browserType  headless (docker) or headful (node.js)
   * @return       browser, page
  */
  async restartBrowser (browser, page, flow, configString, browserType) {
      console.log('KILLING BROWSER');
      await page.close();
      await browser.close();
      try {
        // ensure that your system/docker has these commands installed
        await exec("kill -9 $(ps -ef | grep chrome | awk '{print $2}')");
      }
      catch(error) {
        console.log("BROWSER KILLED (error was from not existent PID, but we catch it)");
      }
      return new BrowserActions().startBrowserWithLighthouse(configString, browserType, flow)
  }

  /**
   * Just closing browser
  */
  async closeBrowser (browser) {
      console.log('CLOSING BROWSER');
      await browser.close();
  }
}

module.exports = BrowserActions;
