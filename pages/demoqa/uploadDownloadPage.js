import Page from "../../core/page.js";
import UploadField from "../../core/elements/uploadField.js";
import Element from "../../core/elements/element.js";

export default class UploadDownloadPage extends Page {
    constructor(page) {
        super(page)
    }

    init(page) {
        super.init(page)
        this.url = "https://demoqa.com/upload-download"
        
        this.uploadFile = new UploadField("input[id='uploadFile']", page)
        this.uploadVerify = new Element("//*[@id='uploadedFilePath' and contains(text(),'uploadTest.txt')]", page)
    }
    /**
    @example
    // Given: I am on the Main page "UploadDownload" section
    // When: I am uploading test file
    // Then: I wait for upload verification message to appear
    // And: I measure action time performance of the page
    */
    async uploadFileIntoInput(browser) {
        await browser.timespan("Upload file into 'Choose File'", async () => {
            await this.uploadFile.upload("/testdata/files/uploadTest.txt")
            await this.uploadVerify.find()
            await browser.waitTillRendered() //TODO it fails with "RESULT_CODE_KILLED_BAD_MESSAGE"
        })
    }

}