const Button = require('./elements/button');
const TextField = require('./elements/textField');
const UploadField = require('./elements/uploadField');

class Page  {
    constructor() {
        //this.objects = {};
    }

    init(page) {
        this.p = page;
    }

    btn(name, selector) {
        this[name] = new Button(selector, this.p);
        return this[name]
    }

    input(name, selector) {
        this[name] = new TextField(selector, this.p);
        return this[name]
    }

    upload(name, selector) {
        this[name] = new UploadField(selector, this.p);
        return this[name]
    }

    async close() {
        await this.p.close();
    }
}

module.exports = Page;