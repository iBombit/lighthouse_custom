const logger = require("../logger/logger");
const Page = require("../core/page")
const Button = require("../core/elements/button")
const Element = require("../core/elements/element")
const Iframe = require("../core/elements/iframe")

class PowerApps extends Page {
    constructor(page) {
        super(page);
        this.url = "https://apps.powerapps.com/play/e/default-b41b72d0-4e9f-4c26-8a69-f949f367c91d/a/4f3abb6f-5e6a-4e4a-b3b2-09123d78a5f7?tenantId=b41b72d0-4e9f-4c26-8a69-f949f367c91d&source=portal/"
    }

    init(page){
        super.init(page);
        this.appFrame = new Iframe("iframe[id='fullscreen-app-host']", page);
        this.marketing = new Button("(//*[@data-control-name='Button3'])[1]", page);
        this.marketingHeader = new Element("[data-control-name='TextBox1_13']", page);
        this.teamsIcon = new Button("#AddToTeamsButton_container", page);
    }

}

module.exports = PowerApps;