import Page from "lh-pptr-framework/core/page.js";
import UploadField from "lh-pptr-framework/core/elements/uploadField.js";
import Element from "lh-pptr-framework/core/elements/element.js";
import * as params from 'lh-pptr-framework/settings/testParams.js';

export default class UploadDownloadPage extends Page {
    constructor(page) {
        super(page)
        this.setPath('upload-download');
    }

    init(page) {
        super.init(page)
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