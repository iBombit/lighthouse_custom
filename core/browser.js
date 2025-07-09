import puppeteer from 'puppeteer-core';
import logger from "lh-pptr-framework/logger/logger.js";
import { Browser } from 'lh-pptr-framework/settings/browser.js';
import { startFlow } from 'lighthouse/core/index.js';
import { exec } from 'child_process';
import { getConfigByBrowserType } from 'lh-pptr-framework/settings/lighthouse.js';
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

  async restartBrowser(pages) {
    logger.debug('KILLING BROWSER');
    await this.page.close();
    await this.browser.close();
    try {
      // ensure that your system/docker has these commands installed
      exec("kill -9 $(ps -ef | grep chrome | awk '{print $2}')");
    } catch (error) {
      logger.debug("BROWSER KILLED (error was from non-existent PID, but we catch it)");
    }
    await this.init()
    await this.start()
    if (typeof pages != "undefined") {
      for (const page of pages) {
        page.init(this.page); // Sets instance of puppeteer page to page objects
      }
    }
    await new Promise(resolve => setTimeout(resolve, 10000)); // Assuming 10sec is enough to launch the browser
    return this
  }

  async startNewLighthouseFlow() {
    const config = getConfigByBrowserType(this.browserType);
    this.flow = await startFlow(this.page, { config });
    logger.debug(`[FLOW] Lighthouse Flow started with config: ${JSON.stringify(config)}`);
  }

  async updateLighthouseFlow() {
    this.flow._page = this.page;
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

  async navigation(name, link, pages) {
    if (pages) await this.restartBrowser(pages)
    if (!link) link = this.page.url();
    try {
      await this.flow.navigate(link, { name: name, configContext: { settingsOverrides: { disableStorageReset: true } } });
    } catch (error) {
      throw new Error(error);
    }
    return this;
  }

  async customNavigation(stepName, actions, pages) {
    if (pages) await this.restartBrowser(pages)
    await this.flow.startNavigation({ name: stepName })
    await actions();
    await this.flow.endNavigation()
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