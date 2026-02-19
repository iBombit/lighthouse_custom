import Page from "lh-pptr-framework/core/page.js";
import TextField from "lh-pptr-framework/core/elements/textField.js";
import Button from "lh-pptr-framework/core/elements/button.js";
import Element from "lh-pptr-framework/core/elements/element.js";

export default class TextBoxPage extends Page {
    constructor(page) {
        super(page)
        this.setPath('text-box');
    }

    init(page) {
        super.init(page)
        this.pageValidate = new Element("input[id='userName']", page)
        this.fullName = new TextField("input[id='userName']", page)
        this.userEmail = new TextField("input[id='userEmail']", page)
        this.currentAddress = new TextField("textarea[id='currentAddress']", page)
        this.permanentAddress = new TextField("textarea[id='permanentAddress']", page)
        this.submit = new Button("button[id='submit']", page)
        this.textBoxVerify = new Element("//*[@id='output']//*[@id='permanentAddress' and contains(text(),'Address')]", page)
    }

    /**
    @example
    // Given: I am on the Main page "TextBox" section
    // When: I fill text box fields
    // Then: I click on "submit" button
    // And: I wait for "textBoxVerify" to be visible
    // And: I stop measuring action time performance of the page
    */
    async submitTextForm(browser, testContext) {
        await this.fullName.type("UI TESTER")
        await this.userEmail.type("ui_tester@gmail.com")
        await this.currentAddress.type("mars, musk st., 39 apt., twitter")
        await this.permanentAddress.type("earth, UK, cotswolds, clarkson's farm")

        await browser.timespan(`${testContext?.test?.title}`, async () => {
            await this.submit.click()
            await this.textBoxVerify.find()
            await browser.waitTillRendered()
        })
    }

}