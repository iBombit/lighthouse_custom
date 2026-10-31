import type { ElementHandle } from 'puppeteer-core';
import logger from "../../logger/logger.js";
import Element from './element.js';

export default class UploadField extends Element {

    // Action: upload file
    async upload(path: string, timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[UPLOAD] ${this.locatorType}:${this.locator}`);
        logger.debug(`[ PATH ] ${path}`);
        try {
            await this.find(timeout);
            await (this.element as ElementHandle<HTMLInputElement>).uploadFile(path);
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error as string);
        }
    }

    // Action: upload file into hidden element
    async uploadHidden(path: string, timeout: number = Element.DEFAULT_TIMEOUT): Promise<void> {
        logger.debug(`[UPLOAD] ${this.locatorType}:${this.locator}`);
        logger.debug(`[ PATH ] ${path}`);
        try {
            await this.findHidden(timeout);
            await (this.element as ElementHandle<HTMLInputElement>).uploadFile(path);
        }
        catch (error) {
            logger.debug(`[ERROR] check selector, it must contain page`);
            this.page.isSuccess = false;
            throw new Error(error as string);
        }
    }

}
