import logger from "../../logger/logger.js";
import Element from './element.js';

export default class Button extends Element {
    page;

    constructor(locator, page){
        super(locator, page);
        this.page = page;
    }


    // Action: click on button using JS click
    async jsClick(timeout = Element.DEFAULT_TIMEOUT) {
        logger.debug(`[JSCLICK] ${this.locatorType}:${this.locator}`);
        try {
            const element = await this.find(timeout);
            await this.page.evaluate(element => element.click(), element);
    
        } catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    async jsClickHidden(timeout = Element.DEFAULT_TIMEOUT) {
        logger.debug(`[JSCLICK] ${this.locatorType}:${this.locator}`);
        try {
            const element = await this.findHidden(timeout);
            await this.page.evaluate(element => element.click(), element);
    
        } catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    // Action (Default): click on button using Puppeteer click
    async click(timeout=Element.DEFAULT_TIMEOUT){
        logger.debug(`[CLICK] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            await this.element.click();
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    // Action: double click on button using Puppeteer double click
    async doubleClick(timeout=Element.DEFAULT_TIMEOUT){
        logger.debug(`[DOUBLECLICK] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            await this.element.click({clickCount: 2});
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    // Action: right click on button using Puppeteer right click
    async rightClick(timeout=Element.DEFAULT_TIMEOUT){
        logger.debug(`[RIGHTCLICK] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            await this.element.click({button: 'right',});
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    // Action: click on element if present, otherwise do not fail
    async clickIfAvailable(timeout=Element.DEFAULT_TIMEOUT){
        logger.debug(`[CLICKIFAVAILABLE] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            await this.element.click();
            logger.debug(`[CLICK] ${this.locatorType}:${this.locator} found and clicked`);
        }
        catch (error) {
            logger.debug(`[SKIPPED] ${this.locatorType}:${this.locator} not available, skipping...`);
        }
    }

    // Action: click and hold on button
    async clickAndHold(timeout=Element.DEFAULT_TIMEOUT, holdTime = 2000){
        logger.debug(`[CLICKANDHOLD] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            const box = await this.element.boundingBox(); // Move the mouse to the element's position
            await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await this.page.mouse.down();
            await new Promise(resolve => setTimeout(resolve, holdTime));
            await this.page.mouse.up();
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

}