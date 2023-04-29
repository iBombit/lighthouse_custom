const logger = require("../../settings/logger");
const Element = require('./element');

class Button extends Element {
    page;

    constructor(locator, page){
        super(locator, page);
        this.page = page;
    }


    // Action: click on button using JS click
    async jsClick(timeout=Element.DEFAULT_TIMEOUT){
        logger.debug(`jsClick into ${this.locator}`);
        try {
            await this.find(timeout);
            await this.page.$eval(this.locator, element => element.click());
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    // Action (Default): click on button using Puppeteer click
    async click(timeout=Element.DEFAULT_TIMEOUT){
        logger.debug(`click into ${this.locator}`);
        try {
            await this.find(timeout);
            await this.element.click();
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    // Action: double click on button using Puppeteer double click
    async dobleClick(timeout=Element.DEFAULT_TIMEOUT){
        logger.debug(`dobleClick into ${this.locator}`);
        try {
            await this.find(timeout);
            await this.element.click({clickCount: 2});
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    // Action: right click on button using Puppeteer right click
    async rightClick(timeout=Element.DEFAULT_TIMEOUT){
        logger.debug(`rightClick into ${this.locator}`);
        try {
            await this.find(timeout);
            await this.element.click({button: 'right',});
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

}

module.exports = Button;