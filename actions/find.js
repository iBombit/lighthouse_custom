class Find {
    /**
     * Find XPATH selector and return it to further flows
     * @selector XPATH selector
     * @page     current page in browser
     * @options  hidden or undefined :)
     * @return   linkHandlers
    */
    static async XPATH(selector, page, options) {
        if (page.isSuccess) {
            //more options to add here
            switch (options) {
                case 'hidden':
                    return Find.findHiddenXPATH(selector, page);
                default:
                    return Find.findVisibleXPATH(selector, page);
            }
        }
    }

    /**
     * Wait for XPATH selector to disappear
     * @selector XPATH selector
     * @page     current page in browser
     * @return   linkHandlers
    */
    static async findHiddenXPATH(selector, page) {
        const pollingTime = 1000;
        const waitingTime = 1200000;
        const finishTime = new Date().getTime() + waitingTime;
        //let successMessage = "[SUCCESS] Selector found (XPATH): " + selector;
        let failedMessage  = "[FAIL] Selector not found (XPATH): " + selector +
                             "\nYou need to pass both selector and page to this method";

        while (new Date().getTime() < finishTime) {
          try {
              let linkHandlers = await page.$x(selector);
              if (linkHandlers.length === 0) {
                  console.log("[SUCCESS] Selector disappeared (XPATH): " + selector);
                  return linkHandlers;
              }
              else {
                  console.log(new Date().getTime() + " Selector still present (XPATH): " + selector);
                  await page.waitForTimeout(pollingTime);
              }
          }
          catch (error) {
              console.log(error);
              console.log(failedMessage);
              page.isSuccess = false;
          }
        }
        console.log("[FAIL] Selector still present (XPATH): " + selector);
        page.isSuccess = false;
    }

    /**
     * Wait for XPATH selector to become visible
     * @selector XPATH selector
     * @page     current page in browser
     * @return   linkHandlers
    */
    static async findVisibleXPATH(selector, page) {
        const pollingTime = 1000;
        const waitingTime = 1200000;
        const finishTime = new Date().getTime() + waitingTime;
        let failedMessage  = "[FAIL] Selector not found (XPATH): " + selector +
                             "\nYou need to pass both selector and page to this method";

        while (new Date().getTime() < finishTime) {
          try {
              let linkHandlers = await page.$x(selector);
              if (linkHandlers.length > 0) {
                  console.log("[SUCCESS] Selector found (XPATH): " + selector);
                  return linkHandlers;
              } else {
                  console.log(new Date().getTime() + " Selector still not visible (XPATH): " + selector);
                  await page.waitForTimeout(pollingTime);
              }
          }
          catch (error) {
              console.log(error);
              console.log(failedMessage);
              page.isSuccess = false;
          }
        }
        console.log("[FAIL] Selector still not visible (XPATH): " + selector);
        page.isSuccess = false;
    }

    /**
     * Find CSS selector and return it to further flows
     * @selector CSS selector
     * @page     current page in browser
     * @options  hidden, returnValue or undefined :)
     * @return   await page.$(selector)  -- if options===returnValue
    */
    static async CSS(selector, page, options) {
        const waitingTime = 1200000;
        let successMessage = "[SUCCESS] Selector found (CSS): " + selector;
        let failedMessage  = "[FAIL] Selector not found (CSS): " + selector +
                             "\nYou need to pass both selector and page to this method";

        if (page.isSuccess) {
          try {
              //more options to add here
              switch (options) {
                  case 'hidden':
                      await page.waitForSelector(selector, {hidden: true, timeout: waitingTime});
                      successMessage = "[SUCCESS] Selector disappeared (CSS): " + selector;
                      break;
                  case 'returnValue':
                      await page.waitForSelector(selector, {timeout: waitingTime});
                      return await page.$(selector);
                  default:
                      await page.waitForSelector(selector, {timeout: waitingTime});
              }
          } catch (error) {
              console.log(error);
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }

}


module.exports = Find;
