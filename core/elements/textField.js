const Element = require('./element');
const DEFAULT_TIMEOUT = 120000;
const TYPE_KEY_BY_KEY_TIMEOUT = 100;

class TextField extends Element {
    page;
    
    constructor(locator, page){
        super(locator);
        this.page = page;
    }

    async type(text, timeout=DEFAULT_TIMEOUT, delay=TYPE_KEY_BY_KEY_TIMEOUT){
        try {
            await this.find(this.page, timeout);
            await this.element.type(text, {delay: delay});
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    async clear(){
        try {
            await this.find(this.page);
            await this.element.click({ clickCount: 3 })
            await this.element.type(" ");
            await this.page.keyboard.press('Backspace');
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    async upload(path, timeout=DEFAULT_TIMEOUT){
        try {
            await this.find(this.page, timeout);
            await this.element.uploadFile(path);
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }
}

module.exports = TextField;