import * as params from '../settings/testParams.js';
import Button from './elements/button.js';
import TextField from './elements/textField.js';
import UploadField from './elements/uploadField.js';

export default class Page {
    static baseUrl = params.url;
    constructor() {
        this.path = '';
    }

    init(page) {
        this.p = page;
        this.p.isSuccess = true;
    }

    /** Register button @name located by @selector */
    btn(name, selector) {
        this[name] = new Button(selector, this.p);
        return this[name]
    }

    /** Register input @name located by @selector */
    input(name, selector) {
        this[name] = new TextField(selector, this.p);
        return this[name]
    }

    /** Register upload input @name located by @selector */
    upload(name, selector) {
        this[name] = new UploadField(selector, this.p);
        return this[name]
    }

    /**
     * @async
     * @function coldNavigation
     * @param {object} browser - The browser instance.
     * @param {string} [link=this.getURL()] - The URL to navigate to.
     * @param {number} [timeout=this.DEFAULT_TIMEOUT] - The maximum time to wait for navigation to complete. 
     * @throws {Error} Throws an error if navigation fails.
     * @example
     * // Given: I am opening the browser
     * // When: I am navigating to the Home page
     * // Then: I measure cold navigation performance of the page
     * await SomePage.coldNavigation(browser, 'https://example.com/home');
     */
    async coldNavigation(browser, link = this.getURL(), timeout = this.DEFAULT_TIMEOUT) {
        await browser.coldNavigation(`${this.constructor.name} - cold`, link, timeout)
    }

    /**
     * @async
     * @function warmNavigation
     * @param {object} browser - The browser instance.
     * @param {string} [link=this.getURL()] - The URL to navigate to.
     * @param {number} [timeout=this.DEFAULT_TIMEOUT] - The maximum time to wait for navigation to complete.
     * @throws {Error} - Throws an error if the navigation process fails.
     * @example
     * // Given: I am already on a website with some resources cached
     * // When: I am navigating to another page on the same website
     * // Then: I measure warm navigation performance of the page
     * await SomePage.warmNavigation(browser, 'https://example.com/home');
     */
    async warmNavigation(browser, link = this.getURL(), timeout = this.DEFAULT_TIMEOUT) {
        await browser.warmNavigation(`${this.constructor.name} - warm`, link, timeout)
    }
    /**
     * @async
     * @function openURL
     * @param {number} [timeout=this.DEFAULT_TIMEOUT] - The target URL for navigation. If not provided, defaults to the current page URL.
     * @throws {Error} When the browser is unable to navigate to the specified URL within the given timeout period.
     * @example
     * // Example usage: Navigating to the homepage with a custom timeout value
     * await SomePage.openURL(browser, 5000);
     */
    async openURL(browser, timeout = this.DEFAULT_TIMEOUT) {
        await browser.goToPage(this.getURL(), timeout)
    }

    setPath(path = '') {
        this.path = path;
    }

    getURL() {
        // Ensure there's no double slash between base URL and path
        return `${Page.baseUrl.replace(/\/+$/, '')}/${this.path.replace(/^\/+/, '')}`;
    }

    /** Action: close page */
    async close() {
        await this.p.close();
    }
}