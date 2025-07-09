import * as params from 'lh-pptr-framework/settings/testParams.js';
import logger from "lh-pptr-framework/logger/logger.js";

export default class Page {
    static baseUrl = params.url;
    constructor() {
        this.path = '';
    }

    init(page) {
        this.p = page;
        this.p.isSuccess = true;
    }

    /**
     * @async
     * @function navigation
     * @param {object} browser - The browser instance.
     * @param {object} testContext - The Mocha test context (this).
     * @param {string} [link=this.getURL()] - The URL to navigate to.
     * @param {object} pages - Instance of all page objects to reinitialize after restart.
     * @throws {Error} - Throws an error if the navigation process fails.
     * @example
     * // Given: I am already on a website with some resources cached
     * // When: I am restarting browser and navigating to another page on the same website
     * // Then: I measure warm navigation performance of the page
     * await SomePage.navigation(this, browser, 'https://example.com/home', pages);
     */
    async navigation(browser, testContext, link = this.getURL(), pages) {
        const stepName = testContext?.test?.title || `[N]_${this.constructor.name}`;
        browser = await browser.navigation(stepName, link, pages)
        return browser;
    }

    /**
     * @async
     * @function navigationValidate
     * @param {object} browser - The browser instance.
     * @param {object} testContext - The Mocha test context (this).
     * @param {string} [link=this.getURL()] - The URL to navigate to.
     * @param {object} pages - Instance of all page objects to reinitialize after restart.
     * @throws {Error} - Throws an error if the navigation process fails.
     * @example
     * // Navigate to a page and validate it loaded correctly with pageValidate selector.
     * // Ensure that the pageValidate element is defined in the page object.
     * await SomePage.navigationValidate(browser, this, 'https://example.com/home', pages);
     */
    async navigationValidate(browser, testContext, link = this.getURL(), pages) {
        const stepName = testContext?.test?.title || `[N]_${this.constructor.name}`;
        browser = await browser.navigation(stepName, link, pages);
        try {
            if (this.pageValidate) {
                await this.pageValidate.find(5000);
                await browser.flow.snapshot({ name: stepName.replace('[N]_', '[S]_') + '_SUCCESS' });
            }
            else {
                logger.debug("[ERROR] Page validation element is not defined in the page object, snaphot checking is skipped.");
            }
        } catch (error) {
            await browser.flow.snapshot({ name: stepName.replace('[N]_', '[S]_') + '_FAILED' });
            throw new Error(`Page validation failed for ${link}: ${error.message}`);
        }
        return browser;
    }

    /**
     * @async
     * @function openURL
     * @param {object} browser - The browser instance.
     * @param {string} [link=this.getURL()] - The URL to navigate to. If not provided, defaults to the current page URL.
     * @param {number} [timeout=30000] - The timeout for navigation.
     * @throws {Error} When the browser is unable to navigate to the specified URL within the given timeout period.
     * @example
     * // Example usage: Simple navigation to a page without Lighthouse measurement
     * await SomePage.openURL(browser, 'https://example.com/home', 5000);
     */
    async openURL(browser, link = this.getURL(), timeout = 30000) {
        await browser.goToPage(link, timeout)
    }

    setPath(path = '') {
        this.path = path;
    }

    getURL() {
        // Ensure there's no double slash between base URL and path
        return `${Page.baseUrl.replace(/\/+$/, '')}/${this.path.replace(/^\/+/, '')}`;
    }

}