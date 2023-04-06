const Find = require('./find');

class SelectRandomOption {
    /**
     * Select random "option" from "select" element
     * @selector CSS selector of "select" element
     * @page     current page in browser or frame
     * @options  hope it won't be needed...
    */
    static async CSS(selector, page, options) {
        let successMessage = "[SUCCESS] Selected option (CSS): " + selector;
        let failedMessage  = "[FAIL] Can't select option (CSS): " + selector +
                             "\nYou need to pass both selector and page to this method";

        await Find.XPATH(selector, page);
        if (page.isSuccess) {
          try {
              //more options to add here
              switch (options) {
                  default:
                      let totalCount = await page.evaluate((selector) => { return document.querySelectorAll(selector)[0].length}, selector);
                      console.log("[RANDOM] totalCount of options: " + totalCount);
                      let num = Math.floor(Math.random() * totalCount);
                      console.log("[RANDOM] chosen option num: " + num);
                      let value = await page.evaluate((num, selector) => { return document.querySelectorAll(selector)[0][num].value}, num, selector);
                      console.log("[RANDOM] chosen value: " + value);
                      await page.select(selector, value);
              }
          } catch (error) {
              console.log(error);
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }

}


module.exports = SelectRandomOption;
