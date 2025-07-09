import Page from "lh-pptr-framework/core/page.js";
import Element from "lh-pptr-framework/core/elements/element.js";
import Button from "lh-pptr-framework/core/elements/button.js";
import TextField from "lh-pptr-framework/core/elements/textField.js";

export default class HomePage extends Page {
    constructor(page) {
        super(page)
        this.setPath('/');
    }

    init(page) {
        super.init(page)
        this.pageValidate = new Element('//h5[text()="Elements"]', page)
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
    async clickOnElements(browser, testContext) {
        await browser.timespan(`${testContext?.test?.title}`, async () => {
            await this.elements.count()
            await this.elements.click()
            await browser.waitTillRendered()
        })
    }

}