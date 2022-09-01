//https://github.com/puppeteer/puppeteer/blob/v1.14.0/docs/api.md#keyboardpresskey-options
class Keyboard {
    /**
     * Press key (https://github.com/puppeteer/puppeteer/blob/v1.14.0/lib/USKeyboardLayout.js)
     * @key      key to press
     * @page     current page in browser
    */
    async pressKey(key, page) {
        let successMessage = "[SUCCESS] Key pressed (" + key + ")";
        let failedMessage  = "[FAIL] Failed to press Key (" + key + ")";

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
        let successMessage = "[SUCCESS] Page scrolled to the right";
        let failedMessage  = "[FAIL] Failed to scroll the page to the right";

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
        let successMessage = "[SUCCESS] Page scrolled to the left";
        let failedMessage  = "[FAIL] Failed to scroll the page to the left";

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
        let successMessage = "[SUCCESS] Page scrolled down";
        let failedMessage  = "[FAIL] Failed to scroll the page down";

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
        let successMessage = "[SUCCESS] Page scrolled up";
        let failedMessage  = "[FAIL] Failed to scroll the page up";

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
