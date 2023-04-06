const Find = require('./find');

class FindAndUpload {
    /**
     * Find and upload file into XPATH selector
     * @selector XPATH selector
     * @page     current page in browser
     * @filepath relative path to file
    */
    static async XPATH(selector, page, filepath) {
        let successMessage = "[SUCCESS] Uploaded (XPATH): " + selector;
        let failedMessage  = "[FAIL] Can't upload into (XPATH): " + selector;

        let linkHandlers = await Find.XPATH(selector, page);
        if (page.isSuccess) {
          try {
            await linkHandlers[0].uploadFile(filepath);
          } catch (error) {
              console.log(error);
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
    static async CSS(selector, page, filepath) {
        let successMessage = "[SUCCESS] Uploaded (CSS): " + selector;
        let failedMessage  = "[FAIL] Can't upload into (CSS): " + selector;

        let linkHandlers = await Find.CSS(selector, page, "returnValue");
        if (page.isSuccess) {
          try {
            await linkHandlers.uploadFile(filepath);
          } catch (error) {
              console.log(error);
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
}


module.exports = FindAndUpload;
