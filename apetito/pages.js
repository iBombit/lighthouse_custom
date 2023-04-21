const Page = require("../core/page");
const Button = require("../core/elements/button");
const Element = require("../core/elements/element")


class MainPage extends Page {
    init(page) {
        super.init(page)
        this.url = 'https://www.apetito-shop.de/'
        this.firstProduct = new Button('#po-wrapper li:nth-child(1)', page)
        this.thirdProduct = new Button('#po-wrapper li:nth-child(3)', page)
        this.cartButton = new Button('a[data-header-action="cart"]', page)
        this.acceptCookies = new Button('document.querySelector("#usercentrics-root").shadowRoot.querySelector("#focus-lock-id > div.sc-kDvujY.doxxAF > div > div.sc-cCjUiG.gHlwwJ > div > div > div.sc-lllmON.fjvxqY > div > button.sc-eDvSVe.jveqpQ")', page)
        this.menus = new Button("a[href='/winvitalis-menuevielfalt']", page)
        this.fullMenus = new Button("a[href='/winvitalis-menuevielfalt/alle-menues']", page)
    }
}

class FullMenuList extends Page {
    init(page) {
        super.init(page)
        this.secondAvailableProductEl = new Element("button[name='addProductButton']:not(:disabled)", page)
    }

    async secondAvailableProduct() {
        return await this.secondAvailableProductEl.findFromList(0, 1)
    }
}

class ProductPage extends Page {
    init(page) {
        super.init(page)
        this.zubereitung = new Button('a[href="#tab3"]', page)
        this.addProduct = new Button("button[name='addProductButton']", page)
        this.fistProductAdded = new Element("sup", page)
        this.secondProductAdded = new Element("sup", page)
        this.mainPageLink = new Button('a.header__logo', page)
    }
}


module.exports = {
    MainPage: MainPage,
    ProductPage: ProductPage,
    FullMenuList: FullMenuList
};