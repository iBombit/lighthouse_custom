const Element = require('./element');
const DEFAULT_TIMEOUT = 120000;

class UploadField extends Element {
    page;
    
    constructor(locator, page){
        super(locator, page);
        this.page = page;
    }

    async upload(path, timeout=DEFAULT_TIMEOUT){
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

module.exports = UploadField;