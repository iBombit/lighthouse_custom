import Page from "../../core/page.js";
import TextField from "../../core/elements/textField.js";
import Button from "../../core/elements/button.js";
import Element from "../../core/elements/element.js";

export default class TextBoxPage extends Page {
    constructor(page) {
        super(page)
        this.url = "https://demoqa.com/text-box"
    }

    init(page){
        super.init(page)
        this.fullName = new TextField("input[id='userName']", page)
        this.userEmail = new TextField("input[id='userEmail']", page)
        this.currentAddress = new TextField("textarea[id='currentAddress']", page)
        this.permanentAddress = new TextField("textarea[id='permanentAddress']", page)
        this.submit = new Button("button[id='submit']", page)
        this.textBoxVerify = new Element("//*[@id='output']//*[@id='permanentAddress' and contains(text(),'Address')]", page)
    }

}