//https://github.com/puppeteer/puppeteer/blob/v1.14.0/docs/api.md#keyboardpresskey-options
class Keyboard {
    /**
     * Press key
     * @key      key to press
     * @page     current page in browser
    */
    async pressKey(key, page) {
        let successMessage = "Key pressed successfully (" + key + ")";
        let failedMessage  = "Failed to press Key (" + key + ")" +
                           "\nYou need to pass both selector and page to this method";

        if (page.isSuccess) {
          try {
              await page.keyboard.press(key);
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
    /**
     * Scroll page to the right via Ctrl+ArrowRight.  Might not work for all the cases..
     * @page     current page in browser
    */
    async scrollPageRight(page) {
        let successMessage = "Page scrolled successfully to the right";
        let failedMessage  = "Failed to scroll the page to the right";

        if (page.isSuccess) {
          try {
              await page.keyboard.down("ControlLeft");
              await page.keyboard.press("ArrowRight");
              await page.keyboard.up("ControlLeft");
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
    /**
     * Scroll page to the left via Ctrl+ArrowLeft.  Might not work for all the cases..
     * @page     current page in browser
    */
    async scrollPageLeft(page) {
        let successMessage = "Page scrolled successfully to the left";
        let failedMessage  = "Failed to scroll the page to the left";

        if (page.isSuccess) {
          try {
              await page.keyboard.down("ControlLeft");
              await page.keyboard.press("ArrowLeft");
              await page.keyboard.up("ControlLeft");
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
    /**
     * Scroll page down via Ctrl+ArrowDown.  Might not work for all the cases..
     * @page     current page in browser
    */
    async scrollPageDown(page) {
        let successMessage = "Page scrolled down successfully";
        let failedMessage  = "Failed to scroll the page down";

        if (page.isSuccess) {
          try {
              await page.keyboard.down("ControlLeft");
              await page.keyboard.press("ArrowDown");
              await page.keyboard.up("ControlLeft");
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
    /**
     * Scroll page up via Ctrl+ArrowUp.  Might not work for all the cases..
     * @page     current page in browser
    */
    async scrollPageUp(page) {
        let successMessage = "Page scrolled up successfully";
        let failedMessage  = "Failed to scroll the page up";

        if (page.isSuccess) {
          try {
              await page.keyboard.down("ControlLeft");
              await page.keyboard.press("ArrowUp");
              await page.keyboard.up("ControlLeft");
          } catch (error) {
              page.isSuccess = false;
          }
        }
        page.isSuccess? console.log(successMessage) : console.log(failedMessage);
    }
}


module.exports = Keyboard;
