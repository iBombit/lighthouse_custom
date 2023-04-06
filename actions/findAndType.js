const Find = require('./find');

class FindAndType {
    /**
     * Find and type into XPATH selector
     * @selector XPATH selector
     * @text     text to type into selector
     * @page     current page in browser
    */
    static async XPATH(selector, text, page) {
        let successMessage = "[SUCCESS] Typed successfully (XPATH): " + selector;
        let failedMessage  = "[FAIL] Can't type this (" + text + ") into selector (XPATH): " + selector;

        let linkHandlers = await Find.XPATH(selector, page);
        console.log(page.isSuccess);
        if (page.isSuccess) {
          try {
              await linkHandlers[0].type(text);
          } catch (error) {
              console.log(error);
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
    /**
     * Find and type into CSS selector (delay between keypress is 100ms)
     * @selector CSS selector
     * @text     text to type into selector
     * @page     current page in browser
    */
    static async CSS(selector, text, page, options) {
        let successMessage = "[SUCCESS] Typed successfully (CSS): " + selector;
        let failedMessage  = "[FAIL] Can't type this (" + text + ") into selector (CSS): " + selector;

        await Find.CSS(selector, page);
        if (page.isSuccess) {
          try {
            //more options to add here
            switch (options) {
              case 'iframe':
                  let link = await Find.CSS(selector, page, "returnValue");
                  await link.type(text);
                  successMessage = "[SUCCESS] iframe type (CSS): " + selector;
                  break;
                  //await page.type(selector, text, {delay: 100});
              default:
                  await page.type(selector, text, {delay: 100});
            }
          } catch (error) {
              console.log(error);
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
}


module.exports = FindAndType;
