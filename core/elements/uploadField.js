import logger from "lh-pptr-framework/logger/logger.js";
import Element from 'lh-pptr-framework/core/elements/element.js';

export default class UploadField extends Element {
    page;

    constructor(locator, page) {
        super(locator, page);
        this.page = page;
    }

    // Action: upload file
    async upload(path, timeout = Element.DEFAULT_TIMEOUT) {
        logger.debug(`[UPLOAD] ${this.locatorType}:${this.locator}`);
        logger.debug(`[ PATH ] ${path}`);
        try {
            await this.find(timeout);
            await this.element.uploadFile(path);
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    // Action: upload file into hidden element
    async uploadHidden(path, timeout = Element.DEFAULT_TIMEOUT) {
        logger.debug(`[UPLOAD] ${this.locatorType}:${this.locator}`);
        logger.debug(`[ PATH ] ${path}`);
        try {
            await this.findHidden(timeout);
            await this.element.uploadFile(path);
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

}
