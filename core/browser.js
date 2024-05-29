import puppeteer from 'puppeteer-core';
import logger from "../logger/logger.js";
import { Browser } from '../settings/browser.js';
import { startFlow } from 'lighthouse/core/index.js';
import { exec } from 'child_process';
import { configDesktop, configMobile, configMobile3G, configMobile4G, configMobile4GSlow } from '../settings/lighthouse.js';
import * as os from 'os';

class LighthouseBrowser {
  static DEFAULT_TIMEOUT = 30000;
  browser;
  page;
  flow;

  constructor(browserType = "desktop", headless = false, browserLocation = os.type()) {
    this.browserType = browserType;
    this.headless = headless;
    this.browserLocation = browserLocation;
  }

  async init() {
    this.headless ? logger.debug(`[${this.browserType.toUpperCase()}] Starting HEADLESS browser (${this.browserLocation})`) : logger.debug(`[${this.browserType.toUpperCase()}] Starting HEADFUL browser (${this.browserLocation})`)
    switch (this.browserType) {
      case "mobile": 
      case "mobile3G":
      case "mobile4G":
      case "mobile4GSlow":
      {
        this.browser = await puppeteer.launch(this.headless ? new Browser(this.browserLocation).headlessMobile : new Browser(this.browserLocation).headfulMobile);
        break;
      }
      case "desktop": {
        this.browser = await puppeteer.launch(this.headless ? new Browser(this.browserLocation).headlessDesktop : new Browser(this.browserLocation).headfulDesktop);
        break;
      }
      default: {
        throw new Error('browserType is not correct! Received: ' + browserType);
      }
    }
  }

  async start() {
    this.page = await this.browser.newPage();
    if (!this.flow) {
      await this.startNewLighthouseFlow();
    } else {
      await this.updateLighthouseFlow();
    }
  }

  async restartBrowser() {
    logger.debug('KILLING BROWSER');
    await this.page.close();
    await this.browser.close();
    try {
      // ensure that your system/docker has these commands installed
      exec("kill -9 $(ps -ef | grep chrome | awk '{print $2}')");
    } catch (error) {
      logger.debug("BROWSER KILLED (error was from non-existent PID, but we catch it)");
    }
    this.init()
    this.start()
  }

  async startNewLighthouseFlow() {
    const configMap = {
        "desktop": configDesktop,
        "mobile": configMobile,
        "mobile3G": configMobile3G,
        "mobile4G": configMobile4G,
        "mobile4GSlow": configMobile4GSlow
    };

    this.flow = await startFlow(this.page, { config: configMap[this.browserType] || configDesktop });
    //logger.debug("[FLOW] " + JSON.stringify(this.flow));
}

  async updateLighthouseFlow() {
    this.flow.options.page = this.page;
  }

  async getNewPageWhenLoaded() {
    return new Promise(x =>
      this.browser.on('targetcreated', async target => {
        if (target.type() === 'page') {
          const newPage = await target.page();
          const newPagePromise = new Promise(y =>
            newPage.once('domcontentloaded', () => y(newPage))
          );
          const isPageLoaded = await newPage.evaluate(() => document.readyState);
          newPage.isSuccess = true;
          newPagePromise.isSuccess = true;
          return isPageLoaded.match('complete|interactive') ?
            x(newPage) :
            x(newPagePromise);
        }
      })
    );
  }

  async coldNavigation(name, link, timeout = LighthouseBrowser.DEFAULT_TIMEOUT) {
    if (!link) {
      link = this.page.url();
    }
    try {
      await this.flow.navigate(link, { name: name });
    } catch (error) {
      throw new Error(error);
    }
    await this.waitTillRendered(timeout);
  }

  async warmNavigation(name, link, timeout = LighthouseBrowser.DEFAULT_TIMEOUT) {
    if (!link) {
      link = this.page.url();
    }
    await this.flow.navigate(link, { name: name, configContext: { settingsOverrides: { disableStorageReset: true } } });
    await this.waitTillRendered(timeout);
  }

  async timespan(stepName, actions) {
    await this.flow.startTimespan({ name: stepName })
    await actions();
    await this.flow.endTimespan()
  }

  async goToPage(link, timeout = LighthouseBrowser.DEFAULT_TIMEOUT) {
    logger.debug(`[GOTOPAGE] ${link}`);
    await this.page.goto(link);
    await new Promise(resolve => setTimeout(resolve, timeout));
    await this.waitTillRendered(timeout);
  }

  async waitTillRendered(timeout = LighthouseBrowser.DEFAULT_TIMEOUT) {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;

    while (checkCounts++ <= maxChecks) {
      let html = "PAGE UNKNOWN"
      try {
        html = await this.page.content();
      }
      catch (error) {
        logger.debug(error)
        break;
      }

      let currentHTMLSize = html.length;

      if (lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) {
        countStableSizeIterations++;
      } else {
        countStableSizeIterations = 0; //reset the counter
      }

      if (countStableSizeIterations >= minStableSizeIterations) {
        logger.debug(`[SUCCESS] Fully Rendered Page: ${this.page.url()}`);
        break;
      }

      lastHTMLSize = currentHTMLSize;
      await new Promise(resolve => setTimeout(resolve, checkDurationMsecs));
    }
  }

  async closeBrowser() {
    logger.debug('CLOSING BROWSER');
    await this.browser.close();
  }

}

export default LighthouseBrowser;