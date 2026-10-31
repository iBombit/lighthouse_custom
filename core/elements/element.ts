import type { ElementHandle, Page as PuppeteerPage } from 'puppeteer-core';
import logger from "../../logger/logger.js";
import type { PageContext } from '../types.js';

/** XPath locators start with `./`, `/` or `(`; everything else is treated as CSS. */
export type LocatorType = "XPATH" | "CSS";

export default class Element {
    static DEFAULT_TIMEOUT = 60000;
    locator: string;
    /** Handle resolved by the last find* call (`null` when a hidden-wait resolved without an element). */
    element: ElementHandle | null | undefined;
    locatorType: LocatorType;
    /** Locator as passed to the constructor; `%` placeholders are substituted by {@link replace}. */
    originalLocator: string;
    page: PageContext;

    constructor(locator: string, page: PageContext) {
        this.originalLocator = locator
        this.locator = locator
        this.page = page
        this.locatorType = (this.locator.startsWith("./") || this.locator.startsWith("/") || this.locator.startsWith("(")) ? "XPATH" : "CSS";
    }

    /**
     * Top-level Puppeteer page owning {@link page}. Mouse and keyboard live on the
     * page, so actions on elements inside an iframe go through the frame's page.
     */
    protected get topLevelPage(): PuppeteerPage {
        return 'mouse' in this.page ? this.page : this.page.page();
    }

    // Action: find element on page with timeout for operation
    async find(timeout: number = Element.DEFAULT_TIMEOUT): Promise<ElementHandle | null | undefined> {
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
    async hover(timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[HOVER] ${this.locatorType}:${this.locator}`);
        // Use the existing find method to locate the element
        const element = await this.find(timeout);
        if (element) {
            await element.hover();
            logger.debug(`[HOVER] Successfully hovered over ${this.locatorType}:${this.locator}`);
        }
    }

    // Action: get element from list on page
    // (`_timeout` is unused — the elements are read immediately — but kept so the positional signature stays the same)
    async findFromList(_timeout: number = Element.DEFAULT_TIMEOUT, index: number): Promise<ElementHandle | null | undefined> {
        logger.debug(`[FIND] ${this.locatorType}:${this.locator} -- index ${index}`);
        switch (this.locatorType) {
            case "XPATH":
                throw new Error("Not implemented yet");
            default: {
                const elements = await this.page.$$(this.locator);
                this.element = elements[index]
            }
        }
        return this.element
    }

    // Action: find hidden element on page with timeout for operation
    async findHidden(timeout: number = Element.DEFAULT_TIMEOUT): Promise<ElementHandle | null | undefined> {
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
    async count(): Promise<number> {
        let elements: ElementHandle[] = [];
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
    replace(text: string | number): this {
        logger.debug(`[REPLACE] ${this.locatorType}:${this.originalLocator}`);
        this.locator = this.originalLocator.replace(/%/g, String(text))
        logger.debug(`[REPLACE] ${this.locatorType}:${this.locator}`);
        return this;
    }
}
