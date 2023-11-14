import Page from "../../core/page.js";
import Button from "../../core/elements/button.js";

export default class HomePage extends Page {
    constructor(page) {
        super(page)
        this.url = "https://demoqa.com/"
    }

    init(page){
        super.init(page)
        this.elements = new Button('//h5[text()="Elements"]', page)
        this.forms = new Button('//h5[text()="Forms"]', page)
        this.alertsFrameWindows = new Button('//h5[text()="Alerts, Frame & Windows"]', page)
        this.widgets = new Button('//h5[text()="Widgets"]', page)
        this.interactions = new Button('//h5[text()="Interactions"]', page)
        this.bookStoreApplication = new Button('//h5[text()="Book Store Application"]', page)
    }

}