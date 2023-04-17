const Button = require('./elements/button');
const TextField = require('./elements/textField');
const UploadField = require('./elements/uploadField');

class Page  {
    constructor() {}

    init(page) {
        this.p = page;
        this.p.isSuccess = true;
    }

    /** Register button @name located by @selector */ 
    btn(name, selector) {
        this[name] = new Button(selector, this.p);
        return this[name]
    }

    /** Register input @name located by @selector */ 
    input(name, selector) {
        this[name] = new TextField(selector, this.p);
        return this[name]
    }

    /** Register upload input @name located by @selector */ 
    upload(name, selector) {
        this[name] = new UploadField(selector, this.p);
        return this[name]
    }

    /** Action: close page */
    async close() {
        await this.p.close();
    }
}

module.exports = Page;