import puppeteer from 'puppeteer-core';
import type { Browser as PuppeteerBrowser } from 'puppeteer-core';
import logger from '../logger/logger.js';
import { Browser } from '../settings/browser.js';
import { startFlow } from 'lighthouse/core/index.js';
import type { UserFlow } from 'lighthouse/core/user-flow.js';
import type * as LH from 'lighthouse/types/lh.js';
import { exec } from 'child_process';
import { getLighthouseConfigByBrowserType, getOnlyCategories, getOnlyCategoriesForMode } from '../settings/configLoader.js';
import type { BrowserType } from '../settings/constants.js';
import type { ReinitializablePage, StepActions, TrackedPage } from './types.js';
import * as os from 'os';

export type { BrowserType } from '../settings/constants.js';

/**
 * Step flags used for warm navigations. `configContext` is a pre-v10 Lighthouse
 * option that Lighthouse 13 ignores; it is still sent unchanged so the flags
 * stay identical to previous framework releases.
 */
type NavigationStepFlags = LH.UserFlow.StepFlags & {
  configContext?: { settingsOverrides?: Partial<LH.Config.Settings> };
};

/**
 * Orchestrates the Puppeteer browser and the Lighthouse user flow that measures it.
 * Lifecycle: `init()` launches the browser, `start()` opens a page and the flow.
 */
class LighthouseBrowser {
  static DEFAULT_TIMEOUT = 30000;
  browser!: PuppeteerBrowser;
  page!: TrackedPage;
  flow!: UserFlow;
  browserType: BrowserType;
  headless: boolean;
  browserLocation: string;

  constructor(browserType: BrowserType = 'desktop', headless = false, browserLocation: string = os.type()) {
    this.browserType = browserType;
    this.headless = headless;
    this.browserLocation = browserLocation;
  }

  async init(): Promise<void> {
    logger.debug(`[${this.browserType.toUpperCase()}] Starting ${this.headless ? 'HEADLESS' : 'HEADFUL'} browser (${this.browserLocation})`);
    switch (this.browserType) {
      case 'mobile':
      case 'mobile3G':
      case 'mobile4G':
      case 'mobile4GSlow':
        {
          this.browser = await puppeteer.launch(this.headless ? new Browser(this.browserLocation).headlessMobile : new Browser(this.browserLocation).headfulMobile);
          break;
        }
      case 'desktop': {
        this.browser = await puppeteer.launch(this.headless ? new Browser(this.browserLocation).headlessDesktop : new Browser(this.browserLocation).headfulDesktop);
        break;
      }
      default: {
        // Only reachable from untyped (JavaScript) callers.
        throw new Error('browserType is not correct! Received: ' + this.browserType);
      }
    }
  }

  async start(): Promise<void> {
    this.page = await this.browser.newPage();
    if (!this.flow) {
      await this.startNewLighthouseFlow();
    } else {
      await this.updateLighthouseFlow();
    }
  }

  /**
   * Kills & relaunches the browser (used by long tests to avoid OOM) and
   * re-binds the given page objects to the new Puppeteer page.
   */
  async restartBrowser(pages?: readonly ReinitializablePage[]): Promise<this> {
    logger.debug('KILLING BROWSER');
    await this.page.close();
    await this.browser.close();
    try {
      // ensure that your system/docker has these commands installed
      exec("kill -9 $(ps -ef | grep chrome | awk '{print $2}')");
    } catch {
      logger.debug("BROWSER KILLED (error was from non-existent PID, but we catch it)");
    }
    await this.init();
    await this.start();
    if (typeof pages != "undefined") {
      for (const page of pages) {
        page.init(this.page); // Sets instance of puppeteer page to page objects
      }
    }
    await new Promise(resolve => setTimeout(resolve, 10000)); // Assuming 10sec is enough to launch the browser
    return this;
  }

  async startNewLighthouseFlow(): Promise<void> {
    const config = getLighthouseConfigByBrowserType(this.browserType);
    this.flow = await startFlow(this.page, { config });
    logger.debug(`[FLOW] Lighthouse Flow started with config: ${JSON.stringify(config)}`);
  }

  async updateLighthouseFlow(): Promise<void> {
    this.flow._page = this.page;
  }

  /** Resolves with the next page (tab) opened by the browser once its DOM content is loaded. */
  async getNewPageWhenLoaded(): Promise<TrackedPage> {
    return new Promise<TrackedPage>(x =>
      this.browser.on('targetcreated', async target => {
        if (target.type() === 'page') {
          const newPage: TrackedPage = (await target.page())!;
          const newPagePromise: Promise<TrackedPage> & { isSuccess?: boolean } = new Promise<TrackedPage>(y =>
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

  /** Warm navigation measured by Lighthouse (storage is kept). Restarts the browser first when `pages` are given. */
  async navigation(name: string, link?: string, pages?: readonly ReinitializablePage[]): Promise<this> {
    if (pages) await this.restartBrowser(pages);
    if (!link) link = this.page.url();
    try {
      const flags: NavigationStepFlags = { name: name, configContext: { settingsOverrides: { disableStorageReset: true } } };
      const onlyCategories = getOnlyCategories();
      if (onlyCategories) flags.onlyCategories = onlyCategories;
      await this.flow.navigate(link, flags);
    } catch (error) {
      // Same wrapping as `new Error(error)` in plain JS: the message is the stringified error.
      throw new Error(error as string);
    }
    return this;
  }

  /** Measures a navigation triggered by `actions` (e.g. a click) as a Lighthouse navigation step. */
  async customNavigation(stepName: string, actions: StepActions, pages?: readonly ReinitializablePage[]): Promise<void> {
    if (pages) await this.restartBrowser(pages);
    const flags: LH.UserFlow.StepFlags = { name: stepName };
    const onlyCategories = getOnlyCategories();
    if (onlyCategories) flags.onlyCategories = onlyCategories;
    await this.flow.startNavigation(flags);
    await actions();
    await this.flow.endNavigation();
  }

  /** Measures `actions` as a Lighthouse timespan step. */
  async timespan(stepName: string, actions: StepActions): Promise<void> {
    const flags: LH.UserFlow.StepFlags = { name: stepName };
    const onlyCategories = getOnlyCategories();
    if (onlyCategories) flags.onlyCategories = onlyCategories;
    await this.flow.startTimespan(flags);
    await actions();
    await this.flow.endTimespan();
  }

  /** Takes a Lighthouse snapshot of the current page state. */
  async snapshot(flags: LH.UserFlow.StepFlags = {}): Promise<void> {
    const onlyCategories = getOnlyCategoriesForMode('snapshot');
    if (onlyCategories) flags.onlyCategories = onlyCategories;
    await this.flow.snapshot(flags);
  }

  /** Plain Puppeteer navigation (not measured), followed by {@link waitTillRendered}. */
  async goToPage(link: string, timeout: number = LighthouseBrowser.DEFAULT_TIMEOUT): Promise<void> {
    logger.debug(`[GOTOPAGE] ${link}`);
    await this.page.goto(link);
    await new Promise(resolve => setTimeout(resolve, timeout));
    await this.waitTillRendered(timeout);
  }

  /** Polls the page HTML size once per second until it is stable for 3 consecutive checks (or `timeout` elapses). */
  async waitTillRendered(timeout: number = LighthouseBrowser.DEFAULT_TIMEOUT): Promise<void> {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;

    while (checkCounts++ <= maxChecks) {
      let html = "PAGE UNKNOWN";
      try {
        html = await this.page.content();
      }
      catch (error) {
        logger.debug(error);
        break;
      }

      const currentHTMLSize = html.length;

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

  async closeBrowser(): Promise<void> {
    logger.debug('CLOSING BROWSER');
    await this.browser.close();
  }

}

export default LighthouseBrowser;
