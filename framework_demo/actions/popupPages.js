class PopupPages {
    /**
     * Get new page popup
     * @browser current browser instance
     */
    async getNewPageWhenLoaded(browser) {
        return new Promise(x =>
            browser.on('targetcreated', async target => {
                if (target.type() === 'page') {
                    const newPage = await target.page();
                    const newPagePromise = new Promise(y =>
                        newPage.once('domcontentloaded', () => y(newPage))
                    );
                    const isPageLoaded = await newPage.evaluate(
                        () => document.readyState
                    );
                    newPage.isSuccess = true;
                    newPagePromise.isSuccess = true;
                    return isPageLoaded.match('complete|interactive') ?
                        x(newPage) :
                        x(newPagePromise);
                }
            })
        );
    };

}


module.exports = PopupPages;
