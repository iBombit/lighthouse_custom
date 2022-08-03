class HtmlWaiter {
    /**
     * Wait till the size of the page is not changing over time
     * @page    current page in browser
     * @timeout time to wait for the page to load (default: 30sec)
    */
    async waitTillHTMLRendered (page, timeout = 30000) {
        const checkDurationMsecs = 1000;
        const maxChecks = timeout / checkDurationMsecs;
        let lastHTMLSize = 0;
        let checkCounts = 1;
        let countStableSizeIterations = 0;
        const minStableSizeIterations = 3;

        while(checkCounts++ <= maxChecks){
        let html = await page.content();
        let currentHTMLSize = html.length;

        //let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
        //console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

        if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
            countStableSizeIterations++;
        else
            countStableSizeIterations = 0; //reset the counter

        if(countStableSizeIterations >= minStableSizeIterations) {
            console.log("Fully Rendered Page: " + page.url());
            break;
        }

        lastHTMLSize = currentHTMLSize;
        await page.waitForTimeout(checkDurationMsecs);
        }
    }
}

module.exports = HtmlWaiter;
