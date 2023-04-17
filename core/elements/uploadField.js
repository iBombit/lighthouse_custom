const Element = require('./element');

class UploadField extends Element {
    page;
    
    constructor(locator, page){
        super(locator, page);
        this.page = page;
    }

    // Action: upload file
    async upload(path, timeout=Element.DEFAULT_TIMEOUT){
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