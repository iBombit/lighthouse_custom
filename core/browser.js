const puppeteer = require('puppeteer');
const logger = require("../logger/logger");
const Browser = require('../settings/browser');
const lighthouse = require('lighthouse/lighthouse-core/fraggle-rock/api.js');
const exec = require('child_process').exec;
// settings
const LightHouse = require('../settings/lightHouse');


class LighthouseBrowser {
    browser;
    page;
    flow;
    // Launch browser of browserType (allowed options: mobile, desktop)
    // headless is a boolean, if true, browser will be launched in headless mode
    constructor(browserType, headless=false) {
        this.browserType = browserType;
        this.headless = headless;
    }

    async init() {
        switch (this.browserType) {
            case "mobile": {
                this.browser = await puppeteer.launch(this.headless ? new Browser().headlessMobile : new Browser().headfulMobile);
                break;
            }
            case "desktop": {
                this.browser = await puppeteer.launch(this.headless ?  new Browser().headlessDesktop : new Browser().headfulDesktop);
                break;
            }
            default: {
                throw new Error('browserType is not correct! Needs to be mobile or desktop, received: ' + browserType);
            }
        }
    }

    // Action: Start browser with LightHouse flow
    async start() {
        this.page = await this.browser.newPage();
        if (! this.flow) {
            await this.startNewLighthouseFlow();
        } else {
            await this.updateLighthouseFlow();
        }
    }


    // Action: Restart browser with LightHouse flow
    async restartBrowser() {
        logger.debug('KILLING BROWSER');
        await this.page.close();
        await this.browser.close();
        try {
            // ensure that your system/docker has these commands installed
            exec("kill -9 $(ps -ef | grep chrome | awk '{print $2}')");
        } catch (error) {
            logger.debug("BROWSER KILLED (error was from not existent PID, but we catch it)");
        }
        this.init()
        this.start()
    }

    // Action: Create new LH flow object. Should be executed only once during first lauch
    async startNewLighthouseFlow() {
        this.flow = await lighthouse.startFlow(this.page, this.browserType === "mobile" ? new LightHouse().configMobile : new LightHouse().configDesktop);
    }

    // Preserve LH flow report and config, set new page after restart
    async updateLighthouseFlow() {
        this.flow.options.page = this.page;
    }

    /** 
      Action: Get new page popup
      @browser current browser instance
     */
    static async getNewPageWhenLoaded() {
        return new Promise(x =>
            this.browser.on('targetcreated', async target => {
                if (target.type() === 'page') {
                    const newPage = await target.page();
                    const newPagePromise = new Promise(y =>
                        newPage.once('domcontentloaded', () => y(newPage))
                    );
                    const isPageLoaded = await newPage.evaluate(
                        () => document.readyState
                    );
                    newPage.isSuccess = true;
                    newPagePromise.isSuccess = true;
                    return isPageLoaded.match('complete|interactive') ?
                        x(newPage) :
                        x(newPagePromise);
                }
            })
        );
    };

    /** Action: measure cold navigation performance and assosite it with @name */ 
    async coldNavigation(name, link) {
        logger.debug(`[COLDNAV] Start:${name}`);
        if (!link) {
            link = this.page.url();
        }
        await this.flow.navigate(link, {stepName: name});
        logger.debug(`[COLDNAV] End:${name}`);
        await this.waitTillRendered();
    }

    /** Action: measure warm navigation performance and assosite it with @name */ 
    async warmNavigation(name, link) {
        logger.debug(`[WARMNAV] Start:${name}`);
        if (!link) {
            link = this.page.url();
        }
        await this.flow.navigate(link, {stepName: name, configContext: {settingsOverrides: {disableStorageReset: true}}});
        logger.debug(`[WARMNAV] End:${name}`);
        await this.waitTillRendered();
    }

    /** Action: Navigate to page @link */ 
    async goToPage(link) {
        logger.debug(`[GOTOPAGE] ${link}`);
        await this.page.goto(link);
        // loosing page context on multiple redirects, so wait 10sec before that...
        await this.page.waitForTimeout(10000);
        await this.waitTillRendered(); 
    }

    /**
     * Create iframe with success status
     * @selector CSS selector for iframe
     * @scope    current scope (page in browser or other iframe)
    */
    async createIframe(selector, scope) {
        logger.debug(`[IFRAME] create via CSS ${selector} in ${scope}`);
        let frameHandle = await scope.$(selector);
        let frame = await frameHandle.contentFrame();
        //each time we create a new frame we need to set status as sucess
        //If it fails in "actions" -- it will skip other actions within this frame
        frame.isSuccess = true;
        return frame;
      }

    /** Action: wait for page to render completely */
    async waitTillRendered(timeout = 30000) {
        const checkDurationMsecs = 1000;
        const maxChecks = timeout / checkDurationMsecs;
        let lastHTMLSize = 0;
        let checkCounts = 1;
        let countStableSizeIterations = 0;
        const minStableSizeIterations = 3;

        while(checkCounts++ <= maxChecks){
        let html = await this.page.content();
        let currentHTMLSize = html.length;

        //let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
        //logger.debug('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

        if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
            countStableSizeIterations++;
        else
            countStableSizeIterations = 0; //reset the counter

        if(countStableSizeIterations >= minStableSizeIterations) {
            logger.debug(`[SUCCESS] Fully Rendered Page: ${this.page.url()}`);
            break;
        }

        lastHTMLSize = currentHTMLSize;
        await this.page.waitForTimeout(checkDurationMsecs);
        }
    }

    /** Action: Close browser */
    async closeBrowser(browser) {
        logger.debug('CLOSING BROWSER');
        await this.browser.close();
    }

    async beforeEachHanlder(timeout) {
    if (this.flow.currentTimespan !== undefined) {  // happens if waiting inside actions exceeds "testTime" timeout
        await this.flow.endTimespan() // stopping active timespan if not stopped by timeout
        this.page.isSuccess = false
        throw new Error(`Skipping test because previous flow exceeded testTime limit: ${timeout} seconds`);
    } else if (!this.page.isSuccess) 
        throw new Error('Skipping test because previous flow failed');
    }
    
}

module.exports = LighthouseBrowser;