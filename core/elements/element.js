const logger = require("../../settings/logger");

class Element {
    static DEFAULT_TIMEOUT = 5000;
    locator;
    element;
    locatorType;

    constructor(locator, page){
        this.locator = locator
        this.page = page
        this.locatorType = this.locator.startsWith("/") ? "xpath" : "css";
    }

    // Action: find element on page with timeout for operation
    async find(timeout){
        logger.debug(`[${this.locatorType}] looking for ${this.locator}`);
        switch(this.locatorType){
            case "xpath":
                this.element = await this.page.waitForXPath(this.locator, {visible: true, 'timeout': timeout});
                break;
            default:
                this.element = await this.page.waitForSelector(this.locator, {visible: true, 'timeout': timeout});
        }
        return this.element    
    }

    // Action: get element from list on page
    async findFromList(timeout, index){
        logger.debug(`[${this.locatorType}] looking for ${this.locator} -- index ${index}`);
        switch(this.locatorType){
            case "xpath":
                throw new Error("Not implemented yet");
            default:
                var elements = await this.page.$$(this.locator);
                this.element = elements[index]
        }
        return this.element
    }

    // Action: find hidden element on page with timeout for operation
    async findHidden(timeout){
        logger.debug(`[${this.locatorType}] looking for ${this.locator}`);
        switch(this.locatorType){
            case "xpath":
                this.element = await this.page.waitForXPath(this.locator, {hidden: true, 'timeout': timeout});
                break;
            default:
                this.element = await this.page.waitForSelector(this.locator, {hidden: true, 'timeout': timeout});
        }
        return this.element
    }
}

module.exports = Element;