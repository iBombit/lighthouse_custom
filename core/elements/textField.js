const Element = require('./element');

class TextField extends Element {
    page;
    
    constructor(locator, page){
        super(locator);
        this.page = page;
    }

    async type(text, delay=100){
        await this.find(this.page);
        await this.element.type(text, {delay: delay});
    }
}

module.exports = TextField;