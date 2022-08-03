// Selectors
const Selectors = require('../selectors/selectors');
const currencyExchangeSelectors = new Selectors();

// Actions
const FindAndClick = require('../actions/findAndClick');
const Find = require('../actions/find');
const HtmlWaiter = require('../actions/htmlWaiter');
const findAndClickCSS = new FindAndClick().CSS;
const findAndClickXpath = new FindAndClick().XPATH;
const findCSS = new Find().CSS;
const waitTillHTMLRendered = new HtmlWaiter().waitTillHTMLRendered;

class CurrencyExchange {
    async selectCurrencyExchange(page, flow) {
        console.log('Started: Select Currency Exchange');
        if (page.isSuccess) {
            await flow.startTimespan({stepName: 'Select Currency Exchange'});
            await findAndClickCSS(currencyExchangeSelectors.currExc, page);
            await findCSS(currencyExchangeSelectors.ymapsPoints, page);
            await waitTillHTMLRendered(page);
            await flow.endTimespan();
        }
        console.log('Ended: Select Currency Exchange');
    }

    async zoomIn(page, flow) {
        console.log('Started: Zoom In');
        await findAndClickCSS(currencyExchangeSelectors.scale, page);
        if (page.isSuccess) {
            await flow.startTimespan({stepName: 'Zoom In'});
            await findAndClickXpath(currencyExchangeSelectors.zoomIn, page);
            await waitTillHTMLRendered(page);
            await flow.endTimespan();
        }
        console.log('Ended: Zoom In');
    }
}

module.exports = CurrencyExchange;
