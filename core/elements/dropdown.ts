import logger from "../../logger/logger.js";
import Element from './element.js';

/** `<select>` wrapper. Uses CSS locators (option lookup goes through `$eval`). */
export default class Dropdown extends Element {

    // Action: Select random "option" from "select" element
    async selectRandom(timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[SELECT] ${this.locator}`);

        try {
            await this.find(timeout);
            await this.page.$eval(this.locator, element => (element as HTMLElement).click());
            const totalCount = await this.page.$eval(this.locator, element => (element as HTMLSelectElement).options.length);
            logger.debug(`[SELECT] totalCount of options: ${totalCount}`);
            const num = Math.floor(Math.random() * totalCount);
            logger.debug(`[SELECT] chosen option num: ${num}`);
            const value = await this.page.$eval(this.locator, (element, num) => (element as HTMLSelectElement).options[num].value, num);
            logger.debug(`[SELECT] chosen value: ${value}`);
            await this.page.select(this.locator, value);
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error as string);
        }
    }

    // Action: Select specific "option" from "select" element
    async selectNthOption(option: number, timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[SELECT] ${this.locator}`);

        try {
            await this.find(timeout);
            await this.page.$eval(this.locator, element => (element as HTMLElement).click());
            const totalCount = await this.page.$eval(this.locator, element => (element as HTMLSelectElement).options.length);
            logger.debug(`[SELECT] totalCount of options: ${totalCount}`);
            const num = option;
            logger.debug(`[SELECT] chosen option num: ${num}`);
            const value = await this.page.$eval(this.locator, (element, num) => (element as HTMLSelectElement).options[num].value, num);
            logger.debug(`[SELECT] chosen value: ${value}`);
            await this.page.select(this.locator, value);
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error as string);
        }
    }

    // Action: Select specific "option" based on value from "select" element
    async selectOptionByValue(optionValue: string, timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[SELECT] ${this.locator}`);

        try {
            await this.find(timeout);
            await this.page.$eval(this.locator, element => (element as HTMLElement).click());
            const options = await this.page.$eval(this.locator, element => Array.from((element as HTMLSelectElement).options).map(option => option.value));
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
            throw new Error(error as string);
        }
    }
}
