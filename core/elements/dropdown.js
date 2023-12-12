import logger from "../../logger/logger.js";
import Element from './element.js';

export default class Dropdown extends Element {
    page;

    constructor(locator, page){
        super(locator, page);
        this.page = page;
    }

    // Action: Select random "option" from "select" element
    async selectRandom(timeout=Element.DEFAULT_TIMEOUT) {
        logger.debug(`[SELECT] ${this.locator}`);

        try {
            await this.find(timeout);
            await this.page.$eval(this.locator, element => element.click());
            let totalCount = await this.page.$eval(this.locator, element => element.options.length);
            logger.debug(`[SELECT] totalCount of options: ${totalCount}`);
            let num = Math.floor(Math.random() * totalCount);
            logger.debug(`[SELECT] chosen option num: ${num}`);
            let value = await this.page.$eval(this.locator, (element, num) => element.options[num].value, num);
            logger.debug(`[SELECT] chosen value: ${value}`);
            await this.page.select(this.locator, value);
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    // Action: Select specific "option" from "select" element
    async selectNthOption(option, timeout=Element.DEFAULT_TIMEOUT) {
        logger.debug(`[SELECT] ${this.locator}`);

        try {
            await this.find(timeout);
            await this.page.$eval(this.locator, element => element.click());
            let totalCount = await this.page.$eval(this.locator, element => element.options.length);
            logger.debug(`[SELECT] totalCount of options: ${totalCount}`);
            let num = option;
            logger.debug(`[SELECT] chosen option num: ${num}`);
            let value = await this.page.$eval(this.locator, (element, num) => element.options[num].value, num);
            logger.debug(`[SELECT] chosen value: ${value}`);
            await this.page.select(this.locator, value);
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

}