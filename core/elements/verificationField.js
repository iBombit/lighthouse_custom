const Element = require('./element');
const DEFAULT_TIMEOUT = 120000;

class VerificationField extends Element {
    page;
    
    constructor(locator, page){
        super(locator);
        this.page = page;
    }

    async isVisible(timeout=DEFAULT_TIMEOUT){
        try {
            await this.find(this.page, timeout);
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    async isHidden(timeout=DEFAULT_TIMEOUT){
        try {
            await this.findHidden(this.page, timeout);
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

}

module.exports = VerificationField;