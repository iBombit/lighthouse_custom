// Import statements instead of require()
import LighthouseBrowser from 'lh-pptr-framework/core/browser.js';
import CreateReport from 'lh-pptr-framework/reporting/createReport.js';
import logger from "lh-pptr-framework/logger/logger.js";

class Crawler {
    constructor(browserType, headless, startURL, maxDepth = 2, timeout) {
        this.browserType = browserType;
        this.browser = new LighthouseBrowser(browserType, headless);
        this.pages = [];
        this.links = [];
        this.maxDepth = maxDepth;
        this.startURL = startURL;
        this.host = new URL(startURL).host;
        this.visited = [];
    }

    async init() {
        await this.browser.init();
        await this.browser.start();
    }
    
    async crawl(depth = 0, url) {
        logger.debug(depth);
        if (depth > this.maxDepth) return false;
        if (!url) url = this.startURL;
        await this.browser.coldNavigation(new URL(url).pathname, url);
        await this.browser.waitTillRendered();
        this.visited.push(new URL(url).pathname);
        var links = await this.browser.page.$$eval('*[href]:not(link)', links => links.map(link => link.href));
        for (var link of links) {
            try {
                var urlParse = new URL(link);
                logger.debug(link);
                if (urlParse.host == this.host && !this.visited.includes(urlParse.pathname) && !urlParse.pathname.endsWith('pdf')) {
                    await this.crawl(depth + 1, link);
                }
            } catch(e) {
                logger.debug(`Invalid link: ${link}`);
            }
        }
    }
    
    async report() {
        await new CreateReport().createReports(this.browser.flow, this.browserType);
        await this.browser.closeBrowser();
    }
}

// Initialization code
// Note the asynchronous handling using async IIFE (Immediately Invoked Function Expression)
(async () => {
    var crawler = new Crawler("desktop", false, "https://onliner.by/", 2, 30000);
    await crawler.init();
    await crawler.crawl();
    await crawler.report();
    logger.debug(crawler.visited);
})();
