import logger from "../../logger/logger.js";
import Element from './element.js';

export default class Iframe extends Element {
    page;

    constructor(locator, page) {
        super(locator, page);
        this.page = page;
    }

    //Action: Create iframe with success status
    async createIframe(timeout = Element.DEFAULT_TIMEOUT) {
        logger.debug(`[IFRAME] ${this.locatorType}:${this.locator} in ${this.page.url()}`);
        try {
            let frameHandle = await this.find(timeout);
            let frame = await frameHandle.contentFrame();
            //each time we create a new frame we need to set status as success
            //If it fails in "actions" -- it will skip other actions within this frame
            frame.isSuccess = true;
            return frame;
        }
        catch (error) {
            logger.debug("[IFRAME] Can't find IFrame!")
        }
    }

}