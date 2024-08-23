import Page from "core-module/page.js";
import TextField from "core-module/elements/textField.js";
import Button from "core-module/elements/button.js";
import Element from "core-module/elements/element.js";

export default class TextBoxPage extends Page {
    constructor(page) {
        super(page)
        this.setPath('text-box');
    }

    init(page) {
        super.init(page)
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
    async submitTextForm(browser) {
        await this.fullName.type("UI TESTER")
        await this.userEmail.type("ui_tester@gmail.com")
        await this.currentAddress.type("mars, musk st., 39 apt., twitter")
        await this.permanentAddress.type("earth, UK, cotswolds, clarkson's farm")

        await browser.timespan("Submit text box form", async () => {
            await this.submit.click()
            await this.textBoxVerify.find()
            await browser.waitTillRendered()
        })
    }

}