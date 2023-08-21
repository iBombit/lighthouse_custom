import logger from "../../logger/logger.js";
import Element from './element.js';

export default class UploadField extends Element {
    page;
    
    constructor(locator, page){
        super(locator, page);
        this.page = page;
    }

    // Action: upload file
    async upload(path, timeout=Element.DEFAULT_TIMEOUT){
        logger.debug(`[UPLOAD] ${this.locatorType}:${this.locator}`);
        logger.debug(`[ PATH ] ${path}`);
        try {
            await this.find(timeout);
            await this.element.uploadFile(path);
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

}
