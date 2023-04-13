
class Element {
    locator;
    element;
    locatorType;

    constructor(locator){
        this.locator = locator
        this.locatorType = this.locator.startsWith("/") ? "xpath" : "css";
    }

    async find(page, timeout){
        switch(this.locatorType){
            case "xpath":
                this.element = await page.waitForXPath(this.locator, {visible: true, 'timeout': timeout});
                break;
            default:
                this.element = await page.waitForSelector(this.locator, {visible: true, 'timeout': timeout});
        }
        return this.element    
    }

    async findHidden(page, timeout){
        switch(this.locatorType){
            case "xpath":
                this.element = await page.waitForXPath(this.locator, {hidden: true, 'timeout': timeout});
                break;
            default:
                this.element = await page.waitForSelector(this.locator, {hidden: true, 'timeout': timeout});
        }
        return this.element
    }

}

module.exports = Element;