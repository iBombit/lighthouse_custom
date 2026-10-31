import logger from "../../logger/logger.js";
import Element from './element.js';
import Button from './button.js';
const TYPE_KEY_BY_KEY_TIMEOUT = 100;

export default class TextField extends Button {

    // Action: type text in text field
    async type(text: string, timeout: number = Element.DEFAULT_TIMEOUT, delay: number = TYPE_KEY_BY_KEY_TIMEOUT): Promise<void> {
        logger.debug(`[TYPE] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            await this.element!.type(text, { delay: delay });
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw error;
        }
    }

    // Action: clear text field
    async clear(timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[CLEAR] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            // Triple click selects the whole value. Puppeteer >= 22 takes the number of clicks as `count`.
            await this.element!.click({ count: 3 })
            await this.element!.type(" ");
            await this.topLevelPage.keyboard.press('Backspace');
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error as string);
        }
    }

}
