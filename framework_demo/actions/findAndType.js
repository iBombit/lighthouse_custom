const Find = require('./find');
const findCSS = new Find().CSS;
const findXpath = new Find().XPATH;

class FindAndType {
    async XPATH(selector, text, page) {
        let successMessage = "Typed successfully (XPATH): " + selector;
        let failedMessage  = "Can't type this (" + text + ") into selector (XPATH): " + selector;

        let linkHandlers = await findXpath(selector, page);
        console.log(page.isSuccess);
        if (page.isSuccess) {
          try {
              await linkHandlers[0].type(text);
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }

    async CSS(selector, text, page) {
        let successMessage = "Typed successfully (CSS): " + selector;
        let failedMessage  = "Can't type this (" + text + ") into selector (CSS): " + selector;

        await findCSS(selector, page);
        if (page.isSuccess) {
          try {
              await page.type(selector, text, {delay: 100});
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
}


module.exports = FindAndType;
