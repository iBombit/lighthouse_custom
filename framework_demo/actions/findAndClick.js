const Find = require('./find');
const findCSS = new Find().CSS;
const findXpath = new Find().XPATH;

class FindAndClick {
    /**
     * Find and click into XPATH selector
     * @selector XPATH selector
     * @page     current page in browser
     * @options  rightClick or undefined :)
    */
    async XPATH(selector, page, options) {
        let successMessage = "[SUCCESS] Clicked (XPATH): " + selector;
        let failedMessage  = "[FAIL] Selector was not clickable (XPATH): " + selector +
                             "\nYou need to pass both selector and page to this method";

        let linkHandlers = await findXpath(selector, page);
        if (page.isSuccess) {
          try {
              //more options to add here
              switch (options) {
                  case 'rightClick':
                      await linkHandlers[0].click({button: 'right',});
                      successMessage = "[SUCCESS] Right click (XPATH): " + selector;
                      break;
                  default:
                      await linkHandlers[0].click();
              }
          } catch (error) {
              console.log(error);
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
    /**
     * Find and click into CSS selector
     * @selector CSS selector
     * @page     current page in browser
     * @options  rightClick, jsClick, iframe, doubleClick, random or undefined :)
    */
    async CSS(selector, page, options) {
        let successMessage = "[SUCCESS] Clicked (CSS): " + selector;
        let failedMessage  = "[FAIL] Selector was not clickable (CSS): " + selector +
                             "\nYou need to pass both selector and page to this method"

        await findCSS(selector, page);
        if (page.isSuccess){
          try {
              //more options to add here
              switch (options) {
                  case 'rightClick':
                      await page.click(selector, {button: 'right',});
                      successMessage = "[SUCCESS] Right click (CSS): " + selector;
                      break;
                  case 'jsClick':
                      await page.$eval(selector, element => element.click());
                      successMessage = "[SUCCESS] JS click (CSS): " + selector;
                      break;
                  case 'iframe':
                      let link = await findCSS(selector, page, "returnValue");
                      await link.click();
                      successMessage = "[SUCCESS] iframe click (CSS): " + selector;
                      break;
                  case 'doubleClick':
                      await page.click(selector, {clickCount: 2});
                      successMessage = "[SUCCESS] Double click (CSS): " + selector;
                      break;
                  case 'random':
                      let totalCount = await page.evaluate((selector) => { return document.querySelectorAll(selector).length; }, selector);
                      console.log("[RANDOM] totalCount of possible clicks: " + totalCount);
                      let num = Math.floor(Math.random() * totalCount);
                      console.log("[RANDOM] chosen num to click: " + num);
                      let selectAll = await page.$$(selector);
                      await selectAll[num].click();
                      successMessage = "[SUCCESS] Random click (CSS): " + selector;
                      break;
                  default:
                      await page.click(selector);
              }
          } catch (error) {
              console.log(error);
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
}


module.exports = FindAndClick;
