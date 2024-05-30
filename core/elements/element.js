import logger from "../../logger/logger.js";

export default class Element {
    static DEFAULT_TIMEOUT = 60000;
    locator;
    element;
    locatorType;

    constructor(locator, page) {
        this.originalLocator = locator
        this.locator = locator
        this.page = page
        this.locatorType = (this.locator.startsWith("./") || this.locator.startsWith("/") || this.locator.startsWith("(")) ? "XPATH" : "CSS";
    }

    // Action: find element on page with timeout for operation
    async find(timeout = Element.DEFAULT_TIMEOUT) {
        logger.debug(`[FIND] ${this.locatorType}:${this.locator}`);
        switch (this.locatorType) {
            case "XPATH":
                this.element = await this.page.waitForSelector(`xpath/${this.locator}`, { visible: true, 'timeout': timeout });
                break;
            default:
                this.element = await this.page.waitForSelector(this.locator, { visible: true, 'timeout': timeout });
        }
        return this.element
    }

    // Hover method that reuses the find method
    async hover(timeout = Element.DEFAULT_TIMEOUT) {
        logger.debug(`[HOVER] ${this.locatorType}:${this.locator}`);
        // Use the existing find method to locate the element
        const element = await this.find(timeout);
        if (element) {
            await element.hover();
            logger.debug(`[HOVER] Successfully hovered over ${this.locatorType}:${this.locator}`);
        }
    }

    // Action: get element from list on page
    async findFromList(timeout = Element.DEFAULT_TIMEOUT, index) {
        logger.debug(`[FIND] ${this.locatorType}:${this.locator} -- index ${index}`);
        switch (this.locatorType) {
            case "XPATH":
                throw new Error("Not implemented yet");
            default:
                var elements = await this.page.$$(this.locator);
                this.element = elements[index]
        }
        return this.element
    }

    // Action: find hidden element on page with timeout for operation
    async findHidden(timeout = Element.DEFAULT_TIMEOUT) {
        logger.debug(`[FINDHIDDEN] ${this.locatorType}:${this.locator}`);
        switch (this.locatorType) {
            case "XPATH":
                this.element = await this.page.waitForSelector(`xpath/${this.locator}`, { hidden: true, 'timeout': timeout });
                break;
            default:
                this.element = await this.page.waitForSelector(this.locator, { hidden: true, 'timeout': timeout });
        }
        return this.element
    }

    // Action: count number of elements
    async count() {
        let elements = [];
        switch (this.locatorType) {
            case "XPATH":
                elements = await this.page.$$(`xpath/${this.locator}`);
                logger.debug(`[COUNT] Found ${elements.length} elements for XPath: ${this.locator}`);
                break;
            case "CSS":
                elements = await this.page.$$(this.locator);
                logger.debug(`[COUNT] Found ${elements.length} elements for CSS: ${this.locator}`);
                break;
            default:
                logger.debug(`[COUNT] You shouldn't be here`);
                return 0;
        }
        return elements.length;
    }

    // Action: replace % in selector with actual data and return context for chaining
    replace(text) {
        logger.debug(`[REPLACE] ${this.locatorType}:${this.originalLocator}`);
        this.locator = this.originalLocator.replace(/%/g, text)
        logger.debug(`[REPLACE] ${this.locatorType}:${this.locator}`);
        return this;
    }
}
