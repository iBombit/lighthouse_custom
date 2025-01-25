import Page from "lh-pptr-framework/core/page.js";
import Button from "lh-pptr-framework/core/elements/button.js";
import Element from "lh-pptr-framework/core/elements/element.js";

export default class ButtonsPage extends Page {
    constructor(page) {
        super(page)
        this.setPath('buttons');
    }

    init(page) {
        super.init(page)
        this.clickBtn = new Button("//button[text()='Click Me']", page)
        this.clickVerify = new Element("#dynamicClickMessage", page)
        this.doubleClickBtn = new Button("//button[text()='Double Click Me']", page)
        this.doubleClickVerify = new Element("#doubleClickMessage", page)
        this.rightClickBtn = new Button("//button[text()='Right Click Me']", page)
        this.rightClickVerify = new Element("#rightClickMessage", page)
    }

    /**
    @example
    // Given: I am on the Main page "Buttons" section
    // When: I click on "Click Me" button
    // Then: I wait for click message to appear
    // And: I measure action time performance of the page
    */
    async simpleClickButton(browser) {
        await browser.timespan("Simple click button", async () => {
            await this.clickBtn.click()
            await this.clickVerify.find()
            await browser.waitTillRendered()
        })
    }

    /**
    @example
    // Given: I am on the Main page "Buttons" section
    // When: I double click on "Double Click Me" button
    // Then: I wait for click message to appear
    // And: I measure action time performance of the page
    */
    async doubleClickButton(browser) {
        await browser.timespan("Double click button", async () => {
            await this.doubleClickBtn.doubleClick()
            await this.doubleClickVerify.find()
            await browser.waitTillRendered()
        })
    }

    /**
    @example
    // Given: I am on the Main page "Buttons" section
    // When: I right click on "Right Click Me" button
    // Then: I wait for click message to appear
    // And: I measure action time performance of the page
    */
    async rightClickButton(browser) {
        await browser.timespan("Right click button", async () => {
            await this.rightClickBtn.rightClick()
            await this.rightClickVerify.find()
            await browser.waitTillRendered()
        })
    }

}