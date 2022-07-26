// Actions
const HtmlWaiter = require('../actions/htmlWaiter');
var waitTillHTMLRendered = new HtmlWaiter().waitTillHTMLRendered;

class ColdNavigations {
    async openPage(page, flow, link, name) {
      console.log('Started: ' + name);
        await flow.navigate(link, {stepName: name});
      console.log('Ended: ' + name);

      await waitTillHTMLRendered(page);
    }
}

module.exports = ColdNavigations;
