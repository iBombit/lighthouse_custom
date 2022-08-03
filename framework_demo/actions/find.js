class Find {
    /**
     * Find XPATH selector and return it to further flows
     * @selector XPATH selector
     * @page     current page in browser
     * @return   linkHandlers
    */
    async XPATH(selector, page) {
        let successMessage = "Selector found (XPATH): " + selector;
        let failedMessage  = "Selector not found (XPATH): " + selector +
                             "\nYou need to pass both selector and page to this method";

        if (page.isSuccess) {
          try {
              let linkHandlers = await page.$x(selector);
              if (linkHandlers.length > 0) {
                  console.log(successMessage);
                  return linkHandlers;
              } else {
                  console.log(failedMessage);
                  page.isSuccess = false;
              }
          }
          catch (error) {
              console.log(error);
              page.isSuccess = false;
          }
        }
    }
    /**
     * Find CSS selector and return it to further flows
     * @selector CSS selector
     * @page     current page in browser
     * @options  hidden, returnValue or undefined :)
     * @return   await page.$(selector)  -- if options===returnValue
    */
    async CSS(selector, page, options) {
        const waitingTime = 240000;
        let successMessage = "Selector found (CSS): " + selector;
        let failedMessage  = "Selector not found (CSS): " + selector +
                             "\nYou need to pass both selector and page to this method";

        if (page.isSuccess) {
          try {
              //more options to add here
              switch (options) {
                  case 'hidden':
                      await page.waitForSelector(selector, {hidden: true, timeout: waitingTime});
                      successMessage = "Selector disappeared (CSS): " + selector;
                      break;
                  case 'returnValue':
                      await page.waitForSelector(selector, {timeout: waitingTime});
                      return await page.$(selector);
                  default:
                      await page.waitForSelector(selector, {timeout: waitingTime});
              }
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }

}


module.exports = Find;
