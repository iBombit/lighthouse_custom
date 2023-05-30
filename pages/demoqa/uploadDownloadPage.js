const Page = require("../../core/page");
const UploadField = require("../../core/elements/uploadField");
const Element = require("../../core/elements/element");

class UploadDownloadPage extends Page {
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

module.exports = UploadDownloadPage;