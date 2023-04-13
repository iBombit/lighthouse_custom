const puppeteer = require('puppeteer');
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

    async start() {
        this.page = await this.browser.newPage();
        if (! this.flow) {
            await this.startNewLighthouseFlow();
        } else {
            await this.updateLighthouseFlow();
        }
    }
    
    async restartBrowser() {
        console.log('KILLING BROWSER');
        await this.page.close();
        await this.browser.close();
        try {
            // ensure that your system/docker has these commands installed
            exec("kill -9 $(ps -ef | grep chrome | awk '{print $2}')");
        } catch (error) {
            console.log("BROWSER KILLED (error was from not existent PID, but we catch it)");
        }
        this.init()
        this.start()
    }

    /**
     * Create new LH flow object. Should be executed only once during first lauch
     */
    async startNewLighthouseFlow() {
        this.flow = await lighthouse.startFlow(this.page, this.browserType === "mobile" ? new LightHouse().configMobile : new LightHouse().configDesktop);
    }

    /**
     * Preserve LH flow report and config, set new page after restart
     */
    async updateLighthouseFlow() {
        this.flow.options.page = this.page;
    }

    /**
     * Get new page popup
     * @browser current browser instance
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

    async coldNavigation(name, link) {
        console.log('Started: ' + name);
        if (!link) {
            link = this.page.url();
        }
        await this.flow.navigate(link, {stepName: name});
        console.log('Ended: ' + name);
        await this.waitTillRendered();
    }

    async goToPage(link) {
        console.log('Opening Link: ' + link);
        await this.page.goto(link);
        // loosing page context on multiple redirects, so wait 10sec before that...
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

        while(checkCounts++ <= maxChecks){
        let html = await this.page.content();
        let currentHTMLSize = html.length;

        //let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
        //console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

        if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
            countStableSizeIterations++;
        else
            countStableSizeIterations = 0; //reset the counter

        if(countStableSizeIterations >= minStableSizeIterations) {
            console.log("[SUCCESS] Fully Rendered Page: " + this.page.url());
            break;
        }

        lastHTMLSize = currentHTMLSize;
        await this.page.waitForTimeout(checkDurationMsecs);
        }
    }

    /**
     * Just closing browser
     */
    async closeBrowser(browser) {
        console.log('CLOSING BROWSER');
        await this.browser.close();
    }
    
}

module.exports = LighthouseBrowser;