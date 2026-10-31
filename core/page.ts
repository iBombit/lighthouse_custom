import * as params from '../settings/testParams.js';
import logger from "../logger/logger.js";
import type LighthouseBrowser from './browser.js';
import type Element from './elements/element.js';
import type { PageContext, ReinitializablePage, TestContextLike } from './types.js';
import type { PageValidateTiming } from '../settings/custom-artifacts.js';

/**
 * Base page object. Extend it per page in your test suite, set the path with
 * `setPath()` and create the page's elements in an overridden `init(page)`.
 */
export default class Page {
    static baseUrl: string | undefined = params.url;
    path: string;
    /** Puppeteer page (or frame) bound by {@link init}. */
    declare p: PageContext;
    /** Optional element awaited by {@link navigationValidate} to confirm the page loaded. */
    declare pageValidate?: Element;

    constructor() {
        this.path = '';
    }

    init(page: PageContext): void {
        this.p = page;
        this.p.isSuccess = true;
    }

    /**
     * Warm navigation measured by Lighthouse; the step is named after the running test.
     * @param browser - The browser instance.
     * @param testContext - The Mocha test context (this).
     * @param link - The URL to navigate to (defaults to {@link getURL}).
     * @param pages - Page objects to re-bind after a browser restart; passing them restarts the browser first.
     * @throws Error if the navigation process fails.
     * @example
     * // Given: I am already on a website with some resources cached
     * // When: I am restarting browser and navigating to another page on the same website
     * // Then: I measure warm navigation performance of the page
     * await SomePage.navigation(browser, this, 'https://example.com/home', pages);
     */
    async navigation(browser: LighthouseBrowser, testContext?: TestContextLike, link: string = this.getURL(), pages?: readonly ReinitializablePage[]): Promise<LighthouseBrowser> {
        const stepName = testContext?.test?.title || `[N]_${this.constructor.name}`;
        browser = await browser.navigation(stepName, link, pages);
        return browser;
    }

    /**
     * Custom navigation that waits for {@link pageValidate}, stores how long it took
     * (for the selector-timing audit) and takes a `_SUCCESS`/`_FAILED` snapshot.
     * A failed validation is reported through the `_FAILED` snapshot step only; it doesn't throw.
     * @param browser - The browser instance.
     * @param testContext - The Mocha test context (this).
     * @param link - The URL to navigate to (defaults to {@link getURL}).
     * @param pages - Page objects to re-bind after a browser restart; passing them restarts the browser first.
     * @throws Error if the navigation or the success snapshot fails.
     * @example
     * // Navigate to a page and validate it loaded correctly with pageValidate selector.
     * // Ensure that the pageValidate element is defined in the page object.
     * await SomePage.navigationValidate(browser, this, 'https://example.com/home', pages);
     */
    async navigationValidate(browser: LighthouseBrowser, testContext?: TestContextLike, link: string = this.getURL(), pages?: readonly ReinitializablePage[]): Promise<LighthouseBrowser> {
        const stepName = testContext?.test?.title || `[N]_${this.constructor.name}`;
        let validationSuccessful = false;
        let validationError: unknown = null;

        await browser.customNavigation(stepName, async () => {
            logger.debug(`[GOTOPAGE] ${link}`);
            const navigationStartTime = Date.now();
            await browser.page.goto(link);
            try {
                if (this.pageValidate) {
                    await this.pageValidate.find(60000);
                    const currentTime = Date.now()
                    const selectorTime = currentTime - navigationStartTime;
                    // Store timing data for Lighthouse gatherer
                    await browser.page.evaluate((timing: number, stepName: string, selector: string) => {
                        (window as unknown as { pageValidateTiming: PageValidateTiming }).pageValidateTiming = {
                            duration: timing,
                            stepName: stepName,
                            selector: selector,
                            timestamp: Date.now()
                        };
                    }, selectorTime, stepName, this.pageValidate.originalLocator);
                    validationSuccessful = true;
                }
                else {
                    logger.debug("[ERROR] Page validation element is not defined in the page object, snaphot checking is skipped.");
                }
            } catch (error) {
                validationError = error;
            }
        }, pages);

        // Take snapshots after navigation is complete
        try {
            if (validationSuccessful) {
                await browser.snapshot({ name: stepName.replace('[N]_', '[S]_') + '_SUCCESS' });
            } else if (validationError) {
                await browser.snapshot({ name: stepName.replace('[N]_', '[S]_') + '_FAILED' });
                throw new Error(`Page validation failed for ${link}: ${(validationError as { message?: unknown }).message}`);
            }
        } catch (snapshotError) {
            if (!validationError) {
                throw snapshotError;
            }
        }

        return browser;
    }

    /**
     * Simple navigation without Lighthouse measurement (waits `timeout` ms, then until the HTML is stable).
     * @param browser - The browser instance.
     * @param link - The URL to navigate to (defaults to {@link getURL}).
     * @param timeout - Time to wait after navigation, and the render-stability timeout, in ms.
     * @throws Error when the browser is unable to navigate to the specified URL.
     * @example
     * // Example usage: Simple navigation to a page without Lighthouse measurement
     * await SomePage.openURL(browser, 'https://example.com/home', 5000);
     */
    async openURL(browser: LighthouseBrowser, link: string = this.getURL(), timeout = 30000): Promise<void> {
        await browser.goToPage(link, timeout)
    }

    setPath(path = ''): void {
        this.path = path;
    }

    getURL(): string {
        // Ensure there's no double slash between base URL and path.
        // Requires `--url`; like before, calling this without it throws.
        return `${Page.baseUrl!.replace(/\/+$/, '')}/${this.path.replace(/^\/+/, '')}`;
    }

}
