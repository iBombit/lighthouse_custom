const Find = require('./find');
const findCSS = new Find().CSS;
const findXpath = new Find().XPATH;

class FindAndUpload {
    /**
     * Find and upload file into XPATH selector
     * @selector XPATH selector
     * @page     current page in browser
     * @filepath relative path to file
    */
    async XPATH(selector, page, filepath) {
        let successMessage = "Uploaded successfully (XPATH): " + selector;
        let failedMessage  = "Can't upload into (XPATH): " + selector;

        let linkHandlers = await findXpath(selector, page);
        if (page.isSuccess) {
          try {
            await linkHandlers[0].uploadFile(filepath);
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
    /**
     * Find and upload file into CSS selector
     * @selector CSS selector
     * @page     current page in browser
     * @filepath relative path to file
    */
    async CSS(selector, page, filepath) {
        let successMessage = "Uploaded successfully (CSS): " + selector;
        let failedMessage  = "Can't upload into (CSS): " + selector;

        let linkHandlers = await findCSS(selector, page, "returnValue");
        if (page.isSuccess) {
          try {
            await linkHandlers.uploadFile(filepath);
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
}


module.exports = FindAndUpload;
