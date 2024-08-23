import Page from "core-module/page.js";
import Button from "core-module/elements/button.js";
import TextField from "core-module/elements/textField.js";

export default class HomePage extends Page {
    constructor(page) {
        super(page)
        this.setPath('/');
    }

    init(page) {
        super.init(page)
        this.elements = new Button('//h5[text()="Elements"]', page)
        this.forms = new Button('//h5[text()="Forms"]', page)
        this.alertsFrameWindows = new Button('//h5[text()="Alerts, Frame & Windows"]', page)
        this.widgets = new Button('//h5[text()="Widgets"]', page)
        this.interactions = new Button('//h5[text()="Interactions"]', page)
        this.bookStoreApplication = new Button('//h5[text()="Book Store Application"]', page)
        this.changes = new TextField('//h5[text()="Book Store Application"]', page)
    }

    /**
    @example
    // Given: I am on the Home page
    // When: I click on "Elements"
    // Then: I wait for the new page to be rendered
    // And: I stop measuring action time performance of the page
    */
    async clickOnElements(browser) {
        await browser.timespan("Click on 'Elements'", async () => {
            await this.elements.count()
            await this.elements.click()
            await browser.waitTillRendered()
        })
    }

}