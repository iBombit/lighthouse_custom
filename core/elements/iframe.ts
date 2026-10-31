import type { ElementHandle } from 'puppeteer-core';
import logger from "../../logger/logger.js";
import Element from './element.js';
import type { TrackedFrame } from '../types.js';

export default class Iframe extends Element {

    //Action: Create iframe with success status
    /** Returns the iframe's content frame (bind page objects to it with `init(frame)`), or `undefined` when it can't be found. */
    async createIframe(timeout: number = Element.DEFAULT_TIMEOUT): Promise<TrackedFrame | undefined> {
        logger.debug(`[IFRAME] ${this.locatorType}:${this.locator} in ${this.page.url()}`);
        try {
            const frameHandle = (await this.find(timeout)) as ElementHandle<HTMLIFrameElement>;
            const frame: TrackedFrame = (await frameHandle.contentFrame())!;
            //each time we create a new frame we need to set status as success
            //If it fails in "actions" -- it will skip other actions within this frame
            frame.isSuccess = true;
            return frame;
        }
        catch {
            logger.debug("[IFRAME] Can't find IFrame!")
        }
    }

}
