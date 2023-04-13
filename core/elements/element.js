
class Element {
    locator;
    element;
    locatorType;

    constructor(locator, page){
        this.locator = locator
        this.page = page
        this.locatorType = this.locator.startsWith("/") ? "xpath" : "css";
    }

    async find(timeout){
        switch(this.locatorType){
            case "xpath":
                this.element = await this.page.waitForXPath(this.locator, {visible: true, 'timeout': timeout});
                break;
            default:
                this.element = await this.page.waitForSelector(this.locator, {visible: true, 'timeout': timeout});
        }
        return this.element    
    }

    async findHidden(timeout){
        switch(this.locatorType){
            case "xpath":
                this.element = await this.page.waitForXPath(this.locator, {hidden: true, 'timeout': timeout});
                break;
            default:
                this.element = await this.page.waitForSelector(this.locator, {hidden: true, 'timeout': timeout});
        }
        return this.element
    }

}

module.exports = Element;