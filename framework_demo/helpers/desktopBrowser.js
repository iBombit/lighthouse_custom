const puppeteer = require('puppeteer');

// settings
const Browser = require('../settings/browser');
const headlessDesktop = new Browser().headlessDesktop;
const headfulDesktop = new Browser().headfulDesktop;

const LighthouseFlow = require('./lighthouseFlow');
const updateLighthouseFlow = new LighthouseFlow().updateLighthouseFlow;
const startNewLighthouseFlow = new LighthouseFlow().startNewLighthouseFlow;

class DesktopBrowser {
    /**
     * Launch desktop browser and create new LH flow or append to existing
     * @browserType   headless (docker) or headful (node.js)
     * @flow          lighthouse flow object (used for measurements and report)
     * @return        browser, page, newFlow
     */
    async startDesktopBrowserWithLighthouse(configString, browserType, flow) {
        const browser = await new DesktopBrowser().startDesktopBrowser(browserType);
        const page = await browser.newPage();
        if (typeof flow === "undefined") {
            const newFlow = await startNewLighthouseFlow(page, configString);
            return [browser, page, newFlow];
        } else {
            await updateLighthouseFlow(page, flow);
            return [browser, page];
        }
    }

    /**
     * Launch desktop browser
     * @browserType   headless (docker) or headful (node.js)
     * @return        browser
     */
    async startDesktopBrowser(browserType) {
        switch (browserType) {
            case "headless": {
                return puppeteer.launch(headlessDesktop);
            }
            case "headful": {
                return puppeteer.launch(headfulDesktop);
            }
            default: {
                throw new Error('browserType is not correct! Needs to be headless or headful, received: ' + browserType);
            }
        }
    }
}

module.exports = DesktopBrowser;
