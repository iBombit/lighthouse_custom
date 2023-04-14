const Page = require("../../core/page");
const TextField = require("../../core/elements/textField");
const Button = require("../../core/elements/button");
const UploadField = require("../../core/elements/uploadField");
const Element = require("../../core/elements/element");

class PracticeFormPage extends Page {
    constructor(page) {
        super(page)
        this.url = "https://demoqa.com/automation-practice-form"
    }

    init(page){
        super.init(page)
        this.firstName = new TextField("input[id='firstName']", page)
        this.lastName = new TextField("input[id='lastName']", page)
        this.userEmail = new TextField("input[id='userEmail']", page)
        this.genderMale = new Button("input[id='gender-radio-1']", page)
        this.mobileNumber = new TextField("input[id='userNumber']", page)
        this.dateOfBirth = new Button("input[id='dateOfBirthInput']", page)
        this.day = new Button("//*[@id='dateOfBirth']/div[2]/div[2]/div/div/div[2]/div[2]/div[3]/div[2]", page)
        this.subjects = new TextField("input[id='subjectsInput']", page)
        this.uploadPicture = new UploadField("input[id='uploadPicture']", page)
        this.currentAddress = new TextField("textarea[id='currentAddress']", page)
        this.hobbiesSports = new Button("//*[@id='hobbiesWrapper']/div[2]/div[1]", page)
        this.state = new Button("//*[@id='state']/div/div[2]", page)
        this.stateNCR = new Button("//*[@id='react-select-3-option-0']", page)
        this.city = new Button("//*[@id='city']/div/div[2]", page)
        this.cityDelhi = new Button("//*[@id='react-select-4-option-0']", page)
        this.submit = new Button("button[id='submit']", page)
        this.formSubmitVerify = new Element("//*[@id='example-modal-sizes-title-lg' and contains(text(),'Thanks for submitting the form')]", page)
    }

}

module.exports = PracticeFormPage;