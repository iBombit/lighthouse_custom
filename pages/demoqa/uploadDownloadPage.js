import Page from "../../core/page.js";
import UploadField from "../../core/elements/uploadField.js";
import Element from "../../core/elements/element.js";

export default class UploadDownloadPage extends Page {
    constructor(page) {
        super(page)
        this.url = "https://demoqa.com/upload-download"
    }

    init(page){
        super.init(page)
        this.uploadFile = new UploadField("input[id='uploadFile']", page)
        this.uploadVerify = new Element("//*[@id='uploadedFilePath' and contains(text(),'uploadTest.txt')]", page)
    }

}