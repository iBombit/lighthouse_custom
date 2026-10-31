import logger from "../../logger/logger.js";
import Element from './element.js';

export default class Button extends Element {

    // Action: click on button using JS click
    async jsClick(timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[JSCLICK] ${this.locatorType}:${this.locator}`);
        try {
            const element = await this.find(timeout);
            await this.page.evaluate(element => (element as HTMLElement).click(), element);

        } catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error as string);
        }
    }

    async jsClickHidden(timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[JSCLICK] ${this.locatorType}:${this.locator}`);
        try {
            const element = await this.findHidden(timeout);
            await this.page.evaluate(element => (element as HTMLElement).click(), element);

        } catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error as string);
        }
    }

    // Action (Default): click on button using Puppeteer click
    async click(timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[CLICK] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            await this.element!.click();
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error as string);
        }
    }

    // Action: double click on button using Puppeteer double click
    async doubleClick(timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[DOUBLECLICK] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            // Puppeteer >= 22 takes the number of clicks as `count` (the former `clickCount` is ignored).
            await this.element!.click({ count: 2 });
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error as string);
        }
    }

    // Action: right click on button using Puppeteer right click
    async rightClick(timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[RIGHTCLICK] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            await this.element!.click({ button: 'right', });
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error as string);
        }
    }

    // Action: click on element if present, otherwise do not fail
    async clickIfAvailable(timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[CLICKIFAVAILABLE] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            await this.element!.click();
            logger.debug(`[CLICK] ${this.locatorType}:${this.locator} found and clicked`);
        }
        catch {
            logger.debug(`[SKIPPED] ${this.locatorType}:${this.locator} not available, skipping...`);
        }
    }

    // Action: click and hold on button
    async clickAndHold(timeout: number = Element.DEFAULT_TIMEOUT, holdTime = 2000): Promise<void> {
        logger.debug(`[CLICKANDHOLD] ${this.locatorType}:${this.locator}`);
        try {
            await this.find(timeout);
            const box = (await this.element!.boundingBox())!; // Move the mouse to the element's position
            const mouse = this.topLevelPage.mouse;
            await mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await mouse.down();
            await new Promise(resolve => setTimeout(resolve, holdTime));
            await mouse.up();
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error as string);
        }
    }

}
