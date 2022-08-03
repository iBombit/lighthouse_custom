const puppeteer = require('puppeteer');

// settings
const Browser = require('../settings/browser');
const headlessMobile = new Browser().headlessMobile;
const headfulMobile = new Browser().headfulMobile;

const LighthouseFlow = require('./lighthouseFlow');
const updateLighthouseFlow = new LighthouseFlow().updateLighthouseFlow;
const startNewLighthouseFlow = new LighthouseFlow().startNewLighthouseFlow;

class MobileBrowser {
    /**
     * Launch mobile browser and create new LH flow or append to existing
     * @browserType   headless (docker) or headful (node.js)
     * @flow          lighthouse flow object (used for measurements and report)
     * @return        browser, page, newFlow
     */
    async startMobileBrowserWithLighthouse(configString, browserType, flow) {
        const browser = await new MobileBrowser().startMobileBrowser(browserType);
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
     * Launch mobile browser
     * @browserType   headless (docker) or headful (node.js)
     * @return        browser
     */
    async startMobileBrowser(browserType) {
        switch (browserType) {
            case "headless": {
                return puppeteer.launch(headlessMobile);
            }
            case "headful": {
                return puppeteer.launch(headfulMobile);
            }
            default: {
                throw new Error('browserType is not correct! Needs to be headless or headful, received: ' + browserType);
            }
        }
    }
}

module.exports = MobileBrowser;
