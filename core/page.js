const Button = require('./elements/button');
const TextField = require('./elements/textField');

class Page  {
    constructor() {
        this.objects = {};
    }

    init(page) {
        this.p = page;
    }

    btn(name, selector) {
        this.objects[name] = new Button(selector, this.p);
        return this.objects[name]
    }

    input(name, selector) {
        this.objects[name] = new TextField(selector, this.p);
        return this.objects[name]
    }

    async close() {
        await this.p.close();
    }
}

module.exports = Page;