import Button from './elements/button.js';
import TextField from './elements/textField.js';
import UploadField from './elements/uploadField.js';

export default class Page {
    constructor() { }

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

    async executeStep(options) {
        const {
          browserInstance,
          type,
          name,
          link = this.url,
          timeout = this.DEFAULT_TIMEOUT,
          actions,
        } = options;
    
        switch (type) {
            case 'coldNavigation':
                await browserInstance.coldNavigation(name, link, timeout);
                break;
            case 'warmNavigation':
                await browserInstance.warmNavigation(name, link, timeout);
                break;
            case 'timespan':
                if (typeof actions !== "function") {
                    throw new Error("actions must be a function");
                }
                await actions()
                break;
            default:
                throw new Error(`Unsupported step type: ${type}`);
        }
    }
    /**
     * Navigates to the specified page URL in a "cold" state, simulating the scenario of a user 
     * opening the page for the first time without any cached resources.
     * This function is used to measure the cold navigation performance of the page.
     * 
     * @async
     * @function coldNavigation
     * @param {string} name - The name associated with the navigation action, used for identification.
     * @param {string} [link] - The URL of the page to navigate to. Defaults to the current page URL if not provided.
     * @param {number} [timeout=this.DEFAULT_TIMEOUT] - The maximum time to wait for navigation to complete. 
     * @throws {Error} Throws an error if navigation fails.
     * @example
     * // Given: I am opening the browser
     * // When: I am navigating to the Home page
     * // Then: I measure cold navigation performance of the page
     * await coldNavigation(browser, 'https://example.com/home');
     */
    async coldNavigation(browser, url = this.url, timeout = this.DEFAULT_TIMEOUT) {
        await browser.coldNavigation(`${this.constructor.name} - cold`, url, timeout)
    }
    /**
     * Performs navigation to a given page URL in a "warm" state, simulating a scenario where the user
     * navigates to the page with cached resources available. This function is aimed at measuring the
     * warm navigation performance of the page, providing insights into how quickly a page loads when
     * some resources are cached.
     * 
     * @async
     * @function warmNavigation
     * @param {string} name - The name associated with the navigation action for identification purposes.
     * @param {string} [link] - The target URL for navigation. If not provided, defaults to the current page URL.
     * @param {number} [timeout=this.DEFAULT_TIMEOUT] - An optional timeout parameter for the navigation operation, 
     *                                                   defined in milliseconds. Defaults to `this.DEFAULT_TIMEOUT`.
     * @throws {Error} - Throws an error if the navigation process fails.
     * @example
     * // Given: I am already on a website with some resources cached
     * // When: I am navigating to another page on the same website
     * // Then: I measure warm navigation performance of the page
     * await warmNavigation(browser, 'https://example.com/home');
     */
    async warmNavigation(browser, url = this.url, timeout = this.DEFAULT_TIMEOUT) {
        await browser.warmNavigation(`${this.constructor.name} - warm`, url, timeout)
    }
    /**
     * Navigates the browser to a specific URL, using a specified timeout for the navigation process.
     * @async
     * @function openURL
     * @param {string} [url=this.url] - The URL to navigate to. Defaults to `this.url` if not explicitly provided
     * @param {number} [timeout=this.DEFAULT_TIMEOUT] - The maximum duration, in milliseconds, allowed for the
     *                                                  navigation to complete. Defaults to `this.DEFAULT_TIMEOUT`
     * @throws {Error} When the browser is unable to navigate to the specified URL within the given timeout period.
     * @example
     * // Example usage: Navigating to the homepage with a custom timeout value
     * await openURL('https://example.com', 5000);
     */
    async openURL(url = this.url, timeout = this.DEFAULT_TIMEOUT) {
        await browser.goToPage(url, timeout)
    }

    async setURL(url) {
        this.url = url
    }

    /** Action: close page */
    async close() {
        await this.p.close();
    }
}