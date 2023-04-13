const Element = require('./element');
const DEFAULT_TIMEOUT = 120000;

class Button extends Element {
    page;

    constructor(locator, page){
        super(locator, page);
        this.page = page;
    }

    async jsClick(timeout=DEFAULT_TIMEOUT){
        try {
            await this.find(timeout);
            await this.page.$eval(this.locator, element => element.click());
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    async click(timeout=DEFAULT_TIMEOUT){
        try {
            await this.find(timeout);
            await this.element.click();
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    async dobleClick(timeout=DEFAULT_TIMEOUT){
        try {
            await this.find(timeout);
            await this.element.click({clickCount: 2});
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

    async rightClick(timeout=DEFAULT_TIMEOUT){
        try {
            await this.find(timeout);
            await this.element.click({button: 'right',});
        }
        catch (error) {
            this.page.isSuccess = false;
            throw new Error(error);
        }
    }

}

module.exports = Button;