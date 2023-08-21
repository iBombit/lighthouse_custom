import Button from './elements/button.js';
import TextField from './elements/textField.js';
import UploadField from './elements/uploadField.js';

export default class Page  {
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