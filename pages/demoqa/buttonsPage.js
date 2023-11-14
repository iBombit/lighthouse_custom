import Page from "../../core/page.js";
import Button from "../../core/elements/button.js";
import Element from "../../core/elements/element.js";

export default class ButtonsPage extends Page {
    constructor(page) {
        super(page)
        this.url = "https://demoqa.com/buttons"
    }

    init(page){
        super.init(page)
        this.clickBtn = new Button("//button[text()='Click Me']", page)
        this.clickVerify = new Element("#dynamicClickMessage", page)
        this.doubleClickBtn = new Button("//button[text()='Double Click Me']", page)
        this.doubleClickVerify = new Element("#doubleClickMessage", page)
        this.rightClickBtn = new Button("//button[text()='Right Click Me']", page)
        this.rightClickVerify = new Element("#rightClickMessage", page)    
    }

}