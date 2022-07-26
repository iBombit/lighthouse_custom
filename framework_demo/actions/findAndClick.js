const Find = require('./find');
const findCSS = new Find().CSS;
const findXpath = new Find().XPATH;

class FindAndClick {
    async XPATH(selector, page, options) {
        let successMessage = "Clicked successfully (XPATH): " + selector;
        let failedMessage  = "Selector was not clickable (XPATH): " + selector +
                             "\nYou need to pass both selector and page to this method";

        let linkHandlers = await findXpath(selector, page);
        if (page.isSuccess) {
          try {
              //more options to add here
              switch (options) {
                  case 'rightClick':
                      await linkHandlers[0].click({button: 'right',});
                      successMessage = "Right click success (XPATH): " + selector;
                      break;
                  default:
                      await linkHandlers[0].click();
              }
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }

    async CSS(selector, page, options) {
        let successMessage = "Clicked successfully (CSS): " + selector;
        let failedMessage  = "Selector was not clickable (CSS): " + selector +
                             "\nYou need to pass both selector and page to this method"

        await findCSS(selector, page);
        if (page.isSuccess){
          try {
              //more options to add here
              switch (options) {
                  case 'rightClick':
                      await page.click(selector, {button: 'right',});
                      successMessage = "Right click success (CSS): " + selector;
                      break;
                  case 'jsClick':
                      await page.$eval(selector, element => element.click());
                      successMessage = "JS click success (CSS): " + selector;
                      break;
                  case 'doubleClick':
                      await page.click(selector, {clickCount: 2});
                      successMessage = "Double click success (CSS): " + selector;
                      break;
                  default:
                      await page.click(selector);
              }
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
}


module.exports = FindAndClick;
