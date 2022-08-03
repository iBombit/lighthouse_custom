const lighthouse = require('lighthouse/lighthouse-core/fraggle-rock/api.js');

// settings
const LightHouse = require('../settings/lightHouse');
const configDesktop = new LightHouse().configDesktop;
const configMobile = new LightHouse().configMobile;

class LighthouseFlow {
    /**
     * Create new LH flow object. Should be executed only once during first lauch
     * @page         new page in browser
     * @configString desktop or mobile
     */
    async startNewLighthouseFlow(page, configString) {
        switch (configString) {
            case "mobile": {
                return lighthouse.startFlow(page, configMobile);
            }
            case "desktop": {
                return lighthouse.startFlow(page, configDesktop);
            }
            default: {
                throw new Error('configString is not correct! Needs to be mobile or desktop, received: ' + configString);
            }
        }
    }

    /**
     * Preserve LH flow report and config, set new page after restart
     * @flow   lighthouse flow object (used for measurements and report)
     * @page   new page in browser
     */
    async updateLighthouseFlow(page, flow) {
        flow.options.page = page;
    }
}

module.exports = LighthouseFlow;
