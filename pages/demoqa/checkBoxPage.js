import Page from "lh-pptr-framework/core/page.js";
import Button from "lh-pptr-framework/core/elements/button.js";
import Element from "lh-pptr-framework/core/elements/element.js";

export default class CheckBoxPage extends Page {
    constructor(page) {
        super(page)
        this.setPath('checkbox');
    } 

    init(page) {
        super.init(page)
        this.homeCheckBox = new Button("label[for='tree-node-home']", page)
        this.homeSelectVerify = new Element("//*[@id='result']/span[text()='home']", page)
        this.checkBoxExpandHome = new Button("#tree-node > ol > li > span > button", page)
        this.checkBoxSelectVerify = new Element("//*[@id='result']/span[text()='public']", page)
        this.desktopCheckbox = new Button("//*[@id='tree-node']//span[text()='Desktop']", page)
        this.desktopCheckboxVerify = new Element("//*[@id='result']/span[text()='desktop']", page)
    }

    /**
    @example
    // Given: I am on the Main page "CheckBox" section
    // When: I check 'Home' checkbox
    // Then: I wait for 'Home' checkbox to be selected
    // And: I measure action time performance of the page
    */
    async selectHomeCheckbox(browser) {
        await browser.timespan("Select 'Home' checkBox", async () => {
            await this.homeCheckBox.click()
            await this.homeSelectVerify.find()
            await browser.waitTillRendered()
        })
    }
    /**
    @example
    // Given: I am on the Main page "CheckBox" section
    // And: 'Home' checkbox is selected
    // When: I expand 'Home' treeNode
    // Then: I wait for 'Home' treeNode to be expanded
    // And: I measure action time performance of the page
    */
    async expandHomeTreeNode(browser) {
        await browser.timespan("Expand 'Home' treeNode", async () => {
            await this.checkBoxExpandHome.click()
            await this.checkBoxSelectVerify.find()
            await browser.waitTillRendered()
        })
    }
    /**
    @example
    // Given: I am on the Main page "CheckBox" section
    // And: 'Home' checkbox is selected
    // And: 'Home' treeNode is expanded
    // When: I uncheck 'Desktop' checkbox
    // Then: I wait for 'Desktop' checkbox to be deselected
    // And: I measure action time performance of the page
    */
    async deselectDesktopCheckbox(browser) {
        await browser.timespan("Deselect 'Desktop' checkBox", async () => {
            await this.desktopCheckbox.click()
            await this.desktopCheckboxVerify.findHidden()
            await browser.waitTillRendered()
        })
    }

}