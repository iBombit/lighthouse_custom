// Browsers
const MobileBrowser = require('./mobileBrowser');
const DesktopBrowser = require('./desktopBrowser');
const startMobileBrowserWithLighthouse = new MobileBrowser().startMobileBrowserWithLighthouse;
const startDesktopBrowserWithLighthouse = new DesktopBrowser().startDesktopBrowserWithLighthouse;

// exec will allow us to execute basic sh commands
const {promisify} = require('util');
const exec = promisify(require('child_process').exec);

class BrowserActions {
    /**
     * Launch browser and set vars depending on passed configString, browserType
     * @configString  desktop or mobile
     * @browserType   headless (docker) or headful (node.js)
     * @flow          lighthouse flow object (used for measurements and report)
     * @return        browser, page, newFlow
     */
    async startBrowserWithLighthouse(configString, browserType, flow) {
        let browser = ''; let page = ''; let newFlow = '';
        switch (configString) {
            case "mobile": {
                [browser, page, newFlow] = await startMobileBrowserWithLighthouse(configString, browserType, flow);
                break;
            }
            case "desktop": {
                [browser, page, newFlow] = await startDesktopBrowserWithLighthouse(configString, browserType, flow);
                break;
            }
            default: {
                throw new Error('configString is not correct! Needs to be mobile or desktop, received: ' + configString);
            }
        }
        // extra property to track failed actions
        // any fail working with selectors or keyboard sets this to false
        page.isSuccess = true;
        return [browser, page, newFlow];
    }

    /**
     * Restart browser and append new page to current flow object
     * @browser      current browser instance
     * @page         current page in browser
     * @flow         lighthouse flow object (used for measurements and report)
     * @configString desktop or mobile
     * @browserType  headless (docker) or headful (node.js)
     * @return       browser, page
     */
    async restartBrowser(browser, page, flow, configString, browserType) {
        console.log('KILLING BROWSER');
        await page.close();
        await browser.close();
        try {
            // ensure that your system/docker has these commands installed
            await exec("kill -9 $(ps -ef | grep chrome | awk '{print $2}')");
        } catch (error) {
            console.log("BROWSER KILLED (error was from not existent PID, but we catch it)");
        }
        return new BrowserActions().startBrowserWithLighthouse(configString, browserType, flow)
    }

    /**
     * Just closing browser
     */
    async closeBrowser(browser) {
        console.log('CLOSING BROWSER');
        await browser.close();
    }
}

module.exports = BrowserActions;
