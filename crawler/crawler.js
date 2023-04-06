const Page = require('../core/page');
const LighthouseBrowser = require('../core/browser');
const CreateReport = require('../reporting/createReport');


class Crawler {
    constructor(browserType, headless, startURL, maxDepth=2, timeout) {
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
    
    async crawl(depth=0, url) {
        console.log(depth)
        if (depth > this.maxDepth) return false
        if (!url) url = this.startURL
        await this.browser.coldNavigation(new URL(url).pathname, url)
        await this.browser.waitTillRendered()
        this.visited.push(new URL(url).pathname)
        var links = await this.browser.page.$$eval('*[href]:not(link)', links => links.map(link => link.href));
        for (var link of links) {
            try{
                var urlParse = new URL(link)
                console.log(link)
                if (urlParse.host == this.host && !this.visited.includes(urlParse.pathname) && !urlParse.pathname.endsWith('pdf')) {
                    await this.crawl(depth + 1, link)
                }
            } catch(e) {
                console.log(`Invalid link: ${link}`)
            }
        }
    }
    async report() {
        await new CreateReport().createReports(this.browser.flow, this.browserType)
        await this.browser.closeBrowser();
    }
}

var crawler = new Crawler("desktop", false, "https://www.blueskystatistics.com/", 2, 30000)
crawler.init().then(() => crawler.crawl().then(() => crawler.report().then(() => console.log(crawler.visited))))