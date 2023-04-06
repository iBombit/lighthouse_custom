const Element = require('./element');

class Button extends Element {
    page;

    constructor(locator, page){
        super(locator);
        this.page = page;
    }

    async jsClick(){
        await this.page.$eval(this.locator, element => element.click());
    }

    async click(){
        await this.find(this.page);
        await this.element.click();
    }

    async dobleClick(){
        await this.find(this.page);
        await this.element.click({clickCount: 2});
    }

}

module.exports = Button;