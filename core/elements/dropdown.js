import logger from "lh-pptr-framework/logger/logger.js";
import Element from 'lh-pptr-framework/core/elements/element.js';

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

    // Action: Select specific "option" based on value from "select" element
    async selectOptionByValue(optionValue, timeout=Element.DEFAULT_TIMEOUT) {
        logger.debug(`[SELECT] ${this.locator}`);

        try {
            await this.find(timeout);
            await this.page.$eval(this.locator, element => element.click());
            let options = await this.page.$eval(this.locator, element => Array.from(element.options).map(option => option.value));
            logger.debug(`[SELECT] available options: ${options}`);
            if (options.includes(optionValue)) {
                logger.debug(`[SELECT] chosen value: ${optionValue}`);
                await this.page.select(this.locator, optionValue);
            } else {
                throw new Error(`Option with value "${optionValue}" not found`);
            }
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }
}