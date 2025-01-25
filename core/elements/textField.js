import logger from "lh-pptr-framework/logger/logger.js";
import Element from 'lh-pptr-framework/core/elements/element.js';
import Button from 'lh-pptr-framework/core/elements/button.js';
const TYPE_KEY_BY_KEY_TIMEOUT = 100;

export default class TextField extends Button {
    page;
    
    constructor(locator, page){
        super(locator, page);
        this.page = page;
    }

    // Action: type text in text field
    async type(text, timeout=Element.DEFAULT_TIMEOUT, delay=TYPE_KEY_BY_KEY_TIMEOUT){
        logger.debug(`[TYPE] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            await this.element.type(text, {delay: delay});
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw error;
        }
    }

    // Action: clear text field
    async clear(timeout=Element.DEFAULT_TIMEOUT){
        logger.debug(`[CLEAR] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            await this.element.click({ clickCount: 3 })
            await this.element.type(" ");
            await this.page.keyboard.press('Backspace');
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }
    
}