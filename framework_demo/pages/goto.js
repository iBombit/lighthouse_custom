// Actions
const HtmlWaiter = require('../actions/htmlWaiter');
var waitTillHTMLRendered = new HtmlWaiter().waitTillHTMLRendered;

class GoToPage {
    async link(link, page) {
        console.log('Opening Link: ' + link);
        await page.goto(link);
        await page.waitForTimeout(10000);
        await waitTillHTMLRendered(page); // loosing page context on multiple redirects, so wait 10sec before that...
    }
}

module.exports = GoToPage;
