import puppeteer from 'puppeteer-core';
import logger from "../logger/logger.js";
import { Browser } from '../settings/browser.js';
import { startFlow } from 'lighthouse/core/index.js';
import { exec } from 'child_process';
import { configDesktop, configMobile } from '../settings/lighthouse.js';
import * as os from 'os';

class LighthouseBrowser {
  browser;
  page;
  flow;

  constructor(browserType="desktop", headless=false, browserLocation=os.type()) {
    this.browserType = browserType;
    this.headless = headless;
    this.browserLocation = browserLocation;
  }

  async init() {
    this.headless ? logger.debug(`[${this.browserType.toUpperCase()}] Starting HEADLESS browser (${this.browserLocation})`) : logger.debug(`[${this.browserType.toUpperCase()}] Starting HEADFUL browser (${this.browserLocation})`)
    switch (this.browserType) {
        case "mobile": {
            this.browser = await puppeteer.launch(this.headless ? new Browser(this.browserLocation).headlessMobile : new Browser(this.browserLocation).headfulMobile);
            break;
        }
        case "desktop": {
            this.browser = await puppeteer.launch(this.headless ?  new Browser(this.browserLocation).headlessDesktop : new Browser(this.browserLocation).headfulDesktop);
            break;
        }
        default: {
            throw new Error('browserType is not correct! Needs to be mobile or desktop, received: ' + browserType);
        }
    }
  }

  async start() {
    this.page = await this.browser.newPage();
    if (! this.flow) {
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
    //this.flow = await startFlow(this.page, this.browserType === "mobile" ? new LightHouse().configMobile : new LightHouse().configDesktop);
    this.flow = await startFlow(this.page, this.browserType === "mobile" ? {config: configMobile,} : {config: configDesktop,});
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

  async coldNavigation(name, link) {
    logger.debug(`[COLDNAV] Start:${name}`);
    if (!link) {
        link = this.page.url();
    }
    try {
      await this.flow.navigate(link, { name: name });
    } catch (error) {
      throw new Error(error);
    }
    logger.debug(`[COLDNAV] End:${name}`);
    await this.waitTillRendered();
  }

  async warmNavigation(name, link) {
    logger.debug(`[WARMNAV] Start:${name}`);
    if (!link) {
        link = this.page.url();
    }
    await this.flow.navigate(link, { name: name, configContext: {settingsOverrides: {disableStorageReset: true}}});
    logger.debug(`[WARMNAV] End:${name}`);
    await this.waitTillRendered();
  }

  async goToPage(link) {
    logger.debug(`[GOTOPAGE] ${link}`);
    await this.page.goto(link);
    await this.page.waitForTimeout(10000);
    await this.waitTillRendered(); 
  }

  async waitTillRendered(timeout = 30000) {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;

    while(checkCounts++ <= maxChecks) {
        let html = await this.page.content();
        let currentHTMLSize = html.length;

        if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) {
            countStableSizeIterations++;
        } else {
            countStableSizeIterations = 0; //reset the counter
        }

        if(countStableSizeIterations >= minStableSizeIterations) {
            logger.debug(`[SUCCESS] Fully Rendered Page: ${this.page.url()}`);
            break;
        }

        lastHTMLSize = currentHTMLSize;
        await this.page.waitForTimeout(checkDurationMsecs);
    }
  }

  async closeBrowser(browser) {
    logger.debug('CLOSING BROWSER');
    await this.browser.close();
  }

}

export default LighthouseBrowser;