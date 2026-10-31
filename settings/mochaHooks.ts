import logger from "../logger/logger.js";
import CreateReport, { saveHTMLSource } from '../reporting/createReport.js';
import * as params from './testParams.js';
import { setupBrowser } from './testParams.js';
import type LighthouseBrowser from '../core/browser.js';

/**
 * The subset of Mocha's hook context (`this` inside `beforeEach`/`afterEach`/`after`)
 * used by these hooks. Mocha's own `Context` type is assignable to it, so the hooks can
 * be passed straight to `beforeEach(...)` etc. without depending on `@types/mocha`.
 */
export interface HookContext {
    currentTest?: {
        title: string;
        state?: string;
        fullTitle(): string;
    };
    timeout(ms: number): unknown;
}

let browser: LighthouseBrowser;

/** `before`: launches the shared browser and starts the Lighthouse flow. */
export async function beforeHook(): Promise<void> {
    browser = await setupBrowser();
};

/** `beforeEach`: applies the test timeout and skips the test if the previous step failed or timed out. */
export async function beforeEachHook(this: HookContext): Promise<void> {
    logger.debug("[STARTED] " + this.currentTest!.fullTitle());
    this.timeout(params.testTime);

    if (browser.flow.currentTimespan) {  // happens if waiting inside actions exceeds "params.testTime" timeout
        await browser.flow.endTimespan(); // stopping active timespan if not stopped by timeout
        browser.page.isSuccess = false;
        throw new Error('Skipping test because previous flow exceeded testTime limit: ' + params.testTime);
    } else if (!browser.page.isSuccess) {
        throw new Error('Skipping test because previous flow failed');
    }
};

/** `afterEach`: saves the page HTML to `./reports/errors/` when the test failed. */
export async function afterEachHook(this: HookContext): Promise<void> {
    logger.debug(`[ENDED] ${this.currentTest!.title}`);

    if (this.currentTest!.state === 'failed') {
        const stepName = this.currentTest!.title;
        try {
            const htmlFilePath = await saveHTMLSource(browser.page, stepName);
            logger.debug(`[HTML SAVED] ${htmlFilePath}`);
        } catch (error) {
            logger.error(`[HTML ERROR] Failed to save HTML source: ${(error as Error).message}`);
        }
    }
};

/** `after`: closes any open timespan, takes a final snapshot, writes/sends reports and closes the browser. */
export async function afterHook(this: HookContext): Promise<void> {
    this.timeout(300000); // consider increasing this time if it can't create reports within the limit
    try {
        if (browser.flow.currentTimespan) {   // happens if waiting inside actions exceeds "testTime" timeout
            await browser.flow.endTimespan(); // stopping the active timespan if not stopped by timeout
            browser.page.isSuccess = false;
        }
        await browser.snapshot({ name: 'Capturing last state of the test' });
        await new CreateReport().createReports(browser.flow);
        await browser.closeBrowser();
    } catch (error) {
        logger.debug("[ERROR] afterHook " + error);
    }
};
