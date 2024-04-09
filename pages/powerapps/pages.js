import Page from "../../core/page.js";
import Button from "../../core/elements/button.js";
import Element from "../../core/elements/element.js";
import Iframe from "../../core/elements/iframe.js";

export default class PowerApps extends Page {
    constructor(page) {
        super(page);
    }

    init(page) {
        super.init(page);
        this.url = "https://apps.powerapps.com/play/e/default-b41b72d0-4e9f-4c26-8a69-f949f367c91d/a/4f3abb6f-5e6a-4e4a-b3b2-09123d78a5f7?tenantId=b41b72d0-4e9f-4c26-8a69-f949f367c91d&source=portal/";

        this.appFrame = new Iframe("iframe[id='fullscreen-app-host']", page);
        this.marketing = new Button('(//*[@data-control-name="Button3"])[1]', page);
        this.marketingHeader = new Element("[data-control-name='TextBox1_13']", page);
        this.teamsIcon = new Button("#AddToTeamsButton", page);
    }

    async  clickOnMarketing(browser) {
        await browser.timespan("Click on 'marketing'", async () => {
            this.init(await this.appFrame.createIframe());
            await this.marketing.click();
            await this.marketingHeader.find();
            await browser.waitTillRendered();
        })
    }

    async checkTeamsPage(browser) {
        this.init(browser.page);
        await this.teamsIcon.click();
        let newPage = await browser.getNewPageWhenLoaded();
        await this.coldNavigation(newPage.url());
    }
}