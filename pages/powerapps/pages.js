import Page from "lh-pptr-framework/core/page.js";
import Button from "lh-pptr-framework/core/elements/button.js";
import Element from "lh-pptr-framework/core/elements/element.js";
import Iframe from "lh-pptr-framework/core/elements/iframe.js";

export default class PowerApps extends Page {
    constructor(page) {
        super(page);
        this.setPath('/');
    }

    init(page) {
        super.init(page);
        this.pageValidate = new Element("iframe[id='fullscreen-app-host']", page);
        this.appFrame = new Iframe("iframe[id='fullscreen-app-host']", page);
        this.marketing = new Button('(//*[@data-control-name="Button3"])[1]', page);
        this.marketingHeader = new Element("[data-control-name='TextBox1_13']", page);
        this.teamsIcon = new Button("#AddToTeamsButton", page);
    }

    async clickOnMarketing(browser, testContext) {
        await browser.timespan(`${testContext?.test?.title}`, async () => {
            this.init(await this.appFrame.createIframe());
            await this.marketing.click();
            await this.marketingHeader.find();
            await browser.waitTillRendered();
        })
    }

    async checkTeamsPage(browser, testContext) {
        this.init(browser.page);
        await this.teamsIcon.click();
        let newPage = await browser.getNewPageWhenLoaded();
        await this.navigation(browser, testContext, newPage.url());
    }
}